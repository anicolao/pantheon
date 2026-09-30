<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import DialogFrame from '../DialogFrame.svelte';
  import CardFace from '../CardFace.svelte';
  import GameButton from '../GameButton.svelte';
  import { setupSupply, type SetupState } from '$lib/game/setup';
  import { definition, purchaseReason, canPlayAction } from '$lib/game/actions';
  import type { GameCommand } from '$lib/backend/setup-repository';
  import { cardGesture } from './card-gesture';
  import { coverflowLayout } from './coverflow-layout';
  let {game,uid,ready,visible,inspect,onDialog,command}:{game:SetupState;uid:string;ready:boolean;visible:boolean;inspect:(id:string)=>void;onDialog:(open:boolean)=>void;command:(command:GameCommand)=>Promise<void>}=$props();
  const piles=$derived(setupSupply(game.playerCount).slice().sort((a,b)=>(definition(a.id).cost??0)-(definition(b.id).cost??0)||a.id.localeCompare(b.id)));
  const affordable=$derived(piles.findLastIndex(pile=>!purchaseReason(game,uid,pile.id)));
  let target=$state(untrack(()=>Math.max(0,affordable))),position=$state(untrack(()=>target));
  let width=$state(600),height=$state(200),navHeight=$state(44),reduced=$state(true),dragged=false,dragging=$state(false);
  const cardWidth=$derived(Math.max(28,Math.min((height-navHeight-2)/1.4,(width-32)/3.8)));
  const layout=$derived(coverflowLayout(piles.length,position,width,cardWidth));
  const centered=$derived(piles[Math.round(target)]);
  const playable=$derived(game.decks[uid].hand.filter(card=>canPlayAction(game,uid,card.id)));
  let notice=$state(''),pending=$state(''),warning=$state<HTMLDialogElement>();
  const reason=$derived(notice||purchaseReason(game,uid,centered.id)||(affordable>=0?`Affordable through ${definition(piles[affordable].id).name}`:''));
  const moving=$derived(position!==target || dragging);
  $effect(()=>{if(affordable>=0){target=affordable;notice='';}});
  $effect(()=>{
    const end=target, snap=reduced||!visible;
    if(dragging)return;
    if(snap){position=end;return;}
    let frame=0,last=performance.now();
    function animate(now:number){const elapsed=Math.min(50,now-last);last=now;const distance=end-position;position=Math.abs(distance)<.0005?end:position+distance*(1-Math.exp(-elapsed/104));if(position!==end)frame=requestAnimationFrame(animate);}
    frame=requestAnimationFrame(animate);return()=>cancelAnimationFrame(frame);
  });
  onMount(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)'),update=()=>{reduced=media.matches;};update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);});
  function move(index:number){target=Math.max(0,Math.min(piles.length-1,index));notice='';}
  async function buy(id:string){
    if(!ready)return;
    const blocked=purchaseReason(game,uid,id);if(blocked){notice=blocked;return;}
    if(playable.length){pending=id;onDialog(true);await tick();warning!.showModal();return;}
    await command({type:'card/bought',cardId:id});
  }
  function dismiss(){warning?.close();pending='';onDialog(false);}
  async function confirm(){const id=pending;dismiss();if(ready&&!purchaseReason(game,uid,id))await command({type:'card/bought',cardId:id});}
  function activate(index:number){if(dragged)return;if(moving||index!==Math.round(target)){move(index);return;}void buy(piles[index].id);}
  let pointer:number|undefined,startX=0,startPosition=0,lastWheel=0;
  function down(event:PointerEvent){if(event.button!==0)return;pointer=event.pointerId;startX=event.clientX;startPosition=position;dragged=false;((event.target as HTMLElement).closest('button')??event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);}
  function drag(event:PointerEvent){if(event.pointerId!==pointer)return;const delta=event.clientX-startX;if(Math.abs(delta)>10)dragged=true;if(dragged){dragging=true;position=Math.max(0,Math.min(piles.length-1,startPosition-delta/(cardWidth*1.055)));target=position;}}
  function up(event:PointerEvent){if(event.pointerId!==pointer)return;pointer=undefined;dragging=false;move(Math.round(position));}
  function wheel(event:WheelEvent){event.preventDefault();if(Math.abs(event.deltaX)+Math.abs(event.deltaY)<4||performance.now()-lastWheel<110)return;lastWheel=performance.now();move(Math.round(target)+Math.sign(event.deltaX||event.deltaY));}
  function key(event:KeyboardEvent){dragged=false;if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();move(event.key==='Home'?0:event.key==='End'?piles.length-1:Math.round(target)+(event.key==='ArrowRight'?1:-1));}
