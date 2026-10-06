<script lang="ts">
  import { onMount, tick, untrack, flushSync } from 'svelte';
  import type { SetupState, CardInstance } from '$lib/game/setup';
  import { definition } from '$lib/game/actions';
  import { PublicMotionCursor, type PublicActivity, type PublicAnchor, type PublicStep } from '$lib/game/public-table';
  import { motionDuration, cardFlightTiming, MOTION_EASING, FLIGHT_EASING, DRAW_MOTION, TABLE_PAUSE } from './motion';
  import { measureLayout, type Pose, type Layout } from './motion-layout';
  import { treasuresRightToLeft } from './hand-order';
  import CardFace from '../CardFace.svelte';
  import CardBack from '../CardBack.svelte';

  let { game, uid, openDraw, status, reduced, visible, previousLayout, localChoices=[], onSettled, onFlightsSettled, preserveFacing=false, layoutRevision=0 }: { preserveFacing?:boolean; layoutRevision?:number; game: SetupState; uid: string; openDraw: (step:string)=>void; status: string; reduced: boolean; visible: boolean; previousLayout: () => Layout; localChoices?:string[]; onSettled?:(revision:number)=>void; onFlightsSettled?:(revision:number)=>void } = $props();
  type Flight = { card?: CardInstance; id: string; step: PublicStep; from: Pose; to: Pose; width: number; stack: number; sequence: number };
  const cursor = new PublicMotionCursor(untrack(() => game.activity.length));
  let drawPhases = $state<Record<string,'reveal'|'space'|'travel'>>({});
  let foreground = $state(true), flights = $state<Flight[]>([]);
  let before: Layout = { poses: [], width: 100 }, current: Layout = before;
  let revision = -1, running = false, generation = 0;
  let queue: Flight[][] = [];
  const departedTableNodes = new Set<HTMLElement>();
  const nodes = new Map<string, HTMLDivElement>();
  const animations = new Set<Animation>();
  const layoutAnimations = new Set<Animation>();
  type ActiveFlight = { flight: Flight; node: HTMLDivElement; target: Pose; animation?: Animation; redirect?: { transform: string; duration: number } };
  const activeFlights = new Set<ActiveFlight>();
  const transform = (pose: Pose) => `translate(${pose.x}px,${pose.y}px) translate(-50%,-50%) rotate(${pose.angle}deg)`;
  const hidden = new Map<HTMLElement, { opacity: string; count: number }>();
  let settlement=0,alive=true;
  const frame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
  async function settle(paint=true) {
    if(!alive||!onSettled)return;
    const token=++settlement, sequence=game.activity.length;
    await tick();
    if(paint){
      // Include the initial deal and layout transitions as well as public flights.
      // Two frames let Svelte start its transitions and paint the revealed slots.
      do {
        await frame();await frame();
        if(!alive||token!==settlement||sequence!==game.activity.length)return;
        const pending=document.getAnimations().filter(animation=>animation.playState==='running'||animation.pending);
        if(!pending.length)break;
        await Promise.all(pending.map(animation=>animation.finished.catch(()=>undefined)));
      }while(true);
    }
    if(alive&&token===settlement&&sequence===game.activity.length&&!running&&!queue.length)onSettled(sequence);
  }
  function flightNode(node: HTMLDivElement, flight: Flight) { node.style.zIndex=String(20+flight.stack);nodes.set(flight.id,node); return {destroy:()=>{nodes.delete(flight.id);node.remove();}}; }
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
    generation++;settlement++;queue=[];
    for(const animation of [...animations,...layoutAnimations])animation.cancel();
    animations.clear();layoutAnimations.clear();
    for(const [node,saved] of hidden)node.style.opacity=saved.opacity;
    hidden.clear();departedTableNodes.clear();activeFlights.clear();flights=[];drawPhases={};
  }
  function anchor(layout: Layout, value: PublicAnchor, card?: string): Pose | undefined {
    const matches=layout.poses.filter(pose=>pose.zone===value.zone&&(!value.uid||pose.uid===value.uid)&&(!value.cardId||pose.pile===value.cardId));
    if(card){const exact=matches.find(pose=>pose.card===card);if(exact)return exact;}
    if(value.zone==='supply')return matches.find(pose=>pose.node.dataset.motionPile)??matches[0];
    return matches.find(pose=>!pose.key)??matches[0];
  }
  function reposition(previous: Layout, next: Layout, duration=motionDuration(450)) {
    const moved: Animation[]=[];
    for(const pose of next.poses){
      if(!pose.key)continue;
      const old=previous.poses.find(candidate=>candidate.key===pose.key);if(!old)continue;
      const dx=old.x-pose.x,dy=old.y-pose.y;
      if(Math.abs(dx)+Math.abs(dy)>.5){
        const angle=pose.node.dataset.motionAngle!==undefined?pose.angle*Math.PI/180:0;
        const localX=dx*Math.cos(angle)+dy*Math.sin(angle),localY=-dx*Math.sin(angle)+dy*Math.cos(angle);
        const animation=pose.node.animate([{translate:`${localX}px ${localY}px`},{translate:'0px 0px'}],{duration,easing:MOTION_EASING});
        moved.push(animation);layoutAnimations.add(animation);void animation.finished.catch(()=>undefined).finally(()=>layoutAnimations.delete(animation));
      }
      const face=pose.node.querySelector<HTMLElement>('.hand-face');
      if(face&&old.transform!==pose.transform){
        const animation=face.animate([{transform:old.transform},{transform:pose.transform}],{duration,easing:MOTION_EASING});
        moved.push(animation);layoutAnimations.add(animation);void animation.finished.catch(()=>undefined).finally(()=>layoutAnimations.delete(animation));
      }
    }
    return moved;
  }
  function plan(entry: PublicActivity, previous: Layout, next: Layout): Flight[] {
    const result: Flight[]=[];
    const newHands=next.poses.filter(pose=>pose.zone==='hand'&&pose.key&&(entry.command==='turn/ended'||!previous.poses.some(old=>old.key===pose.key)));
    const steps=entry.steps.flatMap((step):PublicStep[]=>{
      if(entry.command==='card/bought' && step.kind==='gain')return [{...step,to:{zone:'play',uid:entry.actor.uid}}];
      const movement=game.movements.find(move=>`${move.sequence}:${move.index}`===step.id);
      if(step.kind==='gain' && movement?.source==='sacred-grove'){
        const table:PublicAnchor={zone:'reveal',uid:entry.actor.uid};
        return [{...step,to:table},{...step,id:`${step.id}:from-table`,kind:'discard',from:table}];
      }
      return [step];
    });
    if(entry.command==='treasures/played') {
      const order=treasuresRightToLeft(steps.flatMap(step=>step.card?[step.card]:[]));
      const positions=new Map(order.map((card,index)=>[card.id,index]));
      steps.sort((a,b)=>(positions.get(a.card?.id??'')??Infinity)-(positions.get(b.card?.id??'')??Infinity));
    }
    if(entry.command==='turn/ended'&&!steps.some(step=>step.kind==='cleanup'&&step.from.zone==='play')){
      const waiting=previous.poses.filter(pose=>pose.zone==='play'&&pose.uid===entry.actor.uid&&pose.card);
      if(waiting.length)steps.unshift({id:`${entry.sequence}:cleanup:purchases`,kind:'cleanup',from:{zone:'play',uid:entry.actor.uid},to:{zone:'discard',uid:entry.actor.uid},count:waiting.length,backs:false,effect:'Cleanup'});
    }
    for(const step of steps){
      // The inline target already carried these cards from hand to their pile.
      // Keep later effects (including draws and gains) in the public animation.
      if(entry.choiceId && localChoices.includes(entry.choiceId) && ['trash','discard'].includes(step.kind))continue;
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
        const arrived=step.card?result.findLast(flight=>flight.card?.id===step.card!.id && flight.step.to.zone===step.from.zone && flight.step.to.uid===step.from.uid):undefined;
        const from=arrived?.to??oldCards[index]??anchor(previous,step.from,step.card?.id)??anchor(next,step.from,step.card?.id);
        const drawn=step.kind==='draw'?game.movements.find(move=>`${move.sequence}:${move.index}`===step.id)?.card:undefined;
        // Match visible hand cards to their sorted slots, including a card that
        // was discarded, shuffled and drawn again during this same turn end.
        const arriving=step.kind==='draw'?(next.poses.find(pose=>pose.zone==='hand'&&pose.uid===step.to.uid&&pose.card===drawn?.id&&!!pose.face)??newHands.find(pose=>pose.uid===step.to.uid)):undefined;
        if(arriving&&newHands.includes(arriving))newHands.splice(newHands.indexOf(arriving),1);
        const destination=preserveFacing && step.to.zone==='trash'?{...step.to,uid:entry.actor.uid}:step.to;
        const to=arriving??anchor(next,destination,step.card?.id);
        // A hidden or absent destination must not turn into a flight to an unrelated spot.
        if(!from||!to)continue;
        const card=step.card??(step.kind==='draw'?(step.to.uid===uid?drawn:undefined):step.kind==='cleanup'?from.face:undefined);
        // Hidden draws beyond the five painted hand slots, and shuffles between
        // piles, have no keyed destination. Use that player's sidebar card size
        // rather than falling back to the full-size cards in the central table.
        const owner=step.to.uid??step.from.uid;
        const sidebarCard=!card?[...next.poses,...previous.poses].find(pose=>pose.uid===owner&&pose.zone==='hand'&&pose.key?.startsWith('hidden:')):undefined;
        const sidebarDeck=!card?anchor(next,{zone:'deck',uid:owner})??anchor(previous,{zone:'deck',uid:owner}):undefined;
        const width=card?(step.kind==='draw'?next.width:from.key?from.width:to.key?to.width:next.width):(sidebarCard?.width??sidebarDeck?.width??Math.min(from.width,to.width));
        const flight={card,stack:to.stack,id:`${step.id}:${index}`,step,from,to:facing(to,from),width,sequence:entry.sequence};
        if(to.key && step.kind!=='draw')mask(to.node);
        result.push(flight);
      }
    }
    return result;
  }
  function facing(pose: Pose, source: Pose): Pose { return preserveFacing ? {...pose,angle:source.angle} : pose; }
  function retargetFlights() {
      // Another play can move a landing slot while a card is still in flight.
      // Continue from its current visual position toward that slot, without a jump.
      for(const active of activeFlights){
        const measured=current.poses.find(pose=>pose.key&&pose.key===active.flight.to.key);
        if(!measured)continue;
        const target=facing(measured,active.flight.from);
        if(active.node.parentElement?.classList.contains('hand'))active.node.style.zIndex=String(target.stack);
        if(Math.abs(target.x-active.target.x)+Math.abs(target.y-active.target.y)<.5&&Math.abs(target.angle-active.target.angle)<.1)continue;
        const timing=active.animation?.effect?.getComputedTiming();
        const policy=cardFlightTiming(active.flight.step);
        active.redirect={transform:getComputedStyle(active.node).transform,duration:Math.max(policy.minimumRedirectDuration,Number(timing?.duration??policy.duration)*(1-(timing?.progress??0)))};
        active.target=target;active.animation?.cancel();
      }
  }
  async function drawCard(flight: Flight, token: number, revealed:()=>void) {
    const node=nodes.get(flight.id)!;
    const held:Animation[]=[];
    const valid=()=>alive && token===generation;
    function animate(element:HTMLElement,frames:Keyframe[],duration:number) {
      const animation=element.animate(frames,{duration,easing:FLIGHT_EASING,fill:'both'});
      animations.add(animation);held.push(animation);return animation;
    }
    try {
      // Only the owner has a face to flip. Observers see a small card back.
      const height=flight.width*1.4;
      const source=anchor(current,flight.step.from)??flight.from;
      const angle=preserveFacing?source.angle:0, radians=angle*Math.PI/180;
      const halfX=(Math.abs(Math.cos(radians))*flight.width+Math.abs(Math.sin(radians))*height)/2;
      const halfY=(Math.abs(Math.sin(radians))*flight.width+Math.abs(Math.cos(radians))*height)/2;
      const raised={...source,x:Math.max(halfX+8,Math.min(innerWidth-halfX-8,source.x+Math.sin(radians)*height*.65)),y:Math.max(halfY+8,Math.min(innerHeight-halfY-8,source.y-Math.cos(radians)*height*.65)),angle};
      const flip=node.querySelector<HTMLElement>('.draw-flip');
      await Promise.all([
        animate(node,[{transform:`${transform(source)} scale(${source.width/flight.width})`,opacity:1},{transform:transform(raised),opacity:1}],DRAW_MOTION.reveal),
        ...(flip?[animate(flip,[{transform:'rotateY(180deg)'},{transform:'rotateY(0deg)'}],DRAW_MOTION.reveal)]:[])
      ].map(animation=>animation.finished.catch(()=>undefined)));
      revealed();
      if(!valid())return;
      const previous=measureLayout();
      flushSync(()=>{drawPhases[flight.id]='space';openDraw(flight.step.id);});
      current=measureLayout();
      retargetFlights();
      const added=(flight.card?current.poses.find(pose=>pose.zone==='hand'&&pose.uid===flight.step.to.uid&&pose.card===flight.card!.id&&!!pose.key):undefined)
        ??current.poses.find(pose=>pose.zone==='hand'&&pose.uid===flight.step.to.uid&&pose.key&&!previous.poses.some(old=>old.key===pose.key))
        ??anchor(current,flight.step.to);
      if(!added)return;
      flight.to=facing(added,flight.from);
      if(added.key)mask(added.node);
      await Promise.all(reposition(previous,current,DRAW_MOTION.space).map(animation=>animation.finished.catch(()=>undefined)));
      if(!valid())return;
      drawPhases[flight.id]='travel';
      // Re-measure after opening this slot, not against the final future hand.
      const destination=facing(measureLayout().poses.find(pose=>pose.key&&pose.key===added.key)??added,flight.from);
      flight.stack=destination.stack;
      // Share the real hand's stacking context before entering the fan. A
      // viewport overlay cannot interleave with its cards, whatever its z-index.
      const hand=destination.node.closest<HTMLElement>('.hand');
      if(hand){hand.append(node);node.style.zIndex=String(destination.stack);}
      const active:ActiveFlight={flight,node,target:destination};activeFlights.add(active);
      let start=transform(raised),duration=DRAW_MOTION.travel;
      try {
        while(valid()) {
          active.redirect=undefined;
          const animation=animate(node,[{transform:start,opacity:1},{transform:transform(active.target),opacity:1}],duration);
          active.animation=animation;
          await animation.finished.catch(()=>undefined);
          const redirect=active.redirect as ActiveFlight['redirect'];
          if(!redirect)break;
          animation.cancel();
          start=redirect.transform;duration=redirect.duration;
        }
      } finally { activeFlights.delete(active); }
      if(valid())reveal(added.node);
    } finally {
      for(const animation of held){animation.cancel();animations.delete(animation);}
      revealed();
      if(valid()){flights=flights.filter(item=>item.id!==flight.id);delete drawPhases[flight.id];await tick();}
    }
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
          if(batch[0].step.kind==='draw') {
            const landing:Promise<void>[]=[];
            for(const flight of batch) {
              if(token!==generation)break;
              let release!:()=>void;
              const revealed=new Promise<void>(resolve=>{release=resolve;});
              flushSync(()=>{drawPhases[flight.id]='reveal';flights=[...flights,flight];});
              landing.push(drawCard(flight,token,release));
              // The actual flip completion starts the next reveal. Landing and
              // hand reflow continue concurrently, with each slot added alone.
              await revealed;
            }
            await Promise.all(landing);
            continue;
          }
          // A table reveal must disappear from its stationary slot as its
          // onward flight begins, rather than leaving a duplicate behind.
          for(const flight of batch)if(flight.step.from.zone==='reveal'){
            mask(flight.from.node);departedTableNodes.add(flight.from.node);
          }
          flushSync(()=>{flights=batch;});
          // Schedule the whole batch on one timeline instant. Otherwise each
          // pending animation starts on a later compositor frame under load,
          // adding renderer latency to the intended stagger and landing time.
          const batchStart=document.timeline.currentTime;
          const landed:Animation[]=[];
          await Promise.all(batch.map(async(flight,offset)=>{
            const node=nodes.get(flight.id)!;
            // Use the actual card slot when available, otherwise the real pile icon.
            const targetAnchor=preserveFacing && flight.step.to.zone==='trash'?{...flight.step.to,uid:flight.step.from.uid??uid}:flight.step.to;
            const destination=facing(current.poses.find(pose=>pose.key&&pose.key===flight.to.key)??anchor(current,targetAnchor,flight.step.card?.id)??flight.to,flight.from);
            const active:ActiveFlight={flight,node,target:destination};activeFlights.add(active);
            let {duration,delay}=cardFlightTiming(flight.step,offset);
            let start=transform(flight.from),initial=true;
            try{
              while(token===generation){
                active.redirect=undefined;
                const animation=node.animate([
                  {transform:start,opacity:1},
                  {transform:transform(active.target),opacity:1}
                ],{duration,delay,easing:FLIGHT_EASING,fill:'both'});
                if(initial){animation.startTime=batchStart;initial=false;}
                active.animation=animation;animations.add(animation);
                await animation.finished.catch(()=>undefined);
                const redirect=active.redirect as ActiveFlight['redirect'];
                if(!redirect){
                  const onward=entry[index];
                  if(token===generation && onward && flight.to.key && flight.card && flight.to.key===onward.from.key && flight.card.id===onward.card?.id){
                    node.dataset.motionPhase='pause';
                    const pause=node.animate([{opacity:1},{opacity:1}],{duration:TABLE_PAUSE});
                    animations.add(pause);
                    await pause.finished.catch(()=>undefined);
                    pause.cancel();animations.delete(pause);
                  }
                  landed.push(animation);break;
                }
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
    }finally{
      running=false;flights=[];
      for(const node of departedTableNodes)reveal(node);
      departedTableNodes.clear();
      if(queue.length)void drain();
      else {
        // Release dependent motion as soon as the last flight lands. The broader
        // settlement check below also waits for layout/paint, and is for callers
        // that need the whole view at rest rather than the next animation cue.
        if(alive && token===generation)onFlightsSettled?.(game.activity.length);
        void settle(visible&&foreground&&!reduced);
      }
    }
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
    void layoutRevision;
    const canShow=visible&&foreground&&!reduced&&status==='synced';
    const fresh=cursor.take(game.publicActivity,status==='synced',canShow);
    untrack(()=>{
      current=measureLayout();
      retargetFlights();
      if(!canShow){stop();onFlightsSettled?.(game.activity.length);void settle(false);return;}
      if(fresh.length){
        for(const entry of fresh){const planned=plan(entry,before,current);if(planned.length)queue.push(planned);}
        reposition(before,current);void drain();
      }else if(!running){onFlightsSettled?.(game.activity.length);void settle();}
    });
  });
  onMount(()=>{
    const update=()=>{foreground=document.visibilityState==='visible';};
    update();document.addEventListener('visibilitychange',update);
    return()=>{alive=false;document.removeEventListener('visibilitychange',update);stop();};
  });
</script>

{#each flights as flight (flight.id)}
  <div use:flightNode={flight} class="public-flight" style:width={`${flight.width}px`} data-motion-sequence={flight.sequence} data-motion-step={flight.step.id} data-motion-card={flight.card?.id} data-motion-kind={flight.step.kind} data-draw-phase={drawPhases[flight.id]} aria-hidden="true">
    {#if flight.step.kind==='draw' && flight.card}<div class="draw-flip"><div class="draw-front"><CardFace card={definition(flight.card.cardId)} players={game.playerCount} copy={flight.card.copy}/></div><div class="draw-back"><CardBack format="deck"/></div></div>
    {:else if flight.card}<CardFace card={definition(flight.card.cardId)} players={game.playerCount} copy={flight.card.copy}/>{:else}<CardBack format="deck"/>{/if}
  </div>
{/each}

<style>
  .public-flight:has(.draw-flip){perspective:900px;}
  .draw-flip{position:relative;width:100%;aspect-ratio:5/7;transform-style:preserve-3d;}
  .draw-front,.draw-back{position:absolute;inset:0;backface-visibility:hidden;}
  .draw-back{transform:rotateY(180deg);}
  .public-flight{position:fixed;left:0;top:0;z-index:20;pointer-events:none;opacity:0;transform-origin:center;}
</style>
