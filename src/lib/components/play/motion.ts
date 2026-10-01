/** Slow motion for the current design preview. All timings are milliseconds. */
export const MOTION_FACTOR = 2.5;
export const motionDuration = (milliseconds: number) => milliseconds * MOTION_FACTOR;
export const MOTION_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
