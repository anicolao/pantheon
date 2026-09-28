<script lang="ts">
  import DialogFrame from "$lib/components/DialogFrame.svelte";
  import { tick, onMount } from 'svelte';
  import { base } from '$app/paths';
  import { definition, devotionCards, worshipReason, activePlayer } from '$lib/game/actions';
  import type { SetupState } from '$lib/game/setup';
  import type { GameCommand } from '$lib/backend/setup-repository';
  import CardFace from '../CardFace.svelte';
  import ResourceIcon from '../ResourceIcon.svelte';
  import GameButton from '../GameButton.svelte';
  let { game, uid, selected, ready, status, error, command, retry, close }: { game: SetupState; uid: string; selected: string; ready: boolean; status: string; error: string; command: (command: GameCommand) => Promise<void>; retry: () => void; close: () => void } = $props();
  let dialog = $state<HTMLDialogElement>(), detail = $state<HTMLDialogElement>();
  let inspected = $state<{ id: string; copy: number }>(), page = $state(0);
  let returnFocus: HTMLElement | null = null;
  const event = $derived(definition(selected));
  const actor = $derived(activePlayer(game));
  const contributors = $derived(devotionCards(game, actor, selected));
  const favored = $derived(contributors.length >= 2);
  const reason = $derived(worshipReason(game, uid, selected));
  const pages = $derived(Math.max(1, Math.ceil(contributors.length / 2)));
  const latest = $derived(game.movements.findLast(move => move.kind === 'worship'));
  let seen = 0;
  let face = $state<HTMLButtonElement>();
  onMount(() => { seen = latest?.sequence ?? 0; });
  $effect(() => {
    if (latest && latest.sequence > seen && face) {
      seen = latest.sequence;
      if (latest.source === selected && !matchMedia('(prefers-reduced-motion: reduce)').matches) face.animate([{filter:'drop-shadow(0 0 36px #ffd878)',transform:'translateY(-8px)'},{filter:'drop-shadow(0 0 8px #daa84c)',transform:'translateY(0)'}],{duration:450,easing:'ease-out'});
    }
  });
  $effect(() => { if (dialog && !dialog.open) dialog.showModal(); });
  $effect(() => { if (page >= pages) page = pages - 1; });
  async function inspect(id: string, copy = 1) { returnFocus = document.activeElement as HTMLElement; inspected = { id, copy }; await tick(); detail!.showModal(); }
  async function select(id: string) { selected = id; page = 0; await tick(); face?.focus(); }
</script>

