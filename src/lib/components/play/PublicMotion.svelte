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
  let flights = $state<PublicStep[]>([]);
  let actor = $state('');
  let sequence = $state(0);
  const nodes = new Map<string, HTMLDivElement>();
  function flightNode(node: HTMLDivElement, id: string) { nodes.set(id,node); return {destroy:()=>{nodes.delete(id);}}; }
  let queue: PublicActivity[] = [];
  let running = false, generation = 0;
  let animations: Animation[] = [];
  function cancelFlights() { for (const animation of animations) animation.cancel(); animations=[]; }
  const zones = { hand:'Hand', deck:'Deck', play:'In play', discard:'Discard', supply:'Supply', trash:'Shared trash', reveal:'Revealed', altar:'Altar', leader:'Leader' };
  onMount(() => {
    const update = () => { foreground = document.visibilityState === 'visible'; };
    update(); document.addEventListener('visibilitychange', update);
    return () => { document.removeEventListener('visibilitychange', update); generation++; queue=[]; cancelFlights(); };
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
        actor = entry.actor.name; sequence = entry.sequence;
        for (let index=0; index<entry.steps.length;) {
          if (token !== generation) break;
          const batch = [entry.steps[index++]];
          // Cards from one operation travel together with a readable stagger.
          // Reveals and source effects retain their place in the causal sequence.
          if (['play','draw','cleanup'].includes(batch[0].kind)) {
            while (index<entry.steps.length && entry.steps[index].kind===batch[0].kind) batch.push(entry.steps[index++]);
          }
          flushSync(() => { flights = batch; });
          animations = batch.map((movement, offset) => {
            const node = nodes.get(movement.id)!;
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
            return node.animate(frames,{duration:movement.kind === 'reveal' ? 680 : 450,delay:Math.min(offset*70,280),easing:'ease-in-out'});
          });
          await Promise.all(animations.map(animation=>animation.finished.catch(()=>undefined)));
          animations=[];
        }
      }
    } finally { running=false; flights=[]; if(queue.length)void drain(); }
  }
  $effect(() => {
    const canShow = visible && foreground && !reduced && status === 'synced';
    const fresh = cursor.take(game.publicActivity,status === 'synced',canShow);
    untrack(() => {
      if (!canShow) { generation++; queue=[]; cancelFlights(); flights=[]; }
      else { queue.push(...fresh); void drain(); }
    });
  });
</script>

{#each flights as step (step.id)}
  <div use:flightNode={step.id} class="public-flight" data-motion-sequence={sequence} data-motion-step={step.id} data-motion-kind={step.kind} aria-hidden="true">
    <span>{actor}</span>
    {#if step.card}<CardFace card={definition(step.card.cardId)} players={game.playerCount} copy={step.card.copy}/>{:else if step.from.cardId && ['leader','worship'].includes(step.kind)}<CardFace card={definition(step.from.cardId)} players={game.playerCount}/>{:else}<CardBack format="deck"/>{/if}
    <span>{zones[step.from.zone]} → {zones[step.to.zone]}{step.count>1?` · ${step.count}`:''}</span>
  </div>
{/each}

<style>
  .public-flight{position:fixed;left:0;top:0;z-index:20;width:clamp(65px,9vw,240px);pointer-events:none;opacity:0;filter:drop-shadow(0 0 12px #ffd781);}.public-flight span{display:block;background:#071321ed;color:#ffe7b0;text-align:center;font-size:clamp(12px,1.5svh,30px);padding:4px;border-radius:6px;}
</style>