</script>
<section class="supply-coverflow" aria-label="Supply" aria-busy={moving} bind:clientWidth={width} bind:clientHeight={height} style={`--card-width:${cardWidth}px;--nav-height:${navHeight}px`}>
  <section class="coverflow" aria-label="Supply piles" onwheel={wheel} onpointerdown={down} onpointermove={drag} onpointerup={up} onpointercancel={up}>
    {#each piles as pile,index (pile.id)}
      <div class="supply-face" class:unavailable={!!purchaseReason(game,uid,pile.id)} style:transform={layout[index].transform} style:z-index={layout[index].z}><CardFace card={definition(pile.id)} players={game.playerCount}/></div>
      <button class="buy-card" aria-describedby="supply-help" data-supply-id={pile.id} data-centered={index===Math.round(target)} data-public-zone="supply" data-public-card={pile.id} aria-label={`${index===Math.round(target)?'Buy':'Center'} ${definition(pile.id).name}`} aria-disabled={index===Math.round(target)&&(!ready||!!purchaseReason(game,uid,pile.id))} style:left={`${layout[index].hitLeft}px`} style:width={`${layout[index].hitWidth}px`} style:z-index={1100+index} onkeydown={key} use:cardGesture={{activate:()=>activate(index),inspect:()=>inspect(pile.id)}}></button>
    {/each}
  </section>
  <nav aria-label="Browse supply" bind:clientHeight={navHeight}><button aria-label="Cheaper cards" disabled={target<=0} onclick={()=>move(Math.round(target)-1)}>‹</button><div class="supply-caption"><span>{definition(centered.id).name} · {definition(centered.id).cost} Coins</span><span class="stock" aria-label={`${definition(centered.id).name}: ${game.supply[centered.id]} remaining`}>{game.supply[centered.id]} left</span></div><button aria-label="More expensive cards" disabled={target>=piles.length-1} onclick={()=>move(Math.round(target)+1)}>›</button></nav>
  <span id="supply-help" class="sr-only">Scroll or drag to browse. Tap a side card to center it; tap the center card to buy. Right-click, hold, or press Shift+F10 to inspect.</span>
  <p class="reason sr-only" aria-live="polite">{reason}</p>
</section>
<dialog bind:this={warning} class="warning framed-dialog" aria-label="Skip playable Actions?" oncancel={event=>{event.preventDefault();dismiss();}} data-e2e-layout>
  <DialogFrame/><h2>Skip playable Actions?</h2><p>You can still play {playable.map(card=>definition(card.cardId).name).join(', ')}.</p><GameButton primary onclick={confirm} disabled={!ready}>Buy {pending?definition(pending).name:''} now</GameButton><GameButton onclick={dismiss}>Keep playing</GameButton>
</dialog>
<style>
  .supply-coverflow{width:100%;height:100%;position:relative;color:#f4dfb2;isolation:isolate;}
  .coverflow{position:absolute;inset:0 0 var(--nav-height);perspective:1400px;touch-action:pan-y;user-select:none;}
  .supply-face{position:absolute;top:0;left:calc(50% - var(--card-width)/2);width:var(--card-width);pointer-events:none;will-change:transform;backface-visibility:hidden;filter:drop-shadow(0 3px 3px #0009);}
  .unavailable{filter:saturate(.7) brightness(.83) drop-shadow(0 3px 3px #0009);}
  .buy-card{position:absolute;top:calc(var(--card-width)*.18);height:calc(var(--card-width)*1.02);border:0;padding:0;background:none;cursor:pointer;min-width:0;}
  .supply-coverflow:has(.buy-card:hover) .buy-card:focus-visible{outline:none;}
  .buy-card:focus-visible{outline:2px solid #ffdc84;outline-offset:0;}
  .supply-coverflow:has(.buy-card[data-centered=true]:hover) .supply-face:has(+ .buy-card[data-centered=true]),.supply-coverflow:not(:has(.buy-card:hover)) .supply-face:has(+ .buy-card:focus-visible){filter:brightness(1.1) drop-shadow(0 0 5px #e6bd6a);}
  nav{position:absolute;bottom:0;left:50%;transform:translateX(-50%);height:clamp(44px,3.4svh,80px);display:flex;align-items:center;gap:8px;max-width:100%;}
  nav button{width:44px;height:44px;flex-shrink:0;border:1px solid #a88746;border-radius:50%;padding:0;background:#071522e8;color:inherit;font-size:28px;cursor:pointer;}nav button:disabled{opacity:.4;cursor:default;}
  .supply-caption{display:flex;flex-direction:column;align-items:center;text-align:center;white-space:nowrap;font-size:clamp(10px,1.25svh,25px);line-height:1.2;}.stock{font-size:.85em;color:#cbb78b;}
  .warning{width:min(520px,92vw);max-height:94svh;border:0;background:#071321;color:#f4dfb2;text-align:center;padding:55px 38px 40px;--control-height:48px;--control-font:22px;}.warning h2{font:600 28px 'Cormorant Garamond',serif;margin:0 0 18px;}.warning p{margin:20px 0;}.warning :global(button){margin-top:10px;}dialog::backdrop{background:#020811bb;}
</style>
