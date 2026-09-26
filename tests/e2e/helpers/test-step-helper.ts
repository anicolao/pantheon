import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export class TestStepHelper {
  private steps: string[] = [];
  constructor(private page: Page, private info: TestInfo, private title: string, private settledStatus = 'synced') {}
  async step(id: string, description: string, verifications: { spec: string; check: () => Promise<unknown> }[]) {
    await test.step(description, async () => {
      for (const verification of verifications) await test.step(verification.spec, verification.check);
      await expect(this.page.locator('[data-status]')).toHaveAttribute('data-status', this.settledStatus);
      await this.page.evaluate(async () => {
        // Flush reactive layout before checking fonts or newly scheduled Svelte transitions.
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        await document.fonts.ready;
        await Promise.all([...document.images].map(image => image.decode()));
        for (let pass = 0; pass < 20; pass++) {
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
          const animations = document.getAnimations().filter(animation => animation.playState !== 'finished');
          if (!animations.length) break;
          await Promise.all(animations.map(animation => animation.finished.catch(() => undefined)));
          if (pass === 19) throw new Error('Animations did not settle.');
        }
      });
      await this.page.mouse.move(0, 0);
      await this.page.evaluate(() => {
        const root = document.documentElement;
        if (root.scrollWidth > innerWidth || root.scrollHeight > innerHeight || scrollX || scrollY) throw new Error('Screen must fit the viewport without scrolling.');
        const visible = [...document.querySelectorAll<HTMLElement>('[data-e2e-layout] *')].filter(element => !element.closest('.sr-only') && element.checkVisibility() && element.getBoundingClientRect().width && element.getBoundingClientRect().height);
        for (const element of visible) {
          const rect = element.getBoundingClientRect();
          if (rect.left < 0 || rect.top < 0 || rect.right > innerWidth || rect.bottom > innerHeight) throw new Error(`${element.tagName} outside viewport`);
          if (element.scrollWidth > element.clientWidth && getComputedStyle(element).display !== 'inline') throw new Error(`${element.tagName}.${element.className} content overflows (${element.scrollWidth} > ${element.clientWidth})`);
        }
        const controls = visible.filter(element => element.matches('button,input,select,a'));
        for (let i = 0; i < controls.length; i++) for (let j = i + 1; j < controls.length; j++) {
          const a = controls[i].getBoundingClientRect(), b = controls[j].getBoundingClientRect();
          if (Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top)) throw new Error(`Controls overlap: ${controls[i].getAttribute("aria-label") ?? controls[i].textContent} / ${controls[j].getAttribute("aria-label") ?? controls[j].textContent}`);
        }
      });
      const filename = `${String(this.steps.length).padStart(3, '0')}-${id}-${this.info.project.name}-${process.platform}.png`;
      await expect(this.page).toHaveScreenshot(filename); // Global zero-pixel and zero-color thresholds; no overrides/masks.
      this.steps.push(`## ${description}\n\n![${description}](./screenshots/${filename})\n\n${verifications.map(item => `- [x] ${item.spec}`).join('\n')}`);
    });
  }
  generateDocs() {
    if (this.info.project.name === 'desktop' && process.platform === 'darwin') writeFileSync(join(dirname(this.info.file), 'README.md'), `# ${this.title}\n\n${this.steps.join('\n\n')}\n`);
  }
}
