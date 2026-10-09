import type { PublicActivity, PublicStep } from '$lib/game/public-table';

/** Approved preview timings, accelerated 1.5×. Explicit victory timings are separate. */
export const MOTION_SPEED = 1.5;
export const MOTION_FACTOR = 2.5 / MOTION_SPEED;
export const motionDuration = (milliseconds: number) => milliseconds * MOTION_FACTOR;
export const MOTION_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
// Card transfers must visibly arrive when their completion releases the next
// animation. A long ease-out tail otherwise reads as a pause at the destination.
export const FLIGHT_EASING = 'cubic-bezier(0.25, 0.25, 0.9, 1)';

const CARD_TO_TABLE_SPEED = 2;

/** One timing policy for Action/Treasure plays and purchases into the play area. */
export function cardFlightTiming(step: Pick<PublicStep, 'kind' | 'to'>, offset = 0) {
  const speed = (step.to.zone === 'play' || (step.kind === 'gain' && step.to.zone === 'reveal')) ? CARD_TO_TABLE_SPEED : 1;
  return {
    duration: motionDuration(step.kind === 'reveal' ? 680 : 450) / speed,
    delay: motionDuration(Math.min(offset * 70, 280)) / speed,
    minimumRedirectDuration: motionDuration(100) / speed
  };
}

/** Reveal, open one slot, then land; each stage completes before the next starts. */
export const DRAW_MOTION = {
  reveal: motionDuration(240),
  space: motionDuration(140),
  travel: motionDuration(300)
};

/** Cleanup prepares the outgoing player's next hand without slowing the next turn. */
export const CLEANUP_DRAW_MOTION = {
  reveal: DRAW_MOTION.reveal / 2,
  space: DRAW_MOTION.space / 2,
  travel: DRAW_MOTION.travel / 2
};

/** The projection already contains the result; don't print future pile totals in flight. */
export function pileIsMoving(activity: readonly PublicActivity[], settled: number, uid: string, zone: 'deck' | 'discard') {
  return activity.some(entry => entry.sequence > settled && entry.steps.some(step =>
    [step.from, step.to].some(anchor => anchor.uid === uid && anchor.zone === zone)));
}

/** Brief readable stop when a table reveal continues to another pile. */
export const TABLE_PAUSE = motionDuration(160);
