<script lang="ts">
  import { onMount, tick, untrack, flushSync } from 'svelte';
  import type { SetupState, CardInstance } from '$lib/game/setup';
  import { definition } from '$lib/game/actions';
  import { PublicMotionCursor, type PublicActivity, type PublicAnchor, type PublicStep } from '$lib/game/public-table';
  import { motionDuration, MOTION_EASING } from './motion';
  import { measureLayout, type Pose, type Layout } from './motion-layout';
  import CardFace from '../CardFace.svelte';
  import CardBack from '../CardBack.svelte';

  let { game, status, reduced, visible, previousLayout }: { game: SetupState; status: string; reduced: boolean; visible: boolean; previousLayout: () => Layout } = $props();
  type Flight = { card?: CardInstance; id: string; step: PublicStep; from: Pose; to: Pose; width: number; stack: number; sequence: number };
  const cursor = new PublicMotionCursor(untrack(() => game.activity.length));
  let foreground = $state(true), flights = $state<Flight[]>([]);
  let before: Layout = { poses: [], width: 100 }, current: Layout = before;
  let revision = -1, running = false, generation = 0;
  let queue: Flight[][] = [];
  const nodes = new Map<string, HTMLDivElement>();
  const animations = new Set<Animation>();
  const layoutAnimations = new Set<Animation>();
  type ActiveFlight = { flight: Flight; node: HTMLDivElement; target: Pose; animation?: Animation; redirect?: { transform: string; duration: number } };
  const activeFlights = new Set<ActiveFlight>();
  const transform = (pose: Pose) => `translate(${pose.x}px,${pose.y}px) translate(-50%,-50%) rotate(${pose.angle}deg)`;
  const hidden = new Map<HTMLElement, { opacity: string; count: number }>();
  function flightNode(node: HTMLDivElement, id: string) { nodes.set(id,node); return {destroy:()=>{nodes.delete(id);}}; }
  function mask(node: HTMLElement) {
    const existing=hidden.get(node);
    if(existing){existing.count++;return;}
    hidden.set(node,{opacity:node.style.opacity,count:1});node.style.opacity='0';
  }
  function reveal(node: HTMLElement) {
    const saved=hidden.get(node);if(!saved)return;
    if(--saved.count)return;
    node.style.opacity=saved.opacity;hidden.delete(node);
  }
  function stop() {
    generation++;queue=[];
    for(const animation of [...animations,...layoutAnimations])animation.cancel();
    animations.clear();layoutAnimations.clear();
    for(const [node,saved] of hidden)node.style.opacity=saved.opacity;
    hidden.clear();activeFlights.clear();flights=[];
  }
  function anchor(layout: Layout, value: PublicAnchor, card?: string): Pose | undefined {
    const matches=layout.poses.filter(pose=>pose.zone===value.zone&&(!value.uid||pose.uid===value.uid)&&(!value.cardId||pose.pile===value.cardId));
    if(card){const exact=matches.find(pose=>pose.card===card);if(exact)return exact;}
    if(value.zone==='supply')return matches.find(pose=>pose.node.dataset.motionPile)??matches[0];
    return matches.find(pose=>!pose.key)??matches[0];
  }
  function reposition(previous: Layout, next: Layout) {
    for(const pose of next.poses){
      if(!pose.key)continue;
      const old=previous.poses.find(candidate=>candidate.key===pose.key);if(!old)continue;
      const dx=old.x-pose.x,dy=old.y-pose.y;
      if(Math.abs(dx)+Math.abs(dy)>.5){
        const animation=pose.node.animate([{translate:`${dx}px ${dy}px`},{translate:'0px 0px'}],{duration:motionDuration(450),easing:MOTION_EASING});
        layoutAnimations.add(animation);void animation.finished.catch(()=>undefined).finally(()=>layoutAnimations.delete(animation));
      }
      const face=pose.node.querySelector<HTMLElement>('.hand-face');
      if(face&&old.transform!==pose.transform){
        const animation=face.animate([{transform:old.transform},{transform:pose.transform}],{duration:motionDuration(450),easing:MOTION_EASING});
        layoutAnimations.add(animation);void animation.finished.catch(()=>undefined).finally(()=>layoutAnimations.delete(animation));
      }
    }
  }
  function plan(entry: PublicActivity, previous: Layout, next: Layout): Flight[] {
    const result: Flight[]=[];
    const newHands=next.poses.filter(pose=>pose.zone==='hand'&&pose.key&&(entry.command==='turn/ended'||!previous.poses.some(old=>old.key===pose.key)));
    const steps=entry.steps.map(step=>entry.command==='card/bought'&&step.kind==='gain'?{...step,to:{zone:'play' as const,uid:entry.actor.uid}}:step);
    if(entry.command==='turn/ended'&&!steps.some(step=>step.kind==='cleanup'&&step.from.zone==='play')){
      const waiting=previous.poses.filter(pose=>pose.zone==='play'&&pose.uid===entry.actor.uid&&pose.card);
      if(waiting.length)steps.unshift({id:`${entry.sequence}:cleanup:purchases`,kind:'cleanup',from:{zone:'play',uid:entry.actor.uid},to:{zone:'discard',uid:entry.actor.uid},count:waiting.length,backs:false,effect:'Cleanup'});
    }
    for(const step of steps){
      // Worship and Bloodline effects stay on their cards: they are not transfers.
      if(step.kind==='worship'||step.kind==='leader'){
        const source=anchor(next,step.from);if(source){
          const animation=source.node.animate([{filter:'brightness(1.25)'},{filter:'brightness(1)'}],{duration:motionDuration(450),easing:MOTION_EASING});
          animations.add(animation);void animation.finished.catch(()=>undefined).finally(()=>animations.delete(animation));
        }
        continue;
      }
      const oldCards=step.kind==='cleanup'?previous.poses.filter(pose=>pose.zone===step.from.zone&&pose.uid===step.from.uid&&pose.key&&!pose.key.startsWith('hand-hit:')):[];
      const count=step.kind==='cleanup'?Math.max(1,oldCards.length):1;
      for(let index=0;index<count;index++){
        const from=oldCards[index]??anchor(previous,step.from,step.card?.id)??anchor(next,step.from,step.card?.id);
        const drawn=step.kind==='draw'?game.movements.find(move=>`${move.sequence}:${move.index}`===step.id)?.card:undefined;
        // Match visible hand cards to their sorted slots, including a card that
        // was discarded, shuffled and drawn again during this same turn end.
        const arriving=step.kind==='draw'?(next.poses.find(pose=>pose.zone==='hand'&&pose.uid===step.to.uid&&pose.card===drawn?.id&&!!pose.face)??newHands.find(pose=>pose.uid===step.to.uid)):undefined;
        if(arriving&&newHands.includes(arriving))newHands.splice(newHands.indexOf(arriving),1);
        const to=arriving??anchor(next,step.to,step.card?.id);
        // A hidden or absent destination must not turn into a flight to an unrelated spot.
        if(!from||!to)continue;
        const card=step.card??(step.kind==='draw'?arriving?.face:step.kind==='cleanup'?from.face:undefined);
        const flight={card,stack:to.stack,id:`${step.id}:${index}`,step,from,to,width:from.key?from.width:to.key?to.width:next.width,sequence:entry.sequence};
        if(to.key)mask(to.node);
        result.push(flight);
      }
    }
    return result;
  }
  async function drain() {
    if(running)return;
    running=true;const token=generation;
    try{
      await tick();
      while(queue.length&&token===generation){
        const entry=queue.shift()!;
        for(let index=0;index<entry.length;){
          if(token!==generation)break;
          const batch=[entry[index++]];
          if(['play','draw','cleanup'].includes(batch[0].step.kind)){
            while(index<entry.length&&entry[index].step.kind===batch[0].step.kind)batch.push(entry[index++]);
          }
          flushSync(()=>{flights=batch;});
          const landed:Animation[]=[];
          await Promise.all(batch.map(async(flight,offset)=>{
            const node=nodes.get(flight.id)!;
            // Use the actual card slot when available, otherwise the real pile icon.
            const destination=current.poses.find(pose=>pose.key&&pose.key===flight.to.key)??anchor(current,flight.step.to,flight.step.card?.id)??flight.to;
            const active:ActiveFlight={flight,node,target:destination};activeFlights.add(active);
            let start=transform(flight.from),duration=motionDuration(flight.step.kind==='reveal'?680:450),delay=motionDuration(Math.min(offset*70,280));
            try{
              while(token===generation){
                active.redirect=undefined;
                const animation=node.animate([
                  {transform:start,opacity:1},
                  {transform:transform(active.target),opacity:1}
                ],{duration,delay,easing:MOTION_EASING,fill:'both'});
                active.animation=animation;animations.add(animation);
                await animation.finished.catch(()=>undefined);
                const redirect=active.redirect as ActiveFlight['redirect'];
                if(!redirect){landed.push(animation);break;}
                animation.cancel();animations.delete(animation);
                start=redirect.transform;duration=redirect.duration;delay=0;
              }
            }finally{
              activeFlights.delete(active);
            }
          }));
          // Keep all arrivals in the flight layer until the batch completes. A later
          // deal must not cover a card that belongs above it in the sorted hand.
          for(const flight of batch)reveal(flight.to.node);
          for(const animation of landed){animation.cancel();animations.delete(animation);}
          flights=[];
        }
      }
    }finally{running=false;flights=[];if(queue.length)void drain();}
  }
  // Read departing cards before Svelte removes them or closes gaps in the hand.
  $effect.pre(()=>{
    const nextRevision=game.activity.length;
    if(nextRevision===revision)return;
    untrack(()=>{
      before=previousLayout();
      for(const animation of layoutAnimations)animation.cancel();
      layoutAnimations.clear();revision=nextRevision;
    });
  });
  $effect(()=>{
    const canShow=visible&&foreground&&!reduced&&status==='synced';
    const fresh=cursor.take(game.publicActivity,status==='synced',canShow);
    untrack(()=>{
      current=measureLayout();
      // Another play can move a landing slot while a card is still in flight.
      // Continue from its current visual position toward that slot, without a jump.
      for(const active of activeFlights){
        const target=current.poses.find(pose=>pose.key&&pose.key===active.flight.to.key);
        if(!target||Math.abs(target.x-active.target.x)+Math.abs(target.y-active.target.y)<.5)continue;
        const timing=active.animation?.effect?.getComputedTiming();
        active.redirect={transform:getComputedStyle(active.node).transform,duration:Math.max(motionDuration(100),Number(timing?.duration??motionDuration(450))*(1-(timing?.progress??0)))};
        active.target=target;active.animation?.cancel();
      }
      if(!canShow){stop();return;}
      if(fresh.length){
        for(const entry of fresh){const planned=plan(entry,before,current);if(planned.length)queue.push(planned);}
        reposition(before,current);void drain();
      }
    });
  });
  onMount(()=>{
    const update=()=>{foreground=document.visibilityState==='visible';};
    update();document.addEventListener('visibilitychange',update);
    return()=>{document.removeEventListener('visibilitychange',update);stop();};
  });
</script>

{#each flights as flight (flight.id)}
  <div use:flightNode={flight.id} class="public-flight" style:width={`${flight.width}px`} style:z-index={20+flight.stack} data-motion-sequence={flight.sequence} data-motion-step={flight.step.id} data-motion-kind={flight.step.kind} aria-hidden="true">
    {#if flight.card}<CardFace card={definition(flight.card.cardId)} players={game.playerCount} copy={flight.card.copy}/>{:else}<CardBack format="deck"/>{/if}
  </div>
{/each}

<style>
  .public-flight{position:fixed;left:0;top:0;z-index:20;pointer-events:none;opacity:0;transform-origin:center;}
</style>
