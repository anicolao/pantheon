import { tick } from 'svelte';
import type { Action } from 'svelte/action';

/** The compact log shows complete recent entries. Chronicle retains the full history. */
export const recentLog: Action<HTMLElement, number> = (node) => {
  let alive = true;
  function fit() {
    if (!alive) return;
    const entries = [...node.children] as HTMLElement[];
    // Measure at the current width, including entries omitted at a smaller size.
    for (const entry of entries) entry.hidden = false;
    let used = 0, full = false;
    const heights = entries.map(entry => entry.getBoundingClientRect().height);
    entries.forEach((entry, index) => {
      used += heights[index];
      full ||= used > node.clientHeight;
      entry.hidden = full;
    });
  }
  const observer = new ResizeObserver(fit);
  observer.observe(node);
  void document.fonts.ready.then(fit);
  return { update: () => { void tick().then(fit); }, destroy: () => { alive = false; observer.disconnect(); } };
};
