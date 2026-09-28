import type { Action } from 'svelte/action';

/** A normal activation plays; a deliberate secondary gesture opens inspection. */
export const cardGesture: Action<HTMLButtonElement, { activate: () => void; inspect: () => void }> = (node, callbacks) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pointer: { id: number; x: number; y: number } | undefined;
  let suppressClick = false;
  const clear = () => { clearTimeout(timer); timer = undefined; };
  const inspect = () => { clear(); suppressClick = true; node.focus(); callbacks.inspect(); };
  const down = (event: PointerEvent) => {
    clear(); suppressClick = false;
    if (event.button !== 0 || !event.isPrimary) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    timer = setTimeout(inspect, 550);
  };
  const move = (event: PointerEvent) => {
    if (pointer?.id === event.pointerId && Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)>10) { clear(); suppressClick = true; }
  };
  const up = () => { clear(); pointer = undefined; };
  const cancel = () => { up(); suppressClick = true; };
  const leave = () => { if (pointer) cancel(); };
  const context = (event: MouseEvent) => { event.preventDefault(); if (!suppressClick) inspect(); };
  const key = (event: KeyboardEvent) => {
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) { event.preventDefault(); inspect(); }
    else if (event.key === 'Enter' || event.key === ' ') suppressClick = false;
  };
  const click = (event: MouseEvent) => { event.preventDefault(); if (!suppressClick) callbacks.activate(); };
  node.addEventListener('pointerdown',down);
  node.addEventListener('pointermove',move);
  node.addEventListener('pointerup',up);
  node.addEventListener('pointercancel',cancel);
  node.addEventListener('pointerleave',leave);
  node.addEventListener('contextmenu',context);
  node.addEventListener('keydown',key);
  node.addEventListener('click',click);
  return { update: value => { callbacks = value; }, destroy: () => {
    clear(); node.removeEventListener('pointerdown',down); node.removeEventListener('pointermove',move);
    node.removeEventListener('pointerup',up); node.removeEventListener('pointercancel',cancel);
    node.removeEventListener('pointerleave',leave); node.removeEventListener('contextmenu',context);
    node.removeEventListener('keydown',key); node.removeEventListener('click',click);
  } };
};
