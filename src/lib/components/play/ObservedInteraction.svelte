<script lang="ts">
  import {onDestroy} from 'svelte';
  import type { SetupState } from '$lib/game/setup';
  import { activePlayer, definition, devotionCards, type Choice } from '$lib/game/actions';
  import WorshipFace from './WorshipFace.svelte';
  import ResourceIcon from '../ResourceIcon.svelte';
  import CardBack from '../CardBack.svelte';
  import { motionDuration } from './motion';
  import { cubicOut } from 'svelte/easing';
  let {game,temple,choice,reduced}:{game:SetupState;temple?:string;choice?:Choice|null;reduced:boolean}=$props();
  let landed!:()=>void;
  const arrival=new Promise<void>(resolve=>{landed=resolve;});
  export function arrived(){return arrival;}
  onDestroy(()=>landed());
  const actor=$derived(activePlayer(game));
  const name=$derived(game.players.find(player=>player.uid===actor)?.name);
  const selected=$derived(game.turn.choice?.id===choice?.id ? choice?.selectedCount??0 : 0);
  function origin() {
    const selector=temple?`[data-god-event="${temple}"]`:choice?.kind==='trash'?'.trash-control [data-resource="trash"]':`[data-public-zone="discard"][data-public-uid="${actor}"]`;
    const candidates=[...document.querySelectorAll<HTMLElement>(selector)];
    return candidates.find(node=>{const r=node.getBoundingClientRect();return r.width&&r.left>=0&&r.right<=innerWidth;})
      ??document.querySelector<HTMLElement>(temple?'[aria-controls="worship-drawer"]':'[aria-controls="player-drawer"]');
  }
  function travel(node:HTMLElement){
    const start=origin()?.getBoundingClientRect(),end=node.getBoundingClientRect();
    const x=start?start.x+start.width/2-end.x-end.width/2:0,y=start?start.y+start.height/2-end.y-end.height/2:0;
    const scale=start?start.width/end.width:.8;
    return {duration:reduced?0:motionDuration(300),easing:cubicOut,css:(t:number)=>`transform:translate(${x*(1-t)}px,${y*(1-t)}px) scale(${scale+(1-scale)*t});opacity:${t};`};
  }
  function fromHand(node:HTMLElement){
    const hand=document.querySelector<HTMLElement>(`[data-public-zone="hand"][data-public-uid="${actor}"]`)?.getBoundingClientRect(),end=node.getBoundingClientRect();
    return {duration:reduced?0:motionDuration(300),easing:cubicOut,css:(t:number)=>`transform:translate(${hand?(hand.x-end.x)*(1-t):0}px,${hand?(hand.y-end.y)*(1-t):0}px);opacity:${t};`};
  }
</script>
<section class="observed-interaction" class:temple={!!temple} aria-label={temple?`${definition(temple).god} worship by ${name}`:`${name} choosing cards`} data-observed-choice={choice?.id} data-observed-temple={temple} onintroend={()=>landed()} transition:travel|global>
  {#if temple}<WorshipFace {game} uid={actor} cardId={temple}/>{/if}
  {#if choice && choice.kind!=='gain'}
    <div class="observer-target" data-observer-target={choice.kind} data-public-uid={actor} data-public-zone="selection">
      <ResourceIcon resource={choice.kind}/>
      {#each Array(selected) as _,index (index)}<div class="selected-back" style:left={`calc(50% + ${index*14}px)`} transition:fromHand><CardBack format="deck"/></div>{/each}
    </div>
  {/if}
  <p role="status">
    {name}{temple?` · ${devotionCards(game,actor,temple).length} Devotion`:''}
    {#if choice}<br/>{choice.kind==='gain'?`Choosing a card costing up to ${choice.limit} from the market`:`Choosing up to ${choice.max} cards to ${choice.kind} · ${selected} selected`}
    {:else if temple}<br/>Worshipping {definition(temple).god}{/if}
  </p>
</section>
<style>
  .observed-interaction{position:absolute;left:var(--center-left);width:var(--center-width);top:var(--play-top);height:var(--table-card-height);z-index:44;display:flex;align-items:center;justify-content:center;gap:20px;pointer-events:none;color:#ffe9bb;transform-origin:center;}
  .observed-interaction.temple{left:calc(var(--center-left) + var(--center-width)*.1);width:calc(var(--center-width)*.8);top:auto;bottom:11%;height:auto;display:block;max-width:76svh;}
  .observer-target{position:relative;width:calc(var(--table-card-width) + 18px);flex-shrink:0;height:100%;display:grid;place-items:center;--icon-size:calc(var(--table-card-height)*.45);}
  .temple .observer-target{position:absolute;right:8%;bottom:15%;height:35%;width:28%;}
  .selected-back{position:absolute;top:0;width:var(--table-card-width);margin-left:calc(var(--table-card-width)*-.5);}
  p{padding:12px;background:#081523f2;border:1px solid #bca16899;border-radius:10px;font-size:clamp(14px,2svh,26px);text-align:center;}
  .temple p{position:absolute;left:5%;bottom:10%;max-width:42%;font-size:clamp(12px,1.5svh,20px);}
  @media(max-aspect-ratio:3/4){.observed-interaction.temple{left:2%;width:96%;bottom:17%;}.observed-interaction{gap:8px;}p{padding:6px;}}
</style>
