<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { fly } from 'svelte/transition';
  import { base } from '$app/paths';
  import { cards } from '$lib/game/cards';
  import { leaderIds, leaderLinks, setupSupply, type SetupState } from '$lib/game/setup';
  import type { DraftCommand } from '$lib/backend/setup-repository';
  import type { CardDefinition } from '$lib/game/types';
  import CardFace from '../CardFace.svelte';
  import ResourceIcon from '../ResourceIcon.svelte';
  import GameButton from '../GameButton.svelte';
  import Portrait from './Portrait.svelte';

  let { game, uid, roomId, status, busy, error, command, retry }: {
    game: SetupState; uid: string; roomId: string; status: string; busy: boolean; error: string;
    command: (command: DraftCommand) => Promise<void>; retry: () => void;
  } = $props();
  const initialRevision = untrack(() => game.activity.length);
  let selected = $state<string>('thaleia');
  let reduced = $state(true);
  let inspected = $state<{ card: CardDefinition; copy: number } | null>(null);
  let modal = $state<'card' | 'supply' | 'chronicle' | ''>('');
  let supplyPage = $state(0);
  let dialog = $state<HTMLDialogElement>();
  let opener: HTMLElement | null = null;
  const links = $derived(leaderLinks(selected));
  const chooser = $derived(game.draftOrder[Object.keys(game.leaders).length]);
  const isChoice = $derived(chooser === uid && game.phase === 'draft');
  const nameOf = (id: string) => game.players.find(player => player.uid === id)!.name;
  const ownerOf = (leader: string) => Object.entries(game.leaders).find(([, value]) => value === leader)?.[0];
  const own = $derived(game.decks[uid]);
  const opponents = $derived(game.turnOrder.filter(id => id !== uid));
  const supply = $derived(setupSupply(game.playerCount));
  const ready = $derived(status === 'synced' && !busy);
  $effect(() => { if (ownerOf(selected) && game.phase === 'draft') selected = leaderIds.find(id => !ownerOf(id)) ?? selected; });
  onMount(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { reduced = media.matches; }; update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  });
  function arrive(node: Element) { return reduced ? { duration: 0 } : fly(node, { y: 24, duration: 450 }); }
  function claimFlight(node: Element, leader: string | undefined) {
    if (typeof leader !== 'string' || reduced || game.activity.length <= initialRevision) return { duration: 0 };
    const source = document.querySelector(`[data-leader-choice="${leader}"]`)!.getBoundingClientRect();
    const target = node.getBoundingClientRect();
    return fly(node, { x: source.left + source.width / 2 - target.left - target.width / 2, y: source.top + source.height / 2 - target.top - target.height / 2, duration: 450 });
  }
  function deal(node: Element, index: number) {
    if (reduced || !game.dealtAtSequence || game.dealtAtSequence <= initialRevision) return { duration: 0 };
    const source = document.querySelector('.deck-pile')!.getBoundingClientRect(), target = node.getBoundingClientRect();
    return fly(node, { x: source.left - target.left, y: source.top - target.top, duration: 550, delay: index * 85 });
  }
  function dealBack(node: Element, index: number) {
    return reduced || !game.dealtAtSequence || game.dealtAtSequence <= initialRevision ? { duration: 0 } : fly(node, { y: 40, duration: 550, delay: index * 85 });
  }
  async function open(kind: 'card' | 'supply' | 'chronicle') { opener = document.activeElement as HTMLElement; modal = kind; await tick(); dialog!.showModal(); }
  function inspect(id: string, copy = 1) { inspected = { card: cards.find(card => card.id === id)!, copy }; void open('card'); }
  function close() { dialog!.close(); modal = ''; opener?.focus(); }
  function choose() { if (isChoice && ready && !ownerOf(selected)) void command({ type: 'leader/chosen', leaderId: selected }); }
</script>

