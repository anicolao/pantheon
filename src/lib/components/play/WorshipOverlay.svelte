<script lang="ts">
  import { canUndo } from '$lib/game/undo';
  import { onMount, tick } from 'svelte';
  import type { SetupState } from '$lib/game/setup';
  import type { GameCommand } from '$lib/backend/setup-repository';
  import { definition, devotionCards, activePlayer, worshipReason, type Choice } from '$lib/game/actions';
  import WorshipFace from './WorshipFace.svelte';
  import GameButton from '../GameButton.svelte';
  import { motionDuration, MOTION_EASING } from './motion';
  let {game,uid,selected,ready,error,command,close,sourceRect,prepareReturn,choice,targets,resolve}:{game:SetupState;uid:string;selected:string;ready:boolean;error:string;command:(command:GameCommand)=>Promise<void>;close:()=>void;sourceRect?:DOMRect;prepareReturn:()=>Promise<void>;choice?:Choice|null;targets:string[];resolve:()=>Promise<void>}=$props();
  let node=$state<HTMLElement>();
  let submitting=$state(false),returning=$state(false);
  let submittedRevision=$state(-1);
  const event=$derived(definition(selected));
  const favored=$derived(devotionCards(game,activePlayer(game),selected).length>=2);
  const reason=$derived(worshipReason(game,uid,selected));
  const instruction=$derived(!choice ? '' : choice.kind==='gain' ? `Choose ${choice.actionOnly?'an Action':'a card'} costing up to ${choice.limit} from the offer` : `Choose ${choice.min ? choice.min : 'up to '+choice.max} to ${choice.kind} from the offer`);
  function transform(rect:DOMRect){const end=node!.getBoundingClientRect();return `translate(${rect.x-end.x}px,${rect.y-end.y}px) scale(${rect.width/end.width},${rect.height/end.height})`;}
  onMount(()=>{if(sourceRect&&node&&!matchMedia('(prefers-reduced-motion: reduce)').matches)node.animate([{transform:transform(sourceRect)},{transform:'none'}],{duration:motionDuration(300),easing:MOTION_EASING});});
  async function leave(){
    if(returning||choice)return;returning=true;
    await prepareReturn();await tick();
    const destination=document.querySelector<HTMLElement>(`[data-god-event="${selected}"]`);
    if(node&&destination&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const rect=destination.getBoundingClientRect();await node.animate([{transform:'none'},{transform:transform(rect)}],{duration:motionDuration(300),easing:MOTION_EASING,fill:'forwards'}).finished;}
    close();
  }
  async function submit(){if(!ready||submitting||reason)return;submitting=true;submittedRevision=game.activity.length;try{await command({type:'god/worshipped',cardId:selected});}finally{submitting=false;}}
  async function undo(){
    if(!ready||submitting||returning||!canUndo(game,uid))return;
    const targetSequence=game.undo!.sequence;submittedRevision=-1;submitting=true;
    try{await command({type:'action/undone',targetSequence});await tick();}finally{submitting=false;}
    if(!game.turn.choice)await leave();
  }
  $effect(()=>{if(submittedRevision>=0&&game.activity.length>submittedRevision&&!game.turn.choice&&!game.turn.queue.length&&!submitting)void leave();});
  $effect(()=>{if(choice)submittedRevision=game.activity.length-1;});
</script>
<svelte:window onkeydown={event=>{if(event.key==='Escape'&&!choice)void leave();}} />
<section class="worship-overlay" bind:this={node} aria-label={`${event.god} worship`} aria-busy={submitting||returning}>
  <WorshipFace {game} {uid} cardId={selected}/>
  <div class="card-controls">
    <p>{favored?'Favored':'Standard'} · {devotionCards(game,activePlayer(game),selected).length} Devotion</p>
    {#if choice}
      <p role="status">{instruction}</p>
      <GameButton primary disabled={!ready||returning||targets.length<choice.min} onclick={resolve}>{choice.kind==='gain'?(targets.length?'Gain selected card':choice.min?'Choose a card':'Gain none'):`${choice.kind==='trash'?'Trash':'Discard'} ${targets.length || 'none'}`}</GameButton>
    {:else}
      <GameButton primary disabled={!ready||!!reason||submitting||returning} onclick={submit}>Worship {event.god}</GameButton>
      {#if reason}<p role="status">{reason}</p>{/if}
    {/if}
    {#if canUndo(game,uid)}<GameButton disabled={!ready||submitting||returning} onclick={undo}>Undo</GameButton>{/if}
    {#if error}<p role="alert">{error}</p>{/if}
  </div>
  {#if !choice}<button class="close-worship" aria-label="Return worship card" disabled={submitting||returning} onclick={leave}>×</button>{/if}
</section>
<style>
  .worship-overlay{position:absolute;--overlay-width:min(var(--center-width),76svh);left:calc(var(--center-left) + (var(--center-width) - var(--overlay-width))/2);width:var(--overlay-width);bottom:11%;z-index:40;transform-origin:top left;filter:drop-shadow(0 12px 16px #000b);}
  .card-controls{position:absolute;left:5%;bottom:13%;width:41%;padding:8px;box-sizing:border-box;border:1px solid #bca16899;border-radius:10px;background:#081523ed;color:#ffe7b4;--control-height:clamp(36px,5svh,60px);--control-font:clamp(13px,2svh,24px);}
  .card-controls p{margin:0 0 6px;font-size:clamp(11px,1.5svh,20px);text-align:center;}
  .close-worship{position:absolute;right:2%;top:2%;width:40px;height:40px;border:1px solid #cfac64;border-radius:50%;background:#071321;color:#ffe2a1;font-size:26px;cursor:pointer;}
  @media(max-aspect-ratio:3/4){.worship-overlay{left:2%;width:96%;bottom:17%;}.card-controls{left:5%;bottom:13%;width:43%;padding:5px;--control-height:36px;--control-font:13px;}.card-controls p{font-size:11px;line-height:1.15;}.close-worship{width:32px;height:32px;font-size:22px;}}
</style>
