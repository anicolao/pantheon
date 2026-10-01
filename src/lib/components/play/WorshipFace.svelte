<script lang="ts">
  import { untrack } from 'svelte';
  import type { SetupState } from '$lib/game/setup';
  import { activePlayer, definition, devotionCards, worshipReason } from '$lib/game/actions';
  import CardFace from '../CardFace.svelte';
  import { motionDuration } from './motion';

  let { game, uid, cardId }: { game: SetupState; uid: string; cardId: string } = $props();
  const actor = $derived(activePlayer(game));
  const favored = $derived(devotionCards(game, actor, cardId).length >= 2);
  const playable = $derived(favored && !worshipReason(game, uid, cardId));
  let previous = untrack(() => ({ actor, cardId, favored }));
  let glint = $state(0);
  $effect(() => {
    // Opening an already favored card or switching players is not a new favor event.
    if (previous.actor === actor && previous.cardId === cardId && favored && !previous.favored) untrack(() => glint++);
    previous = { actor, cardId, favored };
  });
</script>

<span class="worship-face" class:playable data-favored={favored} data-favored-playable={playable}>
  <CardFace card={definition(cardId)} players={game.playerCount} />
  {#key glint}
    {#if glint}<span class="glint-clip" aria-hidden="true"><span class="glint" style:animation-duration={`${motionDuration(550)}ms`}></span></span>{/if}
  {/key}
</span>

<style>
  .worship-face{display:block;position:relative;border-radius:5%;}
  .playable{box-shadow:0 0 8px 3px #ffdf87,0 0 24px 7px #f2ad4999;}
  .glint-clip{position:absolute;inset:0;overflow:hidden;border-radius:5%;pointer-events:none;}
  .glint{position:absolute;inset:-50%;background:linear-gradient(110deg,transparent 38%,#fff3ba55 45%,#fffbeee6 50%,#fff3ba55 55%,transparent 62%);animation:glint ease-out both;}
  @keyframes glint{from{transform:translateX(-75%);opacity:0;}20%{opacity:1;}80%{opacity:1;}to{transform:translateX(75%);opacity:0;}}
  @media(prefers-reduced-motion:reduce){.glint{animation-name:soft-glint;}}
  @keyframes soft-glint{from,to{opacity:0;}50%{opacity:.45;}}
</style>
