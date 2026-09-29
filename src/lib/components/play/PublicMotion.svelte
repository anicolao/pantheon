<script lang="ts">
  import { onMount, tick, untrack, flushSync } from 'svelte';
  import type { SetupState } from '$lib/game/setup';
  import { definition } from '$lib/game/actions';
  import { PublicMotionCursor, type PublicActivity, type PublicAnchor, type PublicStep } from '$lib/game/public-table';
  import CardFace from '../CardFace.svelte';
  import CardBack from '../CardBack.svelte';

  let { game, status, reduced, visible }: { game: SetupState; status: string; reduced: boolean; visible: boolean } = $props();
  const cursor = new PublicMotionCursor(untrack(() => game.activity.length));
  let foreground = $state(true);
  let step = $state<PublicStep | null>(null);
  let actor = $state('');
  let sequence = $state(0);
  let node = $state<HTMLDivElement>();
  let queue: PublicActivity[] = [];
  let running = false, generation = 0;
  let animation: Animation | undefined;
  const zones = { hand:'Hand', deck:'Deck', play:'In play', discard:'Discard', supply:'Supply', trash:'Shared trash', reveal:'Revealed', altar:'Altar', leader:'Leader' };
  onMount(() => {
    const update = () => { foreground = document.visibilityState === 'visible'; };
    update(); document.addEventListener('visibilitychange', update);
    return () => { document.removeEventListener('visibilitychange', update); generation++; queue=[]; animation?.cancel(); };
  });
  function anchor(value: PublicAnchor) {
    const elements = [...document.querySelectorAll<HTMLElement>('[data-public-zone]')];
    const match = (element: HTMLElement) => (!value.uid || element.dataset.publicUid === value.uid) && (!value.cardId || !element.dataset.publicCard || element.dataset.publicCard === value.cardId);
    const exact = elements.find(element => element.dataset.publicZone === value.zone && match(element));
    // The common play/reveal area stays at the same place across a turn handoff.
    const common = ['play','reveal'].includes(value.zone) ? elements.find(element => element.dataset.publicZone === 'play') : undefined;
    const fallback = common ?? elements.find(element => element.dataset.publicZone === 'seat' && element.dataset.publicUid === value.uid)
      ?? elements.find(element => element.dataset.publicZone === 'supply')!;
    const box = (exact ?? fallback).getBoundingClientRect();
    return { x: Math.max(55,Math.min(innerWidth-55,box.left+box.width/2)), y: Math.max(85,Math.min(innerHeight-85,box.top+box.height/2)) };
  }
  async function drain() {
    if (running) return;
    running = true;
    const token = generation;
    try {
      await tick();
      while (queue.length && token === generation) {
        const entry = queue.shift()!;
        // Keep ordinary multi-card sequences brisk, including a full hand of Treasures.
        const duration = Math.min(240, 800 / Math.max(1,entry.steps.length));
        actor = entry.actor.name; sequence = entry.sequence;
        for (const movement of entry.steps) {
          if (token !== generation) break;
          // Keep successive flights contiguous: the next face and its animation
          // are installed together before observers see a settled frame.
          flushSync(() => { step = movement; });
          if (!node || token !== generation) break;
          const from = anchor(movement.from), to = anchor(movement.to);
          if (movement.kind === 'leader' || movement.kind === 'worship') {
            const source = [...document.querySelectorAll<HTMLElement>('[data-public-zone]')].find(element =>
              movement.kind === 'worship' ? element.dataset.publicZone === 'altar' && element.dataset.publicCard === movement.from.cardId :
                ['leader','seat'].includes(element.dataset.publicZone!) && element.dataset.publicUid === movement.from.uid);
            source?.animate([{filter:'drop-shadow(0 0 22px #ffdc83)'},{filter:'none'}],{duration:240,easing:'ease-out'});
          }
          const frames = [
            {transform:`translate(${from.x}px,${from.y}px) translate(-50%,-50%) scale(.8)`,opacity:0},
            {transform:`translate(${from.x}px,${from.y}px) translate(-50%,-50%) scale(1)`,opacity:1,offset:.15},
            {transform:`translate(${to.x}px,${to.y}px) translate(-50%,-50%) scale(1)`,opacity:1,offset:.85},
            {transform:`translate(${to.x}px,${to.y}px) translate(-50%,-50%) scale(.8)`,opacity:0}
          ];
          // A reveal reaches its public anchor, then holds its face before the
          // following discard/topdeck step explains the destination.
          if (movement.kind === 'reveal') {
            frames[1] = {...frames[2],offset:.25};
            frames[2].offset = .95;
          }
          animation = node.animate(frames,{duration:movement.kind === 'reveal' ? 680 : duration,easing:'ease-in-out'});
          await animation.finished.catch(()=>undefined);
        }
      }
    } finally { running=false; step=null; if(queue.length)void drain(); }
  }
  $effect(() => {
    const canShow = visible && foreground && !reduced && status === 'synced';
    const fresh = cursor.take(game.publicActivity,status === 'synced',canShow);
    untrack(() => {
      if (!canShow) { generation++; queue=[]; animation?.cancel(); step=null; }
      else { queue.push(...fresh); void drain(); }
    });
  });
</script>

{#if step}
  <div bind:this={node} class="public-flight" data-motion-sequence={sequence} data-motion-step={step.id} data-motion-kind={step.kind} aria-hidden="true">
    <span>{actor}</span>
    {#if step.card}<CardFace card={definition(step.card.cardId)} players={game.playerCount} copy={step.card.copy}/>{:else if step.from.cardId && ['leader','worship'].includes(step.kind)}<CardFace card={definition(step.from.cardId)} players={game.playerCount}/>{:else}<CardBack format="deck"/>{/if}
    <span>{zones[step.from.zone]} → {zones[step.to.zone]}{step.count>1?` · ${step.count}`:''}</span>
  </div>
{/if}

<style>
  .public-flight{position:fixed;left:0;top:0;z-index:20;width:clamp(65px,9vw,240px);pointer-events:none;opacity:0;filter:drop-shadow(0 0 12px #ffd781);}.public-flight span{display:block;background:#071321ed;color:#ffe7b0;text-align:center;font-size:clamp(12px,1.5svh,30px);padding:4px;border-radius:6px;}
</style>
