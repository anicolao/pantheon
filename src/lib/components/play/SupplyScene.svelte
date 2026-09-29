<script lang="ts">
  import DialogFrame from '$lib/components/DialogFrame.svelte';
  import { onMount, tick } from 'svelte';
  import { flip } from 'svelte/animate';
  import { base } from '$app/paths';
  import { definition, purchaseReason, activePlayer, canPlayAction } from '$lib/game/actions';
  import { setupSupply, type SetupState } from '$lib/game/setup';
  import type { GameCommand } from '$lib/backend/setup-repository';
  import { cardGesture } from './card-gesture';
  import CardFace from '../CardFace.svelte';
  import ResourceIcon from '../ResourceIcon.svelte';
  import GameButton from '../GameButton.svelte';
  import Portrait from './Portrait.svelte';
  let { game, uid, ready, status, error, command, retry, close }: { game: SetupState; uid: string; ready: boolean; status: string; error: string; command: (command: GameCommand) => Promise<void>; retry: () => void; close: () => void } = $props();
  let dialog = $state<HTMLDialogElement>(), detail = $state<HTMLDialogElement>(), warning = $state<HTMLDialogElement>();
  let end = $state(0), faceCount = $state(3), selected = $state('obol'), pending = $state(''), notice = $state('');
  let pointerX = 0, dragged = false, lastWheel = 0;
  let reduced = $state(true);
  const piles = $derived(setupSupply(game.playerCount).slice().sort((a,b)=>(definition(a.id).cost??0)-(definition(b.id).cost??0)||a.id.localeCompare(b.id)));
  const affordableEnd = $derived(piles.findLastIndex(pile=>!purchaseReason(game,uid,pile.id)));
  const first = $derived(Math.max(0,end-faceCount+1));
  const slots = $derived([first-1,...Array.from({length:end-first+1},(_,i)=>first+i),end+1]);
  const card = $derived(definition(selected));
  const playable = $derived(game.decks[uid].hand.filter(instance=>canPlayAction(game,uid,instance.id)));
  $effect(()=>{if(affordableEnd>=0)end=affordableEnd;});
  onMount(()=>{
    dialog!.showModal();
    const resize=()=>{faceCount=matchMedia('(max-aspect-ratio:3/4)').matches?2:innerWidth>=1800?4:3;};
    const media=matchMedia('(prefers-reduced-motion: reduce)'),motion=()=>{reduced=media.matches;};
    motion();media.addEventListener('change',motion);resize();window.addEventListener('resize',resize);return()=>{window.removeEventListener('resize',resize);media.removeEventListener('change',motion);};
  });
  function browse(delta:number){end=Math.max(0,Math.min(piles.length-1,end+delta));notice='';}
  async function inspect(id:string){selected=id;await tick();detail!.showModal();}
  async function buy(id:string){
    if(dragged||!ready)return;
    const reason=purchaseReason(game,uid,id);if(reason){notice=reason;return;}
    if(playable.length){pending=id;await tick();warning!.showModal();return;}
    await command({type:'card/bought',cardId:id});
  }
  async function confirmBuy(){const id=pending;warning!.close();pending='';if(ready&&!purchaseReason(game,uid,id))await command({type:'card/bought',cardId:id});}
