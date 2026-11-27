<script lang="ts">
  import {untrack,tick} from 'svelte';
  import type {CardInstance} from '$lib/game/setup';
  import CardFace from '../CardFace.svelte';
  import {definition} from '$lib/game/actions';
  import {coverflowLayout} from './coverflow-layout';
  import {seekPiles} from './seek-piles';
  import {motionDuration} from './motion';
  let {cards,eligible,players,uid,ready,readOnly,rotation=0,focus,choose,browse}:{
    cards:CardInstance[];eligible:string[];players:2|3|4;uid:string;ready:boolean;readOnly:boolean;rotation?:number;focus?:string;
    choose:(id:string)=>void;browse:(cardId:string)=>Promise<void>;
  }=$props();
  const piles=$derived(seekPiles(cards));
  const lastEligible=$derived(piles.findLastIndex(pile=>pile.copies.some(card=>eligible.includes(card.id))));
  let target=$state(untrack(()=>Math.max(0,lastEligible))),width=$state(600),cardWidth=$state(130),dragged=false;
  const capacity=$derived(Math.max(1,Math.min(5,Math.floor((width-16-cardWidth*2.6)/(cardWidth*1.055)))));
  const allFit=$derived(piles.length*cardWidth*1.055+24<=width);
  const faces=$derived(allFit?piles.length:Math.min(capacity,target+1));
  const position=$derived(allFit?piles.length-1:target);
  const layout=$derived(coverflowLayout(piles.length,position,width,cardWidth,faces));
  $effect(()=>{const index=piles.findIndex(pile=>pile.cardId===focus);target=index>=0?index:Math.max(0,lastEligible);});
  function faceUp(index:number){return index>=position-faces+1&&index<=position;}
  let fan=$state<HTMLElement>(),moving=$state(false);
  async function move(index:number){
    if(!ready||readOnly||moving||!piles.length)return;
    target=Math.max(0,Math.min(piles.length-1,index));
    moving=true;
    try{
      await tick();
      const flights=fan?.getAnimations({subtree:true})??[];
      await Promise.all([browse(piles[target].cardId),...flights.map(animation=>animation.finished.catch(()=>undefined))]);
    }finally{moving=false;}
  }
  function activate(index:number){
    if(dragged||!ready||readOnly||moving)return;
    if(!faceUp(index)){move(index<position-faces+1?index+faces-1:index);return;}
    const card=piles[index].copies.find(card=>eligible.includes(card.id));
    if(card)choose(card.id);
  }
  function key(event:KeyboardEvent){dragged=false;if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();move(event.key==='Home'?0:event.key==='End'?piles.length-1:target+(event.key==='ArrowRight'?1:-1));}
  let pointer:number|undefined,start=0,startTarget=0;
  const axis=(event:PointerEvent)=>event.clientX*Math.cos(rotation*Math.PI/180)+event.clientY*Math.sin(rotation*Math.PI/180);
  function down(event:PointerEvent){if(event.button!==0||!ready||readOnly)return;pointer=event.pointerId;start=axis(event);startTarget=target;dragged=false;((event.target as HTMLElement).closest('button')??event.currentTarget as HTMLElement).setPointerCapture(pointer);}
  function drag(event:PointerEvent){if(event.pointerId!==pointer)return;const delta=axis(event)-start;if(Math.abs(delta)>10){dragged=true;target=Math.max(0,Math.min(piles.length-1,startTarget-Math.round(delta/(cardWidth*.75))));}}
  function up(event:PointerEvent){if(event.pointerId!==pointer)return;pointer=undefined;if(dragged)move(target);}
  let lastWheel=0;
  function wheel(event:WheelEvent){event.preventDefault();if(Math.abs(event.deltaX)+Math.abs(event.deltaY)<4||performance.now()-lastWheel<110)return;lastWheel=performance.now();move(target+Math.sign(event.deltaX||event.deltaY));}