<dialog class="worship-scene" bind:this={dialog} aria-labelledby="worship-title" oncancel={e => { e.preventDefault(); close(); }}>
  <picture class="environment" aria-hidden="true"><source media="(max-aspect-ratio:3/4)" srcset={`${base}/assets/ui/worship-mobile.webp`} /><img src={`${base}/assets/ui/worship-desktop.webp`} alt="" /></picture>
  <div class="altar-content" data-e2e-layout={inspected ? undefined : true}>
    <header><h1 id="worship-title">Worship</h1><p class="favor">{favored ? 'Favored' : 'Standard'}</p><p class="devotion" aria-label={`${contributors.length} Devotion to ${event.god}`}><span aria-hidden="true" class:lit={contributors.length >= 1}>✦</span><span aria-hidden="true" class:lit={favored}>✦</span><strong>{contributors.length}</strong> Devotion</p></header>
    <button class="event-focus" bind:this={face} aria-label={`Read ${event.name}`} onclick={() => inspect(selected)}><CardFace card={event} players={game.playerCount}/></button>
    <p class="active-effect"><strong>{favored ? 'Favored' : 'Standard'}:</strong> {favored ? event.favored : event.effect}</p>
    <svg class="threads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="desktop-thread" class:lit={contributors.length > 0} d="M 50 43 Q 42 50 36 57 M 50 43 Q 58 50 64 57" /><path class="phone-thread" class:lit={contributors.length > 0} d="M 50 40 Q 40 41 34 44 M 50 40 Q 60 41 66 44" /></svg>
    <section class="contributors" aria-label={`Actions contributing Devotion to ${event.god}`}>
      {#each contributors.slice(page * 2, page * 2 + 2) as card}<button aria-label={`Inspect contributing ${definition(card.cardId).name}, copy ${card.copy}`} onclick={() => inspect(card.cardId, card.copy)}><CardFace card={definition(card.cardId)} players={game.playerCount} copy={card.copy}/></button>{/each}
      {#if !contributors.length}<p>No {event.god} Actions in play</p>{/if}
    </section>
    {#if pages > 1}<nav class="contributor-pages" aria-label="Devotion cards"><button disabled={page === 0} onclick={() => page--} aria-label="Previous Devotion cards">‹</button><span>{page + 1} / {pages}</span><button disabled={page + 1 === pages} onclick={() => page++} aria-label="Next Devotion cards">›</button></nav>{/if}
    <nav class="other-gods" aria-label="Shared gods">{#each game.sharedEvents.filter(id => id !== selected) as id}<button aria-label={`Choose ${definition(id).god}`} onclick={() => select(id)}><CardFace card={definition(id)} players={game.playerCount}/></button>{/each}</nav>
    <section class="worship-wallet" aria-label="Turn resources"><img src={`${base}/assets/ui/resource-rail.webp`} alt=""/><ResourceIcon resource="actions" value={game.resources.actions}/><ResourceIcon resource="coins" value={game.resources.coins}/><ResourceIcon resource="buys" value={game.resources.buys}/><ResourceIcon resource="worship" value={game.resources.worship}/></section>
    <div class="payment" aria-label={`Worship costs 1 Worship and ${event.cost} Coins`}><ResourceIcon resource="worship" value={1}/><ResourceIcon resource="coins" value={event.cost!}/></div>
    <div class="worship-submit"><GameButton primary disabled={!ready || !!reason} onclick={() => command({ type:'god/worshipped', cardId:selected })}>Worship {event.god}</GameButton></div>
    <div class="return"><GameButton onclick={close}>Return</GameButton></div>
    {#if reason}<p class="reason" role="status">{reason}</p>{/if}
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    {#if status !== 'synced'}<div class="reconnect"><p>Connection lost. Your place is kept.</p><GameButton onclick={retry}>Try again</GameButton></div>{/if}
  </div>
</dialog>
<dialog class="detail framed-dialog" bind:this={detail} aria-label="Card details" onclose={() => { inspected = undefined; returnFocus?.focus(); }} data-e2e-layout={inspected ? true : undefined}><DialogFrame />
  {#if inspected}<h2>{definition(inspected.id).name}</h2><div class="detail-card" class:landscape={definition(inspected.id).type === 'Event'}><CardFace card={definition(inspected.id)} players={game.playerCount} copy={inspected.copy}/></div><button onclick={() => detail!.close()}>Return to altar</button>{/if}
</dialog>

<style>
  .worship-scene{position:fixed;inset:0;width:100vw;height:100svh;max-width:none;max-height:none;border:0;padding:0;margin:0;background:#071321;color:#f7e1b2;overflow:clip;isolation:isolate;}.environment{position:absolute;inset:0;z-index:-1;}.environment img{width:100%;height:100%;object-fit:cover;}.altar-content{position:relative;width:100%;height:100%;}button{color:inherit;cursor:pointer;}button:focus-visible{outline:3px solid #ffdb82;outline-offset:4px;}button:disabled{opacity:.5;cursor:default;}
  header{position:absolute;top:1%;left:30%;width:40%;text-align:center;text-shadow:0 2px 5px #000;}h1{font:600 clamp(34px,5.4svh,110px)/1 'Cormorant Garamond',serif;margin:0;}.favor{font:600 clamp(20px,2.7svh,54px)/1.1 'Cormorant Garamond',serif;margin:5px 0;}.devotion{display:flex;justify-content:center;align-items:center;gap:.6em;font-size:clamp(14px,1.8svh,34px);margin:6px 0;}.devotion span{color:#616064;}.devotion .lit{color:#ffdc7d;text-shadow:0 0 14px #ffac35;}.event-focus{position:absolute;left:calc(50% - min(14vw,18svh));width:min(28vw,36svh);top:17%;border:0;padding:0;background:none;filter:drop-shadow(0 0 8px #daa84c);}.active-effect{z-index:1;position:absolute;left:31%;width:38%;top:44%;text-align:center;margin:0;font:500 clamp(15px,2.1svh,42px)/1.15 'Cormorant Garamond',serif;text-shadow:0 2px 3px #000;background:#071321d9;border-radius:8px;padding:6px 10px;}.threads{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;}.phone-thread{display:none;}.threads path{fill:none;stroke:transparent;stroke-width:.12;}.threads path.lit{stroke:#8ad3ff;filter:drop-shadow(0 0 3px #6ea9ff);}.contributors{position:absolute;left:31%;width:38%;top:56%;height:25%;display:flex;gap:9%;justify-content:center;align-items:center;}.contributors button{height:100%;aspect-ratio:5/7;background:none;padding:0;border:0;filter:drop-shadow(0 0 8px #69a6e7);}.contributors p{font:500 clamp(20px,2.8svh,54px) 'Cormorant Garamond',serif;background:#071321bb;padding:12px;border-radius:8px;text-align:center;}.contributor-pages{position:absolute;left:36%;width:28%;top:82%;display:flex;align-items:center;justify-content:center;gap:16px;font-size:clamp(14px,1.8svh,32px);}.contributor-pages button{width:44px;height:44px;background:#071321;border:1px solid #cba363;border-radius:50%;}.other-gods{position:absolute;left:76%;width:19%;top:24%;height:54%;display:flex;flex-direction:column;justify-content:center;gap:12px;}.other-gods button{width:min(100%,29svh);align-self:center;background:none;border:0;padding:0;filter:drop-shadow(2px 5px 3px #000);}
  .worship-wallet{position:absolute;left:5%;bottom:4%;width:43%;height:9%;display:flex;align-items:center;justify-content:space-evenly;padding:0 3%;isolation:isolate;--icon-size:clamp(24px,3.2svh,70px);--icon-number-scale:.8;}.worship-wallet>img{position:absolute;inset:0;width:100%;height:100%;z-index:-1;}.payment{position:absolute;left:65%;bottom:13%;width:14%;display:flex;justify-content:center;gap:20px;--icon-size:clamp(22px,2.7svh,60px);}.worship-submit{position:absolute;left:51%;width:28%;bottom:4%;--control-height:clamp(48px,8svh,160px);--control-font:clamp(24px,3svh,62px);}.return{position:absolute;left:81%;width:16%;bottom:4%;--control-height:clamp(48px,7svh,150px);--control-font:clamp(22px,2.8svh,54px);}.reason,.error{position:absolute;left:5%;width:43%;bottom:14%;text-align:center;margin:0;padding:8px;background:#071321dd;border-radius:8px;font-size:clamp(14px,1.8svh,34px);}.error{bottom:20%;background:#552b20;}.reconnect{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;background:#071321ed;gap:24px;z-index:4;}.reconnect p{font-size:clamp(20px,3svh,50px);}.reconnect :global(button){width:min(70vw,480px);}
  .detail{max-height:96svh;width:min(800px,94vw);background:#071321;color:#f7e1b2;border:2px solid #ba9552;border-radius:16px;text-align:center;padding:20px;}.detail::backdrop{background:#020811cc;}.detail h2{font:600 28px 'Cormorant Garamond',serif;margin:0 0 16px;}.detail-card{width:min(290px,40svh);margin:auto;}.detail-card.landscape{width:min(100%,85svh);}.detail>button{min-height:44px;margin:18px 0 0;padding:10px 24px;background:#153146;border:1px solid #ba9552;border-radius:8px;}
  @media(max-aspect-ratio:3/4){header{top:1%;left:10%;width:80%;}h1{font-size:34px;}.favor{font-size:22px;margin:2px 0;}.devotion{font-size:14px;margin:3px 0;}.event-focus{top:14%;left:calc(50% - min(34vw,14svh));width:min(68vw,28svh);}.active-effect{left:5%;width:90%;top:35%;font-size:16px;line-height:1.05;padding:6px;}.contributors{top:44%;left:12%;width:76%;height:19%;gap:10%;}.contributors p{font-size:22px;}.desktop-thread{display:none;}.phone-thread{display:block;}.other-gods{left:4%;width:92%;top:66%;height:10%;flex-direction:row;gap:2%;}.other-gods button{width:30%;}.altar-content:has(.contributor-pages) .other-gods{top:69%;height:6%;}.altar-content:has(.contributor-pages) .other-gods button{width:min(29%,9svh);}.contributor-pages{top:63%;left:24%;width:52%;height:44px;font-size:13px;}.worship-wallet{left:5%;width:90%;bottom:15%;height:7%;--icon-size:25px;padding:0 5%;}.payment{left:5%;width:90%;bottom:12%;gap:12px;--icon-size:18px;}.worship-submit{left:12%;width:76%;bottom:6%;--control-height:48px;--control-font:25px;}.return{left:22%;width:56%;bottom:.5%;--control-height:44px;--control-font:22px;}.reason{left:5%;width:90%;bottom:22%;font-size:12px;padding:3px;}.error{left:5%;width:90%;bottom:25%;font-size:12px;}.detail-card.landscape{width:100%;}.detail h2{font-size:24px;}}
</style>