<main class="session" class:drafting={game.phase === 'draft'} data-status={status}>
  <picture class="environment" aria-hidden="true"><source media="(max-aspect-ratio:3/4)" srcset={`${base}/assets/ui/table-mobile.webp`} /><img src={`${base}/assets/ui/table-desktop.webp`} alt="" draggable="false" /></picture>
  <div class="composition" data-e2e-layout={modal ? undefined : true}>
    <header><a href={`${base}/`} aria-label="Back to sanctuary">‹ Sanctuary</a>{#if /^[A-Z]{4,5}$/.test(roomId)}<span>Game code <strong>{roomId}</strong></span>{:else}<span>{game.playerCount} players</span>{/if}</header>
    {#if game.phase === 'draft'}
      <div class="draft-title"><h1>Choose your<br />Bloodline</h1><p aria-live="polite">{isChoice ? 'Your choice' : `${nameOf(chooser)} chooses`}</p></div>
      {#key selected}<img class="hero" src={`${base}/assets/ui/hero-${selected}.webp`} alt="" draggable="false" in:arrive />{/key}
      <button class="draft-card leader-card" aria-label={`Inspect ${links.leader.name}`} onclick={() => inspect(links.leader.id)}><CardFace card={links.leader} players={game.playerCount} /></button>
      <button class="draft-card temple-card" aria-label={`Inspect ${links.temple.name}`} onclick={() => inspect(links.temple.id)}><CardFace card={links.temple} players={game.playerCount} /></button>
      <button class="draft-card event-card" aria-label={`Inspect ${links.event.name}`} onclick={() => inspect(links.event.id)}><CardFace card={links.event} players={game.playerCount} /></button>
      <nav class="leaders" aria-label="Bloodlines">
        {#each leaderIds as id}
          <button data-leader-choice={id} class:taken={!!ownerOf(id)} aria-label={`View ${leaderLinks(id).leader.name.split(',')[0]}${ownerOf(id) ? `, chosen by ${nameOf(ownerOf(id)!)}` : ''}`} aria-pressed={selected === id} onclick={() => selected = id} disabled={!!ownerOf(id)}>
            <Portrait leader={id} name={leaderLinks(id).leader.name.split(',')[0]} active={selected === id} />
            {#if ownerOf(id)}<span class="taken-by">{nameOf(ownerOf(id)!)}</span>{/if}
          </button>
        {/each}
      </nav>
      <section class="draft-order" class:many={game.playerCount > 2} aria-label="Draft order"><h2>Draft order</h2>
        {#each game.draftOrder as id, index (id + (game.leaders[id] ?? ''))}
          <div class:current={id === chooser} data-testid="draft-seat" data-uid={id} data-choosing={id === chooser} in:claimFlight={game.leaders[id]}>
            <div class="order-portrait"><Portrait leader={game.leaders[id] ?? leaderIds[game.players.findIndex(player => player.uid === id)]} name={nameOf(id)} active={id === chooser} /></div>
            <p><span class="order-index">{index + 1}. </span>{nameOf(id)}{id === game.turnOrder[0] ? ' · First player' : ''}{game.leaders[id] ? ' ✓' : ''}</p>
          </div>
        {/each}
      </section>
      <div class="choose">{#if isChoice}<GameButton primary onclick={choose} disabled={!ready || !!ownerOf(selected)}>{busy ? 'Choosing…' : `Choose ${links.leader.name.split(',')[0]}`}</GameButton>{:else}<p role="status">Waiting for {nameOf(chooser)}</p>{/if}</div>
    {:else if own}
      <section class="opponents" aria-label="Other players">
        {#each opponents as id}
          <div class="opponent" data-testid="opponent" class:first={id === game.turnOrder[0]}>
            <div class="opponent-portrait"><Portrait leader={game.leaders[id]} name={nameOf(id)} active={id === game.turnOrder[0]} /></div>
            <div class="hidden-hand" aria-label={`${nameOf(id)} has ${game.decks[id].hand.length} cards in hand`}>
              {#each game.decks[id].hand as _, index}<img src={`${base}/assets/backs/back-deck.webp`} alt="Card back" style:--index={index} draggable="false" in:dealBack|global={index} />{/each}
            </div>
            <p>{id === game.turnOrder[0] ? 'First player · ' : ''}Deck {game.decks[id].deck.length} · Discard {game.decks[id].discard.length}</p>
          </div>
        {/each}
      </section>
      <section class="basic-supply" aria-label="Basic supply">
        {#each supply.slice(0, 6) as pile}
          <button aria-label={`Inspect ${cards.find(card => card.id === pile.id)!.name}, ${pile.count} remaining`} onclick={() => inspect(pile.id)}><CardFace card={cards.find(card => card.id === pile.id)!} players={game.playerCount} /><span class="stock">{pile.count}</span></button>
        {/each}
      </section>
      <section class="altars" aria-label="Shared god events" class:four={game.sharedEvents.length > 2}>
        {#each game.sharedEvents as id, index}<button style:--altar-index={index} aria-label={`Inspect ${cards.find(card => card.id === id)!.name}`} onclick={() => inspect(id)} in:arrive><CardFace card={cards.find(card => card.id === id)!} players={game.playerCount} /></button>{/each}
      </section>
      <div class="play-area" aria-label="Your play area"><span>Your play area</span></div>
      <div class="supply-control"><GameButton onclick={() => open('supply')}>Supply</GameButton></div>
      <div class="chronicle-control"><GameButton onclick={() => open('chronicle')}>Chronicle</GameButton></div>
      <section class="turn-rail" aria-label="Turn resources"><img class="rail-frame" src={`${base}/assets/ui/resource-rail.webp`} alt="" aria-hidden="true" /><div class="turn-marker" class:long={nameOf(game.turnOrder[0]).length > 12 && game.turnOrder[0] !== uid}><strong>{game.turnOrder[0] === uid ? 'Your turn' : `${nameOf(game.turnOrder[0])}’s turn`}</strong><span>Actions · Turn 1</span></div>
        <div class="resources"><ResourceIcon resource="actions" value={game.resources.actions} /><ResourceIcon resource="coins" value={game.resources.coins} /><ResourceIcon resource="buys" value={game.resources.buys} /><ResourceIcon resource="worship" value={game.resources.worship} /></div>
      </section>
      <section class="hand" aria-label="Your hand">
        {#each own.hand as card, index (card.id)}<div class="hand-slot" style:--card-index={index} in:deal|global={index}><div class="hand-face"><CardFace card={cards.find(item => item.id === card.cardId)!} players={game.playerCount} copy={card.copy} /></div></div><button data-testid="hand-card" aria-label={`Inspect hand card ${index + 1}: ${cards.find(item => item.id === card.cardId)!.name}`} style:--card-index={index} onclick={() => inspect(card.cardId, card.copy)}></button>{/each}
      </section>
      <button class="own-leader" aria-label={`Inspect your leader, ${leaderLinks(game.leaders[uid]).leader.name}`} onclick={() => inspect(game.leaders[uid])}><div class="leader-face"><CardFace card={leaderLinks(game.leaders[uid]).leader} players={game.playerCount} /></div><div class="leader-portrait"><Portrait leader={game.leaders[uid]} name={leaderLinks(game.leaders[uid]).leader.name.split(',')[0]} active={uid === game.turnOrder[0]} /></div></button>
      <div class="deck-pile" aria-label={`Your deck: ${own.deck.length} cards`}><img src={`${base}/assets/backs/back-deck.webp`} alt="Your face-down deck" /><span class="stock">{own.deck.length}</span></div>
      <div class="discard-pile" aria-label="Your discard pile: 0 cards"><img src={`${base}/assets/icons/discard-v2.webp`} alt="" /><span>Discard · 0</span></div>
    {/if}
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    {#if status !== 'synced'}<div class="connection" role="status"><p>Connection lost. Your place is kept.</p><GameButton onclick={retry}>Try again</GameButton></div>{/if}
  </div>
</main>
<dialog bind:this={dialog} oncancel={event => { event.preventDefault(); close(); }} aria-labelledby="session-dialog-title" data-e2e-layout={modal ? true : undefined} class:inspection={modal === 'card'}>
  <button class="close" aria-label="Close" onclick={close}>×</button>
  {#if modal === 'card' && inspected}<h2 id="session-dialog-title">{inspected.card.name}</h2><div class="inspected" class:landscape={inspected.card.type === 'Leader' || inspected.card.type === 'Event'}><CardFace card={inspected.card} players={game.playerCount} copy={inspected.copy} /></div>
  {:else if modal === 'supply'}<h2 id="session-dialog-title">Supply · {game.playerCount} players</h2><div class="supply-piles">{#each supply.slice(supplyPage * 6, supplyPage * 6 + 6) as pile}<button aria-label={`Inspect ${cards.find(card => card.id === pile.id)!.name}, ${pile.count} remaining`} onclick={() => { inspected = { card: cards.find(card => card.id === pile.id)!, copy: 1 }; modal = 'card'; }}><CardFace card={cards.find(card => card.id === pile.id)!} players={game.playerCount} /><span class="stock">{pile.count}</span></button>{/each}</div><nav class="supply-pages" aria-label="Supply pages">{#each ['Basics', 'Actions 1', 'Actions 2'] as label, index}<button aria-pressed={supplyPage === index} onclick={() => supplyPage = index}>{label}</button>{/each}</nav>
  {:else if modal === 'chronicle'}<h2 id="session-dialog-title">Chronicle</h2><ol class="chronicle">{#each game.activity as item}<li>{item.message}</li>{/each}</ol>{/if}
</dialog>

<style>
  .session{height:100svh;min-height:600px;position:relative;isolation:isolate;overflow:clip;background:#071321;}.environment{position:absolute;inset:0;z-index:-2;}.environment img{height:100%;width:100%;object-fit:cover;}.composition{height:100%;position:relative;--control-height:clamp(50px,6.5svh,128px);--control-font:clamp(22px,3svh,58px);}
  header{position:absolute;top:1.2%;left:2%;right:2%;display:flex;justify-content:space-between;align-items:center;z-index:6;font-size:clamp(12px,1.6svh,30px);}header a,header>span{padding:8px 14px;background:#071522d9;border:1px solid #ae91516b;border-radius:24px;color:#ecd5a1;text-decoration:none;}header a{min-height:44px;display:flex;align-items:center;}header strong{letter-spacing:.12em;}
  button{color:inherit;}button.draft-card,.leaders button,.basic-supply button,.altars button,.own-leader,.hand button,.supply-piles button{position:relative;border:0;background:none;padding:0;}button:focus-visible{outline:3px solid #ffdf8e;outline-offset:3px;border-radius:8px;}.draft-card:hover,.basic-supply button:hover,.altars button:hover,.hand button:hover{filter:brightness(1.13);}
  .draft-title{position:absolute;left:5%;top:10%;width:28%;text-align:center;z-index:2;text-shadow:0 2px 5px #000;}h1{font:500 clamp(36px,5.4svh,110px)/.95 'Cormorant Garamond',serif;text-transform:uppercase;color:#f4db9f;margin:0;}.draft-title p{font:500 clamp(22px,3svh,58px)/1.2 'Cormorant Garamond',serif;margin:20px 0;}
  .hero{position:absolute;top:3%;left:26%;width:43%;height:52%;object-fit:contain;object-position:center bottom;pointer-events:none;}
  button.leader-card{position:absolute;left:17%;top:37%;width:min(37vw,57svh);z-index:2;}button.temple-card{position:absolute;left:57%;top:41%;width:min(13vw,20svh);z-index:2;}button.event-card{position:absolute;left:72%;top:43%;width:min(22vw,31svh);z-index:2;}
  .leaders{position:absolute;left:28%;width:44%;bottom:12%;display:flex;justify-content:center;gap:3%;}.leaders button{width:min(10vw,15svh);flex-shrink:0;}.taken{filter:saturate(.4);}.taken-by{position:absolute;bottom:-12%;left:0;width:100%;text-align:center;font-size:clamp(10px,1.4svh,26px);color:#ffdf8e;}.choose{position:absolute;bottom:2.6%;left:35%;width:30%;}.choose p{text-align:center;font:500 clamp(22px,3svh,56px)/1.2 'Cormorant Garamond',serif;margin:0;padding:12px;background:#071321bb;border-radius:20px;}
  .draft-order{position:absolute;right:3%;top:9%;width:14%;text-align:center;}.draft-order h2{font:500 clamp(14px,1.8svh,34px)/1 'Cormorant Garamond',serif;color:#edd196;text-transform:uppercase;letter-spacing:.08em;margin:0 0 12px;}.draft-order>div{display:flex;flex-direction:column;align-items:center;}.order-portrait{width:min(8vw,12svh);}.draft-order p{font-size:clamp(11px,1.3svh,26px);line-height:1.2;margin:0 0 10px;}.order-index{display:none;}.current p{color:#ffe099;}
  .draft-order.many{display:grid;grid-template-columns:1fr 1fr;gap:10px;}.draft-order.many h2{grid-column:1/-1;}.many .order-portrait{width:8svh;}.many p{font-size:clamp(10px,1.2svh,24px);}
  .opponents{position:absolute;top:6%;left:22%;width:56%;height:13%;display:flex;justify-content:center;gap:6%;}.opponent{position:relative;display:grid;grid-template-columns:1fr 1.6fr;align-items:center;width:40%;max-width:34svh;}.opponent-portrait{width:100%;max-width:12svh;}.hidden-hand{display:flex;justify-content:center;min-width:0;height:9svh;}.hidden-hand img{width:25%;height:100%;object-fit:contain;margin-left:-7%;}.opponent p{grid-column:1/-1;text-align:center;margin:0;font-size:clamp(10px,1.3svh,25px);text-shadow:0 1px 3px #000;}.first p{color:#ffe099;}
  .basic-supply{position:absolute;left:21%;top:22%;width:58%;display:flex;gap:2%;justify-content:center;}.basic-supply button{width:14%;filter:drop-shadow(2px 5px 1px #02070b);}.stock{position:absolute;right:0;bottom:0;min-width:1.8em;min-height:1.8em;display:grid;place-items:center;border:2px solid #bc974c;border-radius:50%;background:#071622;color:#fff1cb;font:bold clamp(13px,2svh,40px)/1 'Atkinson Hyperlegible',sans-serif;padding:2px;}
  .altars{position:absolute;left:1%;top:41%;width:98%;display:grid;grid-template-columns:18% 18%;justify-content:space-between;gap:2svh;pointer-events:none;}.altars button{pointer-events:auto;}.altars.four{top:35%;grid-template-columns:min(14vw,20svh) min(14vw,20svh);gap:1svh;}
  .play-area{position:absolute;left:24%;top:46%;height:14%;width:52%;display:grid;place-items:center;}.play-area span{font:500 clamp(20px,3svh,54px)/1 'Cormorant Garamond',serif;color:#ead8b4b0;text-shadow:0 2px 4px #000;}
  .supply-control{position:absolute;left:2%;top:65%;width:15%;--control-height:clamp(44px,5svh,100px);--control-font:clamp(20px,2.6svh,50px);}.chronicle-control{position:absolute;right:2%;top:65%;width:15%;--control-height:clamp(44px,5svh,100px);--control-font:clamp(20px,2.6svh,50px);}
  .turn-rail{position:absolute;left:23%;top:63%;width:54%;height:10%;isolation:isolate;padding:0 3%;display:flex;align-items:center;justify-content:center;}.rail-frame{position:absolute;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;} .turn-marker{width:35%;display:grid;text-align:center;font:600 clamp(18px,2.6svh,52px)/1.1 'Cormorant Garamond',serif;color:#f6dfac;}.turn-marker span{font-size:.65em;margin-top:4px;}.resources{display:flex;justify-content:space-evenly;width:65%;--icon-size:clamp(20px,3svh,64px);--icon-number-scale:.8;}
  .hand{position:absolute;left:28%;bottom:2%;width:56%;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:1%;align-items:end;}.hand button{min-width:0;height:100%;z-index:2;}.hand-slot,.hand button{grid-row:1;grid-column:calc(var(--card-index) + 1);}.hand-face{pointer-events:none;}.hand-slot:has(+ button:hover){filter:brightness(1.13);}.own-leader{position:absolute!important;left:1%;bottom:3%;width:17%;}.leader-portrait{display:none;}.deck-pile{position:absolute;left:19%;bottom:3%;width:7%;}.deck-pile img{width:100%;display:block;filter:drop-shadow(3px 5px 1px #000);}.discard-pile{position:absolute;right:3%;bottom:4%;width:10%;text-align:center;font-size:clamp(12px,1.8svh,34px);}.discard-pile img{width:100%;max-height:14svh;object-fit:contain;}.discard-pile span{display:block;background:#071321bb;border:1px solid #b2914f;border-radius:8px;padding:6px;}
  .error{position:absolute;left:24%;width:52%;top:29%;text-align:center;padding:12px;background:#481f18ee;border:1px solid #cb9872;border-radius:12px;color:#fff0cd;z-index:9;}.connection{position:absolute;left:30%;top:42%;width:40%;background:#071321ef;border:1px solid #b2914f;border-radius:16px;padding:20px;text-align:center;z-index:10;}.connection p{margin:0 0 16px;}
  dialog{width:min(900px,94vw);max-height:95svh;padding:28px;border:2px solid #b58b48;border-radius:20px;background:linear-gradient(#132431f5,#07111cfb);color:#f2dfb9;text-align:center;box-shadow:0 20px 80px #000b;}dialog::backdrop{background:#020811bb;backdrop-filter:blur(6px);}dialog h2{font:600 30px/1 'Cormorant Garamond',serif;margin:14px 32px 24px;}.close{position:absolute;right:7px;top:7px;width:44px;height:44px;border:0;background:none;font-size:28px;}.inspected{width:min(360px,49svh,78vw);margin:auto;}.inspected.landscape{width:min(680px,102svh,80vw);}.supply-piles{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;}.supply-pages{display:flex;justify-content:center;gap:16px;margin-top:24px;}.supply-pages button{min-height:44px;padding:8px 14px;border:1px solid #b2914f;background:#071321;border-radius:8px;}.supply-pages [aria-pressed='true']{background:#584328;color:#ffe4aa;}.chronicle{text-align:left;max-height:65svh;overflow:auto;line-height:1.5;}.chronicle li{padding:6px;}
  @media(max-aspect-ratio:3/4){
    .session{min-height:700px;}header{top:1%;left:2%;right:2%;font-size:11px;}header a,header>span{padding:6px 10px;}header a{min-height:34px;}
    .draft-title{left:10%;width:80%;top:6%;}h1{font-size:clamp(28px,7.2vw,50px);line-height:.92;}.draft-title h1 br{display:none;}.draft-title p{font-size:20px;margin:9px 0;}.hero{left:10%;top:13%;width:80%;height:27%;}
    button.leader-card{left:7%;top:31%;width:86%;}button.temple-card{left:13%;top:56%;width:25%;}button.event-card{left:43%;top:56%;width:46%;}
    .leaders{left:5%;width:90%;bottom:auto;top:74%;gap:1%;}.leaders button{width:24%;}.taken-by{font-size:10px;bottom:-7%;}.choose{left:10%;width:80%;bottom:2.5%;--control-height:50px;--control-font:25px;}.choose p{font-size:23px;padding:10px;}
    .draft-order,.draft-order.many{display:flex;top:auto;bottom:10%;left:3%;width:94%;right:auto;display:flex;justify-content:center;gap:8px;}.draft-order h2,.order-portrait{display:none;}.draft-order>div{flex:1;min-width:0;}.draft-order p{font-size:10px;margin:0;}.order-index{display:inline;}
    .opponents{top:6%;left:7%;width:86%;height:17%;gap:4%;}.opponent{width:100%;max-width:40svh;grid-template-columns:1fr;justify-items:center;}.opponent-portrait{width:23vw;max-width:11svh;}.opponents:has(.opponent:nth-child(2)) .opponent-portrait{width:20vw;max-width:9svh;}.hidden-hand{height:6svh;width:100%;}.hidden-hand img{width:19%;margin-left:-5%;}.opponent p{font-size:9px;}.basic-supply{display:none;}
    .altars,.altars.four{top:26%;left:3%;width:94%;grid-template-columns:48% 48%;gap:1svh;}.altars.four{top:24%;grid-template-columns:39% 39%;justify-content:space-around;}
    .play-area{top:48%;left:21%;width:58%;height:9%;}.play-area span{font-size:20px;}.supply-control{top:53%;left:3%;width:29%;--control-height:44px;--control-font:21px;}.chronicle-control{top:53%;right:3%;width:32%;--control-height:44px;--control-font:21px;}
    .turn-marker.long{font-size:14px;}
    .turn-rail{top:60%;left:3%;width:94%;height:9%;padding:0 6%;}.turn-marker{font-size:19px;width:35%;}.resources{--icon-size:23px;--icon-number-scale:.8;}
    .hand{left:0;width:100%;padding:0 3%;bottom:13%;gap:0;align-items:end;}.hand button{height:34vw;min-height:100px;}.hand-slot{width:24vw;margin-left:-3vw;}.hand-face{width:100%;transform:translateY(calc((2 - var(--card-index)) * 2px));}
    .own-leader{left:37%!important;bottom:1%!important;width:26%!important;}.leader-face{display:none;}.leader-portrait{display:block;}.deck-pile{left:9%;bottom:2%;width:14%;}.discard-pile{right:6%;bottom:2%;width:20%;font-size:12px;}.discard-pile img{max-height:8svh;}.discard-pile span{padding:4px;}
    .error{left:5%;width:90%;top:19%;font-size:13px;padding:8px;}.connection{left:8%;width:84%;font-size:15px;--control-height:48px;--control-font:25px;}
    dialog{padding:20px 16px;}dialog h2{font-size:25px;margin:18px 28px 20px;}.supply-piles{grid-template-columns:repeat(3,1fr);gap:12px;}.supply-pages{gap:8px;margin-top:18px;}.supply-pages button{font-size:13px;padding:8px;}.supply-piles .stock{font-size:12px;}
  }
</style>
