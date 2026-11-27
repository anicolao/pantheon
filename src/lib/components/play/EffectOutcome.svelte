<script lang="ts">
  import type {SetupState} from '$lib/game/setup';
  import {latestMoveIndex} from '$lib/game/public-table';
  let {game,settled}:{game:SetupState;settled:boolean}=$props();
  const sequence=$derived(game.activity[latestMoveIndex(game)]?.sequence);
  const notices=$derived(game.publicActivity.find(entry=>entry.sequence===sequence)?.steps.filter(step=>step.notice)??[]);
</script>
{#if settled && !game.turn.choice && notices.length}
  <aside class="effect-outcome" role="status" aria-live="polite">
    {#each notices as notice}<p><strong>{notice.effect}</strong><span>{notice.notice}</span></p>{/each}
  </aside>
{/if}
<style>
.effect-outcome{position:absolute;left:var(--center-left,0);width:var(--center-width,100%);top:var(--play-top,0);z-index:46;display:flex;justify-content:center;pointer-events:none;color:#ffe9bb;padding:8px;box-sizing:border-box}
p{margin:0;padding:12px 18px;max-width:520px;background:#071321f5;border:1px solid #bca16899;border-radius:10px;text-align:center;box-shadow:0 5px 15px #0007}
strong{display:block;font-size:18px;margin-bottom:6px;color:#e5c787}span{display:block;font-size:16px;line-height:1.4}
@media(max-aspect-ratio:3/4){p{padding:8px 10px}strong{font-size:16px}span{font-size:14px}}
</style>
