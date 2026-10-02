<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import type { SetupState } from '$lib/game/setup';
  import { definition, type Choice, type ActionCommand } from '$lib/game/actions';
  import { canUndo } from '$lib/game/undo';
  import ResourceIcon from '../ResourceIcon.svelte';
  import CardFace from '../CardFace.svelte';
  import GameButton from '../GameButton.svelte';
  import { motionDuration, MOTION_EASING } from './motion';

  let {game,uid,choice,ready,error,reduced,command,targets=$bindable([]),busy=$bindable(false),handled}:
    {game:SetupState;uid:string;choice:Choice;ready:boolean;error:string;reduced:boolean;
      command:(command:ActionCommand)=>Promise<void>;targets:string[];busy:boolean;
      handled:(choiceId:string)=>void}=$props();
  let pack=$state<HTMLDivElement>();
  const cards=$derived(targets.map(id=>game.decks[uid].hand.find(card=>card.id===id)).filter(card=>!!card));
  const instruction=$derived(choice.kind==='gain'
    ? `Choose ${choice.actionOnly?'an Action':'a card'} costing up to ${choice.limit} from the market`
    : choice.kind==='discard' ? 'Discard a card from your hand'
    : `Choose up to ${choice.max} ${choice.max===1?'card':'cards'} to trash`);
  const animations=new Set<Animation>();
  let alive=true;
  // A closed phone drawer has no visible trash icon; its handle is the destination.
  function home() {
    const selector=choice.kind==='trash'?'.trash-control [data-resource="trash"]':'.discard-pile [data-resource="discard"]';
    const icon=document.querySelector<HTMLElement>(selector);
    const rect=icon?.getBoundingClientRect();
    if(rect && rect.width && rect.left>=0 && rect.right<=innerWidth && rect.top>=0 && rect.bottom<=innerHeight)return rect;
    return document.querySelector<HTMLElement>('[aria-controls="player-drawer"]')?.getBoundingClientRect();
  }
  function at(rect:DOMRect,node:HTMLElement,scale=false) {
    const end=node.getBoundingClientRect();
    return `translate(${rect.x+rect.width/2-end.x-end.width/2}px,${rect.y+rect.height/2-end.y-end.height/2}px) scale(${scale?rect.width/end.width:1})`;
  }
  function handPose(id:string) {
    const slot=[...document.querySelectorAll<HTMLElement>('.hand-slot')].find(node=>node.dataset.instanceId===id);
    const face=slot?.querySelector<HTMLElement>('.hand-face');
    if(!face)return;
    const transform=getComputedStyle(face).transform;
    const matrix=new DOMMatrixReadOnly(transform==='none'?undefined:transform);
    return {rect:face.getBoundingClientRect(),angle:Math.atan2(matrix.b,matrix.a)*180/Math.PI};
  }
  async function animate(node:HTMLElement,frames:Keyframe[],duration:number,hold=false) {
    if(reduced || !alive)return;
    const animation=node.animate(frames,{duration:motionDuration(duration),easing:MOTION_EASING,fill:hold?'forwards':'none'});
    animations.add(animation);
    await animation.finished.catch(()=>undefined);
    if(!hold){animation.cancel();animations.delete(animation);}
  }
  onMount(()=>{
    targets=[];busy=true;
    const rect=home();
    void (rect&&pack?animate(pack,[{transform:at(rect,pack,true)},{transform:'none'}],240):Promise.resolve()).finally(()=>{if(alive)busy=false;});
  });
  onDestroy(()=>{alive=false;for(const animation of animations)animation.cancel();});

  export async function select(id:string) {
    if(!ready || busy || !alive)return;
    if(choice.kind==='gain'){await finish([id]);return;}
    if(!game.decks[uid].hand.some(card=>card.id===id) || targets.includes(id) || targets.length>=choice.max)return;
    const source=handPose(id);
    busy=true;targets=[...targets,id];await tick();
    const card=pack?.querySelector<HTMLElement>(`[data-staged-id="${CSS.escape(id)}"]`);
    if(source&&card)await animate(card,[{transform:`${at(source.rect,card)} rotate(${source.angle}deg)`},{transform:'none'}],300);
    if(!alive)return;
    busy=false;
    if(targets.length===choice.max)await finish();
  }
  async function remove(id:string) {
    if(!ready || busy)return;
    busy=true;
    const card=pack?.querySelector<HTMLElement>(`[data-staged-id="${CSS.escape(id)}"]`);
    const destination=handPose(id);
    if(card&&destination)await animate(card,[{transform:'none'},{transform:`${at(destination.rect,card)} rotate(${destination.angle}deg)`}],250,true);
    if(!alive)return;
    targets=targets.filter(target=>target!==id);busy=false;
  }
  async function finish(selected=targets) {
    if(!ready || busy || selected.length<choice.min || !alive)return;
    busy=true;
    const id=choice.id,rect=home();
    if(rect&&pack)await animate(pack,[{transform:'none'},{transform:at(rect,pack,true)}],300,true);
    if(!alive)return;
    if(choice.kind!=='gain')handled(id);
    try {await command({type:'choice/resolved',choiceId:id,targets:[...selected]});}
    finally {
      if(alive){for(const animation of animations)animation.cancel();animations.clear();busy=false;}
    }
  }