</script>
<dialog bind:this={dialog} class="supply-scene" aria-label="Supply" oncancel={event=>{event.preventDefault();close();}} data-e2e-layout>
  <picture class="environment" aria-hidden="true"><source media="(max-aspect-ratio:3/4)" srcset={`${base}/assets/ui/table-mobile.webp`} /><img src={`${base}/assets/ui/table-desktop.webp`} alt="" /></picture>
  <button class="back" onclick={close}>‹ Table</button>
  <div class="player"><Portrait leader={game.leaders[uid]} name={game.players.find(player=>player.uid===uid)!.name} active={activePlayer(game)===uid}/></div>
  <h1>Supply</h1>
  <div class="wallet" aria-label="Available resources"><ResourceIcon resource="coins" value={game.resources.coins}/><ResourceIcon resource="buys" value={game.resources.buys}/></div>
  <p class="hint">Cheapest to most expensive · Tap a card to buy</p>
  <section class="coverflow supply-piles" aria-label="Supply piles" onwheel={event=>{event.preventDefault();if(Math.abs(event.deltaX)+Math.abs(event.deltaY)<5||performance.now()-lastWheel<180)return;lastWheel=performance.now();browse(Math.sign(event.deltaX||event.deltaY));}} onpointerdown={event=>{pointerX=event.clientX;dragged=false;}} onpointermove={event=>{if(event.buttons&&Math.abs(event.clientX-pointerX)>10)dragged=true;}} onpointerup={event=>{const distance=event.clientX-pointerX;if(Math.abs(distance)>30){dragged=true;browse(distance<0?1:-1);}}}>
    {#each slots as index (piles[index]?.id??`empty-${index}`)}
      {@const pile=piles[index]}
      {@const side=index<first?'left':index>end?'right':''}
      <div class="slot" animate:flip={{duration:reduced?0:220}} class:wing={!!side} class:left={side==='left'} class:right={side==='right'}>
        {#if pile}
          {@const item=definition(pile.id)}
          {@const reason=purchaseReason(game,uid,pile.id)}
          <button class="buy-card" onkeydown={()=>{dragged=false;}} class:unavailable={!!reason} onfocus={()=>{if(reason)notice=reason;}} aria-label={`Buy ${item.name}`} aria-disabled={!ready||!!reason} title={reason||`Buy ${item.name} for ${item.cost} Coins`} use:cardGesture={{activate:()=>buy(pile.id),inspect:()=>inspect(pile.id)}}><div class="face"><CardFace card={item} players={game.playerCount}/></div></button>
          <span class="stock" aria-label={`${item.name}: ${game.supply[pile.id]} remaining`}>{game.supply[pile.id]} left</span>
        {/if}
      </div>
    {/each}
  </section>
  <nav class="browse" aria-label="Browse supply"><button disabled={end===0} onclick={()=>browse(-1)} aria-label="Cheaper cards">‹</button><span>{definition(piles[first].id).cost}–{definition(piles[end].id).cost} Coins</span><button disabled={end===piles.length-1} onclick={()=>browse(1)} aria-label="More expensive cards">›</button></nav>
  <p class="reason" role="status">{notice||(affordableEnd>=0?`Affordable through ${definition(piles[affordableEnd].id).name}`:purchaseReason(game,uid,piles[0].id))}</p>
  <p class="help">Swipe or scroll to browse. Right-click or hold to read a card.</p>
  <div class="destination"><ResourceIcon resource="discard"/><span>Your discard · {game.decks[uid].discard.length}</span></div>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  {#if status !== 'synced'}<div class="connection" role="status"><p>Connection lost. Your place is kept.</p><GameButton onclick={retry}>Try again</GameButton></div>{/if}
</dialog>
<dialog bind:this={detail} class="detail framed-dialog" aria-label={card.name} data-e2e-layout><DialogFrame/><h2>{card.name}</h2><div class="inspected"><CardFace {card} players={game.playerCount}/></div><GameButton onclick={()=>detail!.close()}>Back to supply</GameButton></dialog>
<dialog bind:this={warning} class="warning framed-dialog" aria-label="Skip playable Actions?" data-e2e-layout><DialogFrame/><h2>Skip playable Actions?</h2><p>You can still play {playable.map(instance=>definition(instance.cardId).name).join(', ')}. Buying ends your Action and Treasure phases.</p><GameButton primary onclick={confirmBuy}>Buy {pending?definition(pending).name:''} now</GameButton><GameButton onclick={()=>warning!.close()}>Keep playing</GameButton></dialog>
<style>
  dialog{color:#f5dfaf;}button{color:inherit;cursor:pointer;}button:focus-visible{outline:3px solid #ffdc84;outline-offset:3px;}button:disabled{opacity:.4;cursor:default;}.supply-scene{position:fixed;inset:0;width:100vw;height:100svh;max-width:none;max-height:none;margin:0;padding:0;border:0;background:#071321;overflow:hidden;isolation:isolate;}.environment{position:absolute;inset:0;z-index:-1;}.environment img{width:100%;height:100%;object-fit:cover;}.back{position:absolute;top:2%;left:2%;min-height:44px;padding:8px 18px;border:1px solid #bc9956;background:#071321dd;border-radius:18px;font-size:clamp(16px,2svh,36px);}.player{position:absolute;top:2%;right:4%;width:12%;max-width:16svh;}h1{margin:3svh auto 0;text-align:center;font:600 clamp(30px,5svh,100px)/1 'Cormorant Garamond',serif;}.wallet{position:absolute;left:4%;top:12%;display:flex;gap:24px;--icon-size:clamp(24px,3svh,64px);}.hint{position:absolute;top:15%;width:100%;margin:0;text-align:center;font-size:clamp(14px,1.8svh,34px);}.coverflow{--card-width:min(18vw,26svh,440px);position:absolute;inset:24% 2% auto;display:flex;justify-content:center;align-items:center;gap:1vw;touch-action:pan-y;}.slot{width:var(--card-width);flex-shrink:0;text-align:center;}.slot.wing{width:calc(var(--card-width)*.5);}.buy-card{display:block;width:100%;aspect-ratio:5/7;border:0;padding:0;background:none;position:relative;}.face{width:var(--card-width);pointer-events:none;}.wing .face{transform-origin:50% 0;position:absolute;left:50%;top:0;transform:translateX(-50%) rotateY(55deg) scale(.8);}.right .face{transform:translateX(-50%) rotateY(-55deg) scale(.8);}.wing .buy-card{height:calc(var(--card-width)*1.12);aspect-ratio:auto;}.buy-card:hover .face,.buy-card:focus-visible .face{filter:brightness(1.12) drop-shadow(0 0 8px #ffd578);}.unavailable .face{opacity:.62;}.stock{display:block;margin-top:12px;font-size:clamp(13px,1.8svh,32px);background:#071321d9;border-radius:8px;}.browse{position:absolute;top:72%;left:15%;width:70%;display:flex;align-items:center;justify-content:center;gap:24px;font-size:clamp(16px,2.4svh,42px);}.browse button{min-width:44px;min-height:44px;border:1px solid #b99b56;background:#071321e8;border-radius:50%;font-size:clamp(28px,4svh,60px);}.reason,.help{position:absolute;left:5%;width:90%;text-align:center;margin:0;font-size:clamp(14px,1.8svh,32px);}.reason{top:82%;}.help{top:88%;}.destination{position:absolute;bottom:2%;left:20%;width:60%;display:flex;justify-content:center;align-items:center;gap:12px;--icon-size:clamp(20px,2.6svh,48px);font-size:clamp(14px,1.8svh,32px);}.error{position:absolute;top:19%;left:5%;width:90%;margin:0;background:#552b20;text-align:center;}.connection{position:absolute;left:25%;top:40%;width:50%;background:#071321fa;border:2px solid #c9a357;border-radius:16px;padding:24px;text-align:center;}.detail,.warning{width:min(520px,92vw);max-height:94svh;border:0;background:#071321;text-align:center;padding:28px;--control-height:50px;--control-font:22px;}.inspected{width:min(100%,50vw,34svh);margin:0 auto 24px;}.detail h2,.warning h2{margin:0 0 18px;font:600 28px 'Cormorant Garamond',serif;}.warning p{margin:20px 0;}.warning :global(button){margin-top:14px;}dialog::backdrop{background:#020811cc;}.help{color:#e0cbaa;}
  @media(max-aspect-ratio:3/4){.back{top:1%;left:3%;font-size:13px;padding:6px 10px;}.player{top:1%;width:17%;}h1{margin-top:3svh;font-size:30px;}.wallet{top:11%;left:8%;--icon-size:25px;}.hint{top:19%;font-size:13px;padding:0 8%;}.coverflow{top:30%;--card-width:min(30vw,28svh);gap:1vw;}.stock{font-size:12px;margin-top:10px;}.browse{top:65%;gap:24px;font-size:18px;}.reason{top:76%;font-size:14px;}.help{top:83%;font-size:13px;}.destination{bottom:3%;font-size:14px;--icon-size:22px;}.connection{left:5%;width:90%;padding:18px;}}
</style>
