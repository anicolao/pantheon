<script lang="ts">
  import type { TransitionConfig } from 'svelte/transition';
  import type { CardInstance } from '$lib/game/setup';
  import { definition } from '$lib/game/actions';
  import CardFace from '../CardFace.svelte';
  import CardBack from '../CardBack.svelte';
  import { cardGesture } from './card-gesture';

  let {cards,uid,players,faceUp=true,angle,measure=false,selected=[],staged=[],disabled=()=>false,label,pressed,activate,inspect,revision=()=>0,deal=()=>({duration:0}),helpId}: {
    cards:CardInstance[];uid:string;players:2|3|4;faceUp?:boolean;angle?:number;measure?:boolean;
    selected?:string[];staged?:string[];disabled?:(card:CardInstance)=>boolean;
    label:(card:CardInstance,index:number)=>string;pressed?:(card:CardInstance)=>boolean;
    activate:(card:CardInstance)=>void;inspect:(card:CardInstance)=>void;
    revision?:(id:string)=>number;deal?:(node:Element,index:number)=>TransitionConfig;helpId?:string;
  }=$props();
  const fanAngle=(index:number)=>(index-(cards.length-1)/2)*Math.min(3,16/Math.max(1,cards.length-1));
</script>
<div class="fan" style:--hand-count={cards.length} style:--hand-spaces={Math.max(1,cards.length-1)}>
  {#each cards as card,index (`${card.id}:${revision(card.id)}`)}
    <div class="hand-slot" class:table-card-measure={measure} class:staged={staged.includes(card.id)} class:selected={selected.includes(card.id)} data-motion-key={`hand:${card.id}`} data-motion-card={card.id} data-motion-face={faceUp?card.cardId:undefined} data-motion-copy={card.copy} data-motion-zone="hand" data-motion-uid={uid} data-motion-angle={angle===undefined?undefined:angle+fanAngle(index)} data-instance-id={card.id} style:--card-index={index} style:--fan-angle={`${fanAngle(index)}deg`} style:--fan-drop={`${Math.abs(index-(cards.length-1)/2)*3}px`} in:deal|global={index}>
      <div class="hand-face">{#if faceUp}<CardFace card={definition(card.cardId)} {players} copy={card.copy}/>{:else}<CardBack format="deck"/>{/if}</div>
    </div>
    <button data-motion-key={`hand-hit:${card.id}`} data-testid="hand-card" data-instance-id={card.id} disabled={!faceUp||disabled(card)} aria-pressed={pressed?.(card)} aria-label={label(card,index)} aria-describedby={helpId} style:--card-index={index} use:cardGesture={{activate:()=>activate(card),inspect:()=>inspect(card)}}></button>
  {/each}
</div>
<style>
  .fan{display:contents;--fan-width:min(calc(100% - var(--fan-inset,12px)),max(calc(var(--hand-card-width) * (1 + (var(--hand-count) - 1) * .48)),calc(var(--hand-card-width) + (var(--hand-count) - 1) * var(--hand-min-peek,44px))));--fan-step:calc((var(--fan-width) - var(--hand-card-width)) / var(--hand-spaces));}
  .hand-slot,button{position:absolute;left:calc((100% - var(--fan-width))/2 + var(--card-index)*var(--fan-step));bottom:0;}
  .hand-slot{width:var(--hand-card-width);z-index:calc(var(--card-index)*2);pointer-events:none;}
  .hand-face{transform:translateY(var(--fan-drop)) rotate(var(--fan-angle));transform-origin:50% 100%;pointer-events:none;}
  button{color:inherit;border:0;background:none;padding:0;height:calc(var(--hand-card-width) * 1.2);width:var(--fan-step);z-index:calc(var(--card-index)*2 + 1);min-width:0;}
  button:last-of-type{width:var(--hand-card-width);}
  button:disabled{pointer-events:none;}
  button:focus-visible{outline:3px solid #ffdf8e;outline-offset:3px;border-radius:8px;}
  .hand-slot:has(+ button:hover),.fan:not(:has(button:hover)) .hand-slot:has(+ button:focus-visible){filter:brightness(1.13) drop-shadow(0 0 5px #eebd63);}
  .fan:has(button:hover) button:focus-visible{outline:none;}
  .staged{visibility:hidden;}.selected .hand-face{outline:3px solid #f6dd8b;}
  @media(max-height:500px) and (min-aspect-ratio:3/4){.hand-face{transform:translateY(min(var(--fan-drop),max(0px,calc(4svh - var(--hand-card-width)*.15)))) rotate(var(--fan-angle));}}
</style>