</script>

<section class="inline-choice" aria-label={`${definition(choice.source).name} choice`} aria-busy={busy} data-choice-kind={choice.kind}>
  <div class="choice-pack" bind:this={pack}>
    <ResourceIcon resource={choice.kind} value={choice.kind==='gain'?choice.limit:undefined} label={instruction}/>
    {#each cards as card,index (card.id)}
      <button class="staged-card" data-staged-id={card.id} style:--index={index} style:--count={cards.length} disabled={busy||!ready} aria-label={`Return ${definition(card.cardId).name} to hand`} onclick={()=>remove(card.id)}>
        <CardFace card={definition(card.cardId)} copy={card.copy} players={game.playerCount}/>
      </button>
    {/each}
  </div>
  <div class="choice-controls">
    <p class="source">{definition(choice.source).name.split(',')[0]}</p>
    <p class="instruction" role="status">{instruction}</p>
    <div class="buttons">
      {#if choice.kind==='trash'}<GameButton primary disabled={!ready||busy} onclick={()=>finish()}>Done trashing{targets.length?` (${targets.length})`:''}</GameButton>{/if}
      {#if choice.kind==='gain'&&choice.min===0}<GameButton disabled={!ready||busy} onclick={()=>finish([])}>Gain none</GameButton>{/if}
      {#if canUndo(game,uid)}<GameButton disabled={!ready||busy} onclick={()=>command({type:'action/undone',targetSequence:game.undo!.sequence})}>Undo</GameButton>{/if}
    </div>
    {#if error}<p role="alert">{error}</p>{/if}
  </div>
</section>

<style>
  .inline-choice{position:absolute;left:var(--center-left);width:var(--center-width);top:var(--play-top);height:var(--table-card-height);z-index:45;display:flex;align-items:center;justify-content:center;gap:clamp(8px,2vw,36px);color:#ffe9bb;pointer-events:none;}
  .choice-pack{position:relative;flex:0 0 auto;width:min(35%,var(--table-card-height));height:min(90%,var(--table-card-height));display:grid;place-items:center;--icon-size:calc(var(--table-card-height)*.32);transform-origin:center;}
  .staged-card{position:absolute;z-index:5;left:calc(50% - var(--table-card-width)/2 + (var(--index) - (var(--count) - 1)/2)*22px);top:50%;margin-top:calc(var(--table-card-height)*-.5);width:var(--table-card-width);border:0;padding:0;background:none;pointer-events:auto;filter:drop-shadow(0 4px 8px #0009);transition:left .5s ease-out;}
  @media(prefers-reduced-motion:reduce){.staged-card{transition:none;}}
  .choice-controls{max-width:60%;text-align:center;padding:10px;border-radius:12px;background:#071321ed;border:1px solid #c6a25f80;pointer-events:auto;--control-height:clamp(34px,4.5svh,76px);--control-font:clamp(14px,1.8svh,32px);}
  p{margin:0 0 8px;}.source{font-size:clamp(12px,1.8svh,30px);color:#d6b46f;}.instruction{font-size:clamp(16px,2.4svh,42px);line-height:1.15;}.buttons{display:flex;gap:6px;justify-content:center;}
  @media(max-aspect-ratio:3/4){.choice-controls{padding:8px;max-width:62%;--control-height:38px;--control-font:13px;}.instruction{font-size:17px;}.source{font-size:12px;}.buttons{flex-wrap:wrap;}.choice-pack{width:30%;--icon-size:calc(var(--table-card-height)*.27);}}
  @media(max-height:500px) and (min-aspect-ratio:3/4){.choice-controls{padding:5px;--control-height:30px;--control-font:12px;}.instruction{font-size:14px;}.source{font-size:11px;margin-bottom:3px;}p{margin-bottom:4px;}}
</style>
