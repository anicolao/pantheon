export interface CardFitIssue {
  region: string;
  problem: string;
}

/** Inspect painted content, including nested icons and individual wrapped text lines. */
export function measureCardFit(card: HTMLElement): CardFitIssue[] {
  // Axis-aligned bounds of rotated text can intersect without glyph overlap.
  // Measure an unrotated, invisible copy without disturbing live rasterization.
  let transformed = false;
  for (let element = card.parentElement; element; element = element.parentElement) {
    if (getComputedStyle(element).transform !== 'none') { transformed = true; break; }
  }
  if (!transformed) return measureUnrotatedCardFit(card);
  const copy = card.cloneNode(true) as HTMLElement;
  const holder = document.createElement('div');
  const style = getComputedStyle(card);
  holder.style.cssText = 'position:fixed;left:0;top:0;opacity:0;pointer-events:none;z-index:-1;';
  holder.setAttribute('aria-hidden', 'true');
  holder.inert = true;
  holder.style.font = style.font;
  copy.style.width = style.width;
  holder.append(copy);
  document.body.append(holder);
  try { return measureUnrotatedCardFit(copy); }
  finally { holder.remove(); }
}

function measureUnrotatedCardFit(card: HTMLElement): CardFitIssue[] {
  const issues: CardFitIssue[] = [];
  const tolerance = 1;
  const outside = (inner: DOMRect, outer: DOMRect) => inner.left < outer.left - tolerance ||
    inner.right > outer.right + tolerance || inner.top < outer.top - tolerance || inner.bottom > outer.bottom + tolerance;
  const overlaps = (a: DOMRect, b: DOMRect) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > tolerance &&
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > tolerance;
  const visible = (element: Element) => !element.closest('.sr-only, [hidden]') &&
    getComputedStyle(element).visibility !== 'hidden' && getComputedStyle(element).display !== 'none';
  const cardBounds = card.getBoundingClientRect();
  const painted: { region: string; rect: DOMRect; owner: Element }[] = [];
  const add = (region: string, problem: string) => {
    if (!issues.some(issue => issue.region === region && issue.problem === problem)) issues.push({ region, problem });
  };

  for (const panel of card.querySelectorAll<HTMLElement>('[data-fit]')) {
    const region = panel.dataset.fit!;
    const bounds = panel.getBoundingClientRect();
    if (!bounds.width || !bounds.height || !visible(panel)) continue;
    if (outside(bounds, cardBounds)) add(region, 'panel outside card');
    for (const child of panel.querySelectorAll<HTMLElement>('*')) {
      if (!visible(child) || getComputedStyle(child).display === 'inline') continue;
      for (const rect of child.getClientRects()) {
        if (rect.width && rect.height && outside(rect, bounds)) add(region, 'content outside panel');
      }
    }
    for (const icon of panel.querySelectorAll('.resource-icon')) {
      if (visible(icon)) painted.push({ region, rect: icon.getBoundingClientRect(), owner: icon });
    }
    const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const text = walker.currentNode;
      const parent = text.parentElement!;
      if (!text.textContent?.trim() || !visible(parent)) continue;
      const range = document.createRange();
      range.selectNodeContents(text);
      for (const rect of range.getClientRects()) {
        if (!rect.width || !rect.height) continue;
        if (outside(rect, bounds)) add(region, 'text outside panel');
        const icon = parent.closest('.resource-icon');
        if (icon) {
          if (outside(rect, icon.getBoundingClientRect())) add(region, 'number outside icon');
        } else painted.push({ region, rect, owner: parent });
      }
    }
  }
  for (let i = 0; i < painted.length; i++) {
    for (let j = i + 1; j < painted.length; j++) {
      const a = painted[i], b = painted[j];
      if (a.owner === b.owner || a.owner.contains(b.owner) || b.owner.contains(a.owner)) continue;
      if (overlaps(a.rect, b.rect)) add(a.region, `overlaps ${b.region}`);
    }
  }
  return issues;
}

/** Recheck after sizing, content, image, or font changes; never clip or hide an error. */
export function auditCardFit(card: HTMLElement) {
  let frame = 0;
  let destroyed = false;
  function measure() {
    frame = 0;
    if (!card.getBoundingClientRect().width) return;
    const issues = measureCardFit(card);
    const state = issues.length ? 'overflow' : 'fit';
    const details = JSON.stringify(issues);
    if (card.dataset.layoutState !== state) card.dataset.layoutState = state;
    if (card.dataset.layoutIssues !== details) card.dataset.layoutIssues = details;
  }
  function schedule() { if (!destroyed && !frame) frame = requestAnimationFrame(measure); }
  card.dataset.layoutState = 'pending';
  const resize = new ResizeObserver(schedule);
  resize.observe(card);
  const mutation = new MutationObserver(schedule);
  mutation.observe(card, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['style', 'class', 'data-value'] });
  card.addEventListener('load', schedule, true);
  document.fonts.addEventListener('loadingdone', schedule);
  void document.fonts.ready.then(schedule);
  schedule();
  return {
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      resize.disconnect(); mutation.disconnect();
      card.removeEventListener('load', schedule, true);
      document.fonts.removeEventListener('loadingdone', schedule);
    }
  };
}