</script>
<div class="seek-coverflow" bind:clientWidth={width} style:--glide={motionDuration(260)+'ms'} data-seek-piles={piles.length}>
  <div class="measure" bind:clientWidth={cardWidth}></div>
  <section bind:this={fan} class="fan" aria-label="Revealed cards" onwheel={wheel} onpointerdown={down} onpointermove={drag} onpointerup={up} onpointercancel={up}>
    {#each piles as pile,index (pile.cardId)}
      <div class="pile" class:unavailable={!pile.copies.some(card=>eligible.includes(card.id))} style:transform={layout[index].transform} style:z-index={layout[index].z}>
        {#each pile.copies as card,copy (card.id)}
          <div class="copy" style:left={Math.min(copy,3)*3+'px'} style:top={-Math.min(copy,3)*3+'px'} style:z-index={pile.copies.length-copy}
            data-motion-key={'effect:'+card.id} data-motion-card={card.id} data-motion-face={card.cardId} data-motion-copy={card.copy}
            data-public-zone="reveal" data-public-uid={uid} data-motion-angle={rotation}>
            <CardFace card={definition(card.cardId)} copy={card.copy} {players}/>
          </div>
        {/each}
        {#if pile.copies.length>1}<span class="count" aria-label={ready?pile.copies.length+' copies':'Cards revealing'}>{ready?'×'+pile.copies.length:'…'}</span>{/if}
      </div>
      <button class="hit" style:left={layout[index].hitLeft+'px'} style:width={layout[index].hitWidth+'px'} style:z-index={1100+index}
        disabled={!ready||readOnly||moving} aria-disabled={faceUp(index)&&!pile.copies.some(card=>eligible.includes(card.id))}
        aria-label={`${faceUp(index)?'Keep one':'Center'} ${definition(pile.cardId).name}${pile.copies.length>1?', '+pile.copies.length+' copies':''}`}
        onclick={()=>activate(index)} onkeydown={key}></button>
    {/each}
  </section>
  {#if !allFit}<div class="navigation"><button aria-label="Previous revealed cards" disabled={!ready||readOnly||target===0} onclick={()=>move(target-1)}>‹</button><span>Drag to browse · tap a face-up card to keep one</span><button aria-label="Next revealed cards" disabled={!ready||readOnly||target===piles.length-1} onclick={()=>move(target+1)}>›</button></div>{/if}
</div>
<style>
.seek-coverflow{width:100%;position:relative;isolation:isolate;padding-top:10px;--seek-width:var(--table-card-width,130px);height:calc(var(--seek-width)*1.4 + 46px);box-sizing:border-box}
.measure{position:absolute;width:var(--seek-width);height:0;pointer-events:none}.fan{position:absolute;inset:10px 0 36px;perspective:1400px;touch-action:pan-y;user-select:none}
.pile{position:absolute;left:calc(50% - var(--seek-width)/2);top:0;width:var(--seek-width);height:calc(var(--seek-width)*1.4);pointer-events:none;transition:transform var(--glide) cubic-bezier(.22,1,.36,1)}
.copy{position:absolute;width:100%}.unavailable :global(.card){filter:brightness(.65) saturate(.55)}
.count{position:absolute;bottom:3%;left:3%;z-index:20;padding:4px 7px;border-radius:12px;background:#071321f5;border:1px solid #d8b772;font-size:16px;font-weight:700}
.hit{position:absolute;top:0;height:calc(var(--seek-width)*1.4);border:0;padding:0;background:none;min-width:0;cursor:pointer}.hit:focus-visible{outline:2px solid #ffdc84}.hit:disabled{cursor:default}
.navigation{position:absolute;bottom:0;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:12px;font-size:12px}.navigation button{background:none;color:inherit;border:1px solid #bca16880;border-radius:6px;min-width:36px;height:30px;font-size:24px;cursor:pointer}
@media(prefers-reduced-motion:reduce){.pile{transition:none}}
</style>
