import type { Page } from '@playwright/test';

export interface DrawFrame {
  hand: number;
  cards: { step: string; phase: string; inHand: boolean; stack: string; slotStack: string | null }[];
}
type DrawWindow = Window & { drawObservation: { frames: DrawFrame[]; completed: string[]; stop: () => void } };

/** Record coherent DOM states in the browser, without racing several protocol
 * round trips against an overlapping reveal. This only observes presentation. */
export async function observeDraws(page: Page, handSelector = '.hand') {
  await page.evaluate(handSelector => {
    const frames: DrawFrame[] = [], completed: string[] = [];
    let previous: string[] = [], signature = '';
    const sample = () => {
      const hand = document.querySelector(handSelector);
      const cards = [...document.querySelectorAll<HTMLElement>('[data-motion-kind="draw"]')].map(node => {
        const slot = [...document.querySelectorAll<HTMLElement>('.hand-slot')].find(slot => slot.dataset.instanceId === node.dataset.motionCard);
        return { step: node.dataset.motionStep!, phase: node.dataset.drawPhase!, inHand: node.parentElement === hand,
          stack: getComputedStyle(node).zIndex, slotStack: slot ? getComputedStyle(slot).zIndex : null };
      });
      for (const step of previous) if (!cards.some(card => card.step === step)) completed.push(step);
      previous = cards.map(card => card.step);
      const frame = { hand: Number(hand?.getAttribute('data-hand-total')), cards };
      const next = JSON.stringify(frame);
      if (signature !== next) { frames.push(frame); signature = next; }
    };
    const observer = new MutationObserver(sample);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-draw-phase', 'data-hand-total', 'style'] });
    (window as unknown as DrawWindow).drawObservation = { frames, completed, stop: () => observer.disconnect() };
    sample();
  },handSelector);
}
export async function waitForDraws(page: Page, count: number) {
  await page.waitForFunction(count => (window as unknown as DrawWindow).drawObservation.completed.length >= count, count, { polling: 'raf', timeout: 2000 });
}
export async function drawFrames(page: Page) {
  return page.evaluate(() => {
    const observation = (window as unknown as DrawWindow).drawObservation;
    observation.stop();
    return observation.frames;
  });
}
