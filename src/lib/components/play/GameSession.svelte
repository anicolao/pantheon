<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { fly } from 'svelte/transition';
  import { base } from '$app/paths';
  import { cards } from '$lib/game/cards';
  import { leaderIds, leaderLinks, setupSupply, type SetupState } from '$lib/game/setup';
  import type { GameCommand } from '$lib/backend/setup-repository';
  import type { CardDefinition } from '$lib/game/types';
  import CardFace from '../CardFace.svelte';
  import ResourceIcon from '../ResourceIcon.svelte';
  import GameButton from '../GameButton.svelte';
  import Portrait from './Portrait.svelte';
  import ActionChoice from './ActionChoice.svelte';
  import SupplyScene from './SupplyScene.svelte';
  import { activePlayer, canPlayAction, canPlayTreasure, purchaseReason, standings, definition } from '$lib/game/actions';

  let { game, uid, roomId, status, busy, error, command, retry }: {
    game: SetupState; uid: string; roomId: string; status: string; busy: boolean; error: string;
    command: (command: GameCommand) => Promise<void>; retry: () => void;
  } = $props();
  const initialRevision = untrack(() => game.activity.length);
  const animatedHand = new Set<string>();
  let selected = $state<string>('thaleia');
  let reduced = $state(true);
  let inspected = $state<{ card: CardDefinition; copy: number; instanceId?: string } | null>(null);
  let modal = $state<'card' | 'supply' | 'chronicle' | 'zone' | 'advance' | ''>('');
  let handPage = $state(0), zonePage = $state(0);
  let zone = $state<{ uid: string; kind: 'play' | 'discard' | 'trash'; title: string }>();
  const turnUid = $derived(activePlayer(game));
  const choice = $derived(game.turn.choice);
  const ownChoice = $derived(choice && turnUid === uid ? choice : null);
  const zoneCards = $derived(zone?.kind === 'trash' ? game.trash : zone ? game.decks[zone.uid][zone.kind] : []);
  const latestMoves = $derived(game.movements.filter(move => move.sequence === game.activity.at(-1)?.sequence));
  const revealed = $derived(latestMoves.find(move => move.kind === 'reveal'));
  const lastPublic = $derived([...latestMoves].reverse().find(move => ['trash', 'gain', 'discard', 'topdeck'].includes(move.kind) && move.card));
  const own = $derived(game.decks[uid]);
  const visibleHand = $derived(own?.hand.slice(handPage * 5, handPage * 5 + 5) ?? []);
  $effect(() => { if (own && handPage * 5 >= own.hand.length) handPage = Math.max(0, Math.ceil(own.hand.length / 5) - 1); });
  let dialog = $state<HTMLDialogElement>();
  let opener: HTMLElement | null = null;
  const links = $derived(leaderLinks(selected));
  const chooser = $derived(game.draftOrder[Object.keys(game.leaders).length]);
  const isChoice = $derived(chooser === uid && game.phase === 'draft');
  const nameOf = (id: string) => game.players.find(player => player.uid === id)!.name;
  const ownerOf = (leader: string) => Object.entries(game.leaders).find(([, value]) => value === leader)?.[0];
  const opponents = $derived(game.turnOrder.filter(id => id !== uid));
  const supply = $derived(setupSupply(game.playerCount).map(pile => ({ ...pile, count: game.supply[pile.id] ?? pile.count })));
  const treasures = $derived(own?.hand.filter(card => definition(card.cardId).type === 'Treasure') ?? []);
  const advanceLabel = $derived(game.turn.phase === 'actions' ? 'To Treasures' : game.turn.phase === 'treasures' ? 'To Buys' : 'End turn');
  const remaining = $derived(game.turn.phase === 'actions' ? own?.hand.find(card => canPlayAction(game, uid, card.id)) : game.turn.phase === 'treasures' ? treasures[0] : supply.find(pile => !purchaseReason(game, uid, pile.id)));
  const scores = $derived(game.turn.phase === 'finished' ? standings(game) : []);
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
  function handRevision(id: string) { return game.movements.findLast(move => move.kind === 'draw' && move.card?.id === id)?.sequence ?? game.dealtAtSequence ?? 0; }
  function deal(node: Element, index: number) {
    const id = (node as HTMLElement).dataset.instanceId!;
    const revision = handRevision(id);
    const animation = `${id}:${revision}`;
    if (animatedHand.has(animation)) return { duration: 0 };
    animatedHand.add(animation);
    if (reduced || revision <= initialRevision) return { duration: 0 };
    const source = document.querySelector('.deck-pile')!.getBoundingClientRect(), target = node.getBoundingClientRect();
    return fly(node, { x: source.left - target.left, y: source.top - target.top, duration: 550, delay: index * 85 });
  }
  function dealBack(node: Element, index: number) {
    return reduced || !game.dealtAtSequence || game.dealtAtSequence <= initialRevision ? { duration: 0 } : fly(node, { y: 40, duration: 550, delay: index * 85 });
  }
  async function open(kind: 'card' | 'supply' | 'chronicle' | 'zone' | 'advance') { opener = document.activeElement as HTMLElement; modal = kind; await tick(); if (kind !== 'supply') dialog!.showModal(); }
  function inspect(id: string, copy = 1, instanceId?: string) { inspected = { card: definition(id), copy, instanceId }; void open('card'); }
  function close() { if (dialog?.open) dialog.close(); modal = ''; opener?.focus(); }
  function inspectZone(player: string, kind: 'play' | 'discard' | 'trash', title: string) { zone = { uid: player, kind, title }; zonePage = 0; void open('zone'); }
  function playInspected() { const id = inspected?.instanceId; if (id && ready && (canPlayAction(game, uid, id) || canPlayTreasure(game, uid, id))) { const type = inspected!.card.type === 'Action' ? 'action/played' : 'treasure/played'; close(); void command({ type, instanceId: id }); } }
  function publicFlight(node: Element) { return reduced || game.activity.length <= initialRevision ? { duration: 0 } : fly(node, { x: -90, y: 30, duration: 550 }); }
  function playedFlight(node: Element) { return reduced || game.activity.length <= initialRevision ? { duration: 0 } : fly(node, { y: innerHeight * .25, duration: 550 }); }
  function advance() { if (!ready || turnUid !== uid || choice || game.turn.phase === 'finished') return; if (remaining) void open('advance'); else commitAdvance(); }
  function commitAdvance() { close(); handPage = 0; void command({ type: game.turn.phase === 'buys' ? 'turn/ended' : 'phase/advanced' }); }
  function choose() { if (isChoice && ready && !ownerOf(selected)) void command({ type: 'leader/chosen', leaderId: selected }); }
</script>

<main class="session" class:drafting={game.phase === 'draft'} data-status={status} aria-busy={busy}>
  <picture class="environment" aria-hidden="true"><source media="(max-aspect-ratio:3/4)" srcset={`${base}/assets/ui/table-mobile.webp`} /><img src={`${base}/assets/ui/table-desktop.webp`} alt="" draggable="false" /></picture>
  <div class="composition" data-e2e-layout={modal || ownChoice ? undefined : true}>
    <header><a href={`${base}/`} aria-label="Back to sanctuary">‹ Sanctuary</a>{#if /^[A-Z]{4,5}$/.test(roomId)}<span>Game code <strong>{roomId}</strong></span>{:else}<span>{game.playerCount} players</span>{/if}</header>
    {#if game.phase === 'playing'}<button class="trash-control" onclick={() => inspectZone(uid, 'trash', 'Shared trash')} aria-label={`Inspect shared trash, ${game.trash.length} cards`}><ResourceIcon resource="trash" value={game.trash.length} label={`${game.trash.length} cards in shared trash`} /></button>{/if}
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
            <p><span class="order-index">{index + 1}. </span>{nameOf(id)}{id === turnUid ? ' · First player' : ''}{game.leaders[id] ? ' ✓' : ''}</p>
          </div>
        {/each}
      </section>
      <div class="choose">{#if isChoice}<GameButton primary onclick={choose} disabled={!ready || !!ownerOf(selected)}>{busy ? 'Choosing…' : `Choose ${links.leader.name.split(',')[0]}`}</GameButton>{:else}<p role="status">Waiting for {nameOf(chooser)}</p>{/if}</div>
    {:else if own}
      <section class="opponents" aria-label="Other players">
        {#each opponents as id}
          <div class="opponent" data-testid="opponent" class:first={id === turnUid}>
            <div class="opponent-portrait" class:blessed={latestMoves.some(move => move.kind === 'leader' && move.uid === id)}><Portrait leader={game.leaders[id]} name={nameOf(id)} active={id === turnUid} /></div>
            <div class="hidden-hand" aria-label={`${nameOf(id)} has ${game.decks[id].hand.length} cards in hand`}>
              {#each game.decks[id].hand.slice(0, 5) as _, index}<img src={`${base}/assets/backs/back-deck.webp`} alt="Card back" style:--index={index} draggable="false" in:dealBack|global={index} />{/each}
              {#if game.decks[id].hand.length > 5}<span class="hand-count">{game.decks[id].hand.length}</span>{/if}
            </div>
            <p>{id === turnUid ? 'Active · ' : ''}Deck {game.decks[id].deck.length} · <button class="opponent-discard" aria-label={`Inspect ${nameOf(id)}’s discard pile, ${game.decks[id].discard.length} cards`} onclick={() => inspectZone(id, 'discard', `${nameOf(id)}’s discard`)}>Discard {game.decks[id].discard.length}</button></p>
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
      <div class="play-area" aria-label="Active play area">
        {#if game.decks[turnUid].play.length}<div class="played-cards">{#each game.decks[turnUid].play.slice(-3) as card (card.id)}<button aria-label={`Inspect played ${definition(card.cardId).name}`} onclick={() => inspect(card.cardId, card.copy)} in:playedFlight|global><CardFace card={definition(card.cardId)} players={game.playerCount} copy={card.copy} /></button>{/each}</div>{:else}<span>Your play area</span>{/if}
      </div>
      {#if game.decks[turnUid].play.length && !(turnUid === uid && game.turn.phase === 'treasures' && treasures.length)}<button class="all-played" onclick={() => inspectZone(turnUid, 'play', `${nameOf(turnUid)}’s play area`)}>In play · {game.decks[turnUid].play.length}</button>{/if}
      {#if revealed || lastPublic}{#key game.activity.length}<button class="outcome" aria-label={`Inspect ${revealed ? 'revealed' : lastPublic!.kind === 'trash' ? 'trashed' : 'gained'} ${definition((revealed ?? lastPublic)!.card!.cardId).name}`} onclick={() => inspect((revealed ?? lastPublic)!.card!.cardId, (revealed ?? lastPublic)!.card!.copy)} in:publicFlight|global><div class="outcome-card"><CardFace card={definition((revealed ?? lastPublic)!.card!.cardId)} players={game.playerCount} copy={(revealed ?? lastPublic)!.card!.copy} /></div><ResourceIcon resource={lastPublic?.kind === 'topdeck' ? 'topdeck' : lastPublic?.kind === 'trash' ? 'trash' : 'discard'} />{#if revealed && lastPublic?.kind === 'discard'}<ResourceIcon resource="coins" value="+2" />{/if}</button>{/key}{/if}
      {#if game.movements.length}<p class="action-message" role="status">{choice && turnUid !== uid ? `${nameOf(turnUid)} chooses cards for ${definition(choice.source).name.split(',')[0]}.` : game.activity.at(-1)?.message.split(';').slice(0, 2).join(';')}</p>{/if}
      <div class="supply-control"><GameButton onclick={() => open('supply')}>Supply</GameButton></div>
      {#if turnUid === uid && game.turn.phase !== 'finished'}<div class="chronicle-control"><GameButton primary onclick={advance} disabled={!ready || !!choice}>{advanceLabel}</GameButton></div>{/if}
      {#if turnUid === uid && game.turn.phase === 'treasures' && treasures.length}<div class="treasures-control"><GameButton primary disabled={!ready} onclick={()=>command({type:'treasures/played'})}>Play all Treasures</GameButton></div>{/if}
      <section class="turn-rail" aria-label="Turn resources"><img class="rail-frame" src={`${base}/assets/ui/resource-rail.webp`} alt="" aria-hidden="true" /><button aria-label="Chronicle" title="Chronicle" onclick={()=>open('chronicle')} class="turn-marker" class:long={nameOf(turnUid).length > 12 && turnUid !== uid}><strong>{turnUid === uid ? 'Your turn' : `${nameOf(turnUid)}’s turn`}</strong><span>{game.turn.phase === 'actions' ? 'Actions' : game.turn.phase === 'treasures' ? 'Treasures' : game.turn.phase === 'finished' ? 'Complete' : 'Buys'} · Turn {game.turn.number} ▤</span></button>
        <div class="resources"><ResourceIcon resource="actions" value={game.resources.actions} /><ResourceIcon resource="coins" value={game.resources.coins} /><ResourceIcon resource="buys" value={game.resources.buys} /><ResourceIcon resource="worship" value={game.resources.worship} /></div>
      </section>
      {#if scores.length}<section class="results" aria-label="Final scores"><h2>{scores.filter(row=>row.winner).map(row=>row.name).join(' & ')} {scores.filter(row=>row.winner).length > 1 ? 'share victory' : 'wins'}</h2>{#each scores as row}<p><strong>{row.name} · {row.score} VP</strong><span>{row.territories.map(item=>`${item.count} ${definition(item.id).name}`).join(' · ')} · {row.turns} turns</span></p>{/each}<a href={`${base}/play/`}>Play again</a></section>{/if}
      <section class="hand" aria-label="Your hand">
        {#each visibleHand as card, index (`${card.id}:${handRevision(card.id)}`)}<div class="hand-slot" data-instance-id={card.id} class:playable={canPlayAction(game, uid, card.id) || canPlayTreasure(game, uid, card.id)} style:--card-index={index} in:deal|global={index}><div class="hand-face"><CardFace card={cards.find(item => item.id === card.cardId)!} players={game.playerCount} copy={card.copy} /></div></div><button data-testid="hand-card" aria-label={`Inspect hand card ${handPage * 5 + index + 1}: ${cards.find(item => item.id === card.cardId)!.name}`} style:--card-index={index} onclick={() => inspect(card.cardId, card.copy, card.id)}></button>{/each}
      </section>
      {#if own.hand.length > 5}<nav class="hand-pages" aria-label="Hand pages"><button aria-label="Previous hand cards" disabled={handPage === 0} onclick={() => handPage--}>‹</button><span>{handPage + 1} / {Math.ceil(own.hand.length / 5)}</span><button aria-label="Next hand cards" disabled={(handPage + 1) * 5 >= own.hand.length} onclick={() => handPage++}>›</button></nav>{/if}
      <button class="own-leader" class:blessed={latestMoves.some(move => move.kind === 'leader' && move.uid === uid)} aria-label={`Inspect your leader, ${leaderLinks(game.leaders[uid]).leader.name}`} onclick={() => inspect(game.leaders[uid])}><div class="leader-face"><CardFace card={leaderLinks(game.leaders[uid]).leader} players={game.playerCount} /></div><div class="leader-portrait"><Portrait leader={game.leaders[uid]} name={leaderLinks(game.leaders[uid]).leader.name.split(',')[0]} active={uid === turnUid} /></div></button>
      <div class="deck-pile" aria-label={`Your deck: ${own.deck.length} cards`}><img src={`${base}/assets/backs/back-deck.webp`} alt="Your face-down deck" /><span class="stock">{own.deck.length}</span></div>
      <button class="discard-pile" aria-label={`Inspect your discard pile: ${own.discard.length} cards`} onclick={() => inspectZone(uid, 'discard', 'Your discard')}><img src={`${base}/assets/icons/discard-v2.webp`} alt="" /><span>Discard · {own.discard.length}</span></button>
    {/if}
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    {#if status !== 'synced'}<div class="connection" role="status"><p>Connection lost. Your place is kept.</p><GameButton onclick={retry}>Try again</GameButton></div>{/if}
  </div>
</main>
<dialog bind:this={dialog} oncancel={event => { event.preventDefault(); close(); }} aria-labelledby="session-dialog-title" data-e2e-layout={modal ? true : undefined} class:inspection={modal === 'card'}>
  <button class="close" aria-label="Close" onclick={close}>×</button>
  {#if modal === 'card' && inspected}<h2 id="session-dialog-title">{inspected.card.name}</h2><div class="inspected" class:landscape={inspected.card.type === 'Leader' || inspected.card.type === 'Event'}><CardFace card={inspected.card} players={game.playerCount} copy={inspected.copy} /></div>
    {#if inspected.instanceId && (inspected.card.type === 'Action' || inspected.card.type === 'Treasure')}<div class="play-command"><GameButton primary onclick={playInspected} disabled={!ready || !(canPlayAction(game, uid, inspected.instanceId) || canPlayTreasure(game, uid, inspected.instanceId))}>Play {inspected.card.name}</GameButton>{#if !(canPlayAction(game, uid, inspected.instanceId) || canPlayTreasure(game, uid, inspected.instanceId))}<p>{turnUid !== uid ? 'Wait for your turn.' : choice ? 'Finish your current choice.' : inspected.card.type === 'Treasure' ? 'Play Treasures in the Treasure phase.' : game.resources.actions < 1 ? 'No Actions remaining.' : 'The Action phase is over.'}</p>{/if}</div>{/if}
  {:else if modal === 'advance'}<h2 id="session-dialog-title">{game.turn.phase === 'buys' ? 'End your turn?' : `Leave ${game.turn.phase === 'actions' ? 'Actions' : 'Treasures'}?`}</h2><div class="confirm-resources"><ResourceIcon resource="coins" value={game.resources.coins}/><ResourceIcon resource="buys" value={game.resources.buys}/></div><p>You can still {game.turn.phase === 'buys' ? 'buy' : 'play'} {remaining ? definition('cardId' in remaining ? remaining.cardId : remaining.id).name : 'cards'}.</p><div class="confirm-controls"><GameButton primary onclick={close}>Keep playing</GameButton><GameButton onclick={commitAdvance} disabled={!ready}>{advanceLabel}</GameButton></div>
  {:else if modal === 'zone' && zone}<h2 id="session-dialog-title">{zone.title}</h2>{#if zoneCards.length}<div class="supply-piles">{#each zoneCards.slice(zonePage * 6, zonePage * 6 + 6) as card}<button aria-label={`Inspect ${definition(card.cardId).name}, copy ${card.copy}`} onclick={() => { inspected = { card: definition(card.cardId), copy: card.copy }; modal = 'card'; }}><CardFace card={definition(card.cardId)} players={game.playerCount} copy={card.copy} /></button>{/each}</div><nav class="supply-pages" aria-label="Pile pages"><button disabled={zonePage === 0} onclick={() => zonePage--}>Previous</button><span>{zonePage + 1} / {Math.ceil(zoneCards.length / 6)}</span><button disabled={(zonePage + 1) * 6 >= zoneCards.length} onclick={() => zonePage++}>Next</button></nav>{:else}<p>No cards here.</p>{/if}
  {:else if modal === 'chronicle'}<h2 id="session-dialog-title">Chronicle</h2><ol class="chronicle">{#each game.activity as item}<li>{item.message}</li>{/each}</ol>{/if}
</dialog>
{#if modal === 'supply'}<SupplyScene {game} {uid} {ready} {status} {error} {command} {retry} {close}/>{/if}
{#if ownChoice}<ActionChoice {game} {uid} choice={ownChoice} {ready} {error} {command} {status} {retry} />{/if}

<style>
  .results{position:absolute;left:25%;top:22%;width:50%;padding:24px;background:#081522f7;border:2px solid #c5a25e;border-radius:20px;text-align:center;z-index:8;}.results h2{font:600 34px 'Cormorant Garamond',serif;margin:0 0 20px;}.results p{display:grid;gap:6px;}.results span{font-size:14px;}.results a{display:inline-block;padding:14px 24px;border:1px solid #c4a366;color:#ffe2a2;border-radius:10px;}.composition:has(.results) .basic-supply,.composition:has(.results) .play-area,.composition:has(.results) .outcome,.composition:has(.results) .action-message,.composition:has(.results) .all-played,.composition:has(.results) .supply-control{visibility:hidden;}@media(max-aspect-ratio:3/4){.results{left:4%;width:92%;top:25%;padding:16px;}.results h2{font-size:26px;}.results span{font-size:11px;}.composition:has(.results) .altars{visibility:hidden;}}
  .turn-marker{border:0;background:none;color:inherit;padding:0;cursor:pointer;min-height:44px;}.treasures-control{position:absolute;left:2%;top:73%;width:16%;--control-height:48px;--control-font:23px;}.confirm-resources{display:flex;gap:24px;justify-content:center;--icon-size:30px;margin:24px;}.confirm-controls{display:flex;gap:24px;margin:32px auto 12px;max-width:640px;--control-height:56px;--control-font:24px;}.confirm-controls :global(button){flex:1;}dialog:has(.confirm-controls){background:linear-gradient(#142332f5,#08131efa);}
  @media(max-aspect-ratio:3/4){.treasures-control{left:35%;top:53%;width:30%;--control-height:44px;--control-font:17px;}.chronicle-control{--control-font:19px!important;}.confirm-controls{flex-direction:column;gap:16px;}.confirm-controls :global(button){flex:auto;}}

  .composition:has(.outcome) .play-area{left:34%;top:44%;width:20%;height:17%;}.composition:has(.outcome) .played-cards{margin-left:0;}.composition:has(.outcome) .played-cards button:not(:last-child){display:none;}.outcome{left:56%!important;top:44%!important;width:18%!important;height:17%!important;flex-direction:row!important;}.outcome-card{width:min(54%,12svh)!important;flex-shrink:0;}
  .blessed{filter:drop-shadow(0 0 9px #ffe091);}
  .hand-count{position:absolute;right:0;bottom:0;min-width:24px;background:#071321;border:1px solid #b99a51;border-radius:50%;text-align:center;}
  .trash-control{position:absolute;left:46%;top:1%;width:8%;height:44px;background:#071321c9;border:1px solid #aa8e52;border-radius:12px;--icon-size:20px;z-index:6;}.opponent-discard{border:0;padding:0 4px;background:#07132199;min-height:44px;font:inherit;color:inherit;border-radius:6px;}.opponent p{display:flex;align-items:center;justify-content:center;gap:3px;}.playable{filter:drop-shadow(0 0 5px #eebd63);}.played-cards{display:flex;gap:12px;height:100%;justify-content:center;}.played-cards button{height:100%;aspect-ratio:5/7;padding:0;border:0;background:none;}.all-played{position:absolute;left:24%;top:46%;width:10%;min-height:44px;background:#071321bb;border:1px solid #ad8e50;border-radius:8px;color:#edd7a8;font-size:clamp(12px,1.6svh,32px);}.play-area:has(.played-cards){left:31%;width:38%;}.play-area:has(.played-cards) .played-cards{margin-left:25%;}.outcome{position:absolute;left:4%;top:7%;width:13%;height:23%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:0;border:0;background:none;--icon-size:clamp(18px,2svh,42px);}.outcome-card{width:70%;}.action-message{position:absolute;left:25%;width:50%;top:20%;margin:0;text-align:center;background:#071321da;border:1px solid #ae9151;border-radius:8px;padding:4px 8px;font-size:clamp(11px,1.4svh,28px);line-height:1.2;pointer-events:none;z-index:3;}.hand-pages{position:absolute;left:1%;bottom:22%;width:18%;display:flex;justify-content:center;gap:8px;align-items:center;font-size:clamp(12px,1.6svh,32px);}.hand-pages button{min-width:44px;min-height:44px;border:1px solid #b99653;background:#071321;border-radius:8px;color:#f2d694;font-size:24px;}.discard-pile{border:0;padding:0;background:none;color:inherit;}.play-command{max-width:440px;margin:16px auto 0;--control-height:52px;--control-font:24px;}.play-command p{margin:8px 0 0;color:#edca8d;font-size:15px;}.inspection:has(.play-command) .inspected{width:min(260px,35svh);}
  .session{height:100svh;min-height:600px;position:relative;isolation:isolate;overflow:clip;background:#071321;}.environment{position:absolute;inset:0;z-index:-2;}.environment img{height:100%;width:100%;object-fit:cover;}.composition{height:100%;position:relative;--control-height:clamp(50px,6.5svh,128px);--control-font:clamp(22px,3svh,58px);}
  header{position:absolute;top:1.2%;left:2%;right:2%;display:flex;justify-content:space-between;align-items:center;z-index:6;font-size:clamp(12px,1.6svh,30px);}header a,header>span{padding:8px 14px;background:#071522d9;border:1px solid #ae91516b;border-radius:24px;color:#ecd5a1;text-decoration:none;}header a{min-height:44px;display:flex;align-items:center;}header strong{letter-spacing:.12em;}
  button{color:inherit;}button.draft-card,.leaders button,.basic-supply button,.altars button,.own-leader,.hand button,.supply-piles button{position:relative;border:0;background:none;padding:0;}button:focus-visible{outline:3px solid #ffdf8e;outline-offset:3px;border-radius:8px;}.draft-card:hover,.basic-supply button:hover,.altars button:hover,.hand button:hover{filter:brightness(1.13);}
  .draft-title{position:absolute;left:5%;top:10%;width:28%;text-align:center;z-index:2;text-shadow:0 2px 5px #000;}h1{font:500 clamp(36px,5.4svh,110px)/.95 'Cormorant Garamond',serif;text-transform:uppercase;color:#f4db9f;margin:0;}.draft-title p{font:500 clamp(22px,3svh,58px)/1.2 'Cormorant Garamond',serif;margin:20px 0;}
  .hero{position:absolute;top:3%;left:26%;width:43%;height:52%;object-fit:contain;object-position:center bottom;pointer-events:none;}
  button.leader-card{position:absolute;left:17%;top:37%;width:min(37vw,57svh);z-index:2;}button.temple-card{position:absolute;left:57%;top:41%;width:min(13vw,20svh);z-index:2;}button.event-card{position:absolute;left:72%;top:43%;width:min(22vw,31svh);z-index:2;}
  .leaders{position:absolute;left:28%;width:44%;bottom:12%;display:flex;justify-content:center;gap:3%;}.leaders button{width:min(10vw,15svh);flex-shrink:0;}.taken{filter:saturate(.4);}.taken-by{position:absolute;bottom:-12%;left:0;width:100%;text-align:center;font-size:clamp(10px,1.4svh,26px);color:#ffdf8e;}.choose{position:absolute;bottom:2.6%;left:35%;width:30%;}.choose p{text-align:center;font:500 clamp(22px,3svh,56px)/1.2 'Cormorant Garamond',serif;margin:0;padding:12px;background:#071321bb;border-radius:20px;}
  .draft-order{position:absolute;right:3%;top:9%;width:14%;text-align:center;}.draft-order h2{font:500 clamp(14px,1.8svh,34px)/1 'Cormorant Garamond',serif;color:#edd196;text-transform:uppercase;letter-spacing:.08em;margin:0 0 12px;}.draft-order>div{display:flex;flex-direction:column;align-items:center;}.order-portrait{width:min(8vw,12svh);}.draft-order p{font-size:clamp(11px,1.3svh,26px);line-height:1.2;margin:0 0 10px;}.order-index{display:none;}.current p{color:#ffe099;}
  .draft-order.many{display:grid;grid-template-columns:1fr 1fr;gap:10px;}.draft-order.many h2{grid-column:1/-1;}.many .order-portrait{width:8svh;}.many p{font-size:clamp(10px,1.2svh,24px);}
  .opponents{position:absolute;top:5%;left:22%;width:56%;height:13%;display:flex;justify-content:center;gap:6%;}.opponent{position:relative;display:grid;grid-template-columns:1fr 1.6fr;align-items:center;width:40%;max-width:34svh;}.opponent-portrait{width:100%;max-width:10svh;}.hidden-hand{position:relative;display:flex;justify-content:center;min-width:0;height:9svh;}.hidden-hand img{width:25%;height:100%;object-fit:contain;margin-left:-7%;}.opponent p{grid-column:1/-1;text-align:center;margin:0;font-size:clamp(10px,1.3svh,25px);text-shadow:0 1px 3px #000;}.first p{color:#ffe099;}
  .basic-supply{position:absolute;left:21%;top:22%;width:58%;display:flex;gap:2%;justify-content:center;}.basic-supply button{width:14%;filter:drop-shadow(2px 5px 1px #02070b);}.stock{position:absolute;right:0;bottom:0;min-width:1.8em;min-height:1.8em;display:grid;place-items:center;border:2px solid #bc974c;border-radius:50%;background:#071622;color:#fff1cb;font:bold clamp(13px,2svh,40px)/1 'Atkinson Hyperlegible',sans-serif;padding:2px;}
  .altars{position:absolute;left:1%;top:41%;width:98%;display:grid;grid-template-columns:18% 18%;justify-content:space-between;gap:2svh;pointer-events:none;}.altars button{pointer-events:auto;}.altars.four{top:35%;grid-template-columns:min(14vw,20svh) min(14vw,20svh);gap:1svh;}
  .play-area{position:absolute;left:24%;top:46%;height:14%;width:52%;display:grid;place-items:center;}.play-area span{font:500 clamp(20px,3svh,54px)/1 'Cormorant Garamond',serif;color:#ead8b4b0;text-shadow:0 2px 4px #000;}
  .supply-control{position:absolute;left:2%;top:65%;width:15%;--control-height:clamp(44px,5svh,100px);--control-font:clamp(20px,2.6svh,50px);}.chronicle-control{position:absolute;right:2%;top:65%;width:15%;--control-height:clamp(44px,5svh,100px);--control-font:clamp(20px,2.6svh,50px);}
  .turn-rail{position:absolute;left:23%;top:63%;width:54%;height:10%;isolation:isolate;padding:0 3%;display:flex;align-items:center;justify-content:center;}.rail-frame{position:absolute;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;} .turn-marker{width:35%;display:grid;text-align:center;font:600 clamp(18px,2.6svh,52px)/1.1 'Cormorant Garamond',serif;color:#f6dfac;}.turn-marker span{font-size:.65em;margin-top:4px;}.resources{display:flex;justify-content:space-evenly;width:65%;--icon-size:clamp(20px,3svh,64px);--icon-number-scale:.8;}
  .hand{position:absolute;left:28%;bottom:2%;width:56%;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:1%;align-items:end;}.hand button{min-width:0;height:100%;z-index:2;}.hand-slot,.hand button{grid-row:1;grid-column:calc(var(--card-index) + 1);}.hand-face{pointer-events:none;}.hand-slot:has(+ button:hover){filter:brightness(1.13);}.own-leader{position:absolute!important;left:1%;bottom:3%;width:17%;}.leader-portrait{display:none;}.deck-pile{position:absolute;left:19%;bottom:3%;width:7%;}.deck-pile img{width:100%;display:block;filter:drop-shadow(3px 5px 1px #000);}.discard-pile{position:absolute;right:3%;bottom:4%;width:10%;text-align:center;font-size:clamp(12px,1.8svh,34px);}.discard-pile img{width:100%;max-height:14svh;object-fit:contain;}.discard-pile span{display:block;background:#071321bb;border:1px solid #b2914f;border-radius:8px;padding:6px;}
  .error{position:absolute;left:24%;width:52%;top:29%;text-align:center;padding:12px;background:#481f18ee;border:1px solid #cb9872;border-radius:12px;color:#fff0cd;z-index:9;}.connection{position:absolute;left:30%;top:42%;width:40%;background:#071321ef;border:1px solid #b2914f;border-radius:16px;padding:20px;text-align:center;z-index:10;}.connection p{margin:0 0 16px;}
  dialog{width:min(900px,94vw);max-height:95svh;padding:28px;border:2px solid #b58b48;border-radius:20px;background:linear-gradient(#132431f5,#07111cfb);color:#f2dfb9;text-align:center;box-shadow:0 20px 80px #000b;}dialog::backdrop{background:#020811bb;backdrop-filter:blur(6px);}dialog h2{font:600 30px/1 'Cormorant Garamond',serif;margin:14px 32px 24px;}.close{position:absolute;right:7px;top:7px;width:44px;height:44px;border:0;background:none;font-size:28px;}.inspected{width:min(360px,49svh,78vw);margin:auto;}.inspected.landscape{width:min(680px,102svh,80vw);}.supply-piles{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;}.supply-pages{display:flex;justify-content:center;gap:16px;margin-top:24px;}.supply-pages button{min-height:44px;padding:8px 14px;border:1px solid #b2914f;background:#071321;border-radius:8px;}.chronicle{text-align:left;max-height:65svh;overflow:auto;line-height:1.5;}.chronicle li{padding:6px;}
  @media(max-aspect-ratio:3/4){
    .session{min-height:700px;}header{top:1%;left:2%;right:2%;font-size:11px;}header a,header>span{padding:6px 10px;}header a{min-height:34px;}
    .draft-title{left:10%;width:80%;top:6%;}h1{font-size:clamp(28px,7.2vw,50px);line-height:.92;}.draft-title h1 br{display:none;}.draft-title p{font-size:20px;margin:9px 0;}.hero{left:10%;top:13%;width:80%;height:27%;}
    button.leader-card{left:7%;top:31%;width:86%;}button.temple-card{left:13%;top:56%;width:25%;}button.event-card{left:43%;top:56%;width:46%;}
    .leaders{left:5%;width:90%;bottom:auto;top:74%;gap:1%;}.leaders button{width:24%;}.taken-by{font-size:10px;bottom:-7%;}.choose{left:10%;width:80%;bottom:2.5%;--control-height:50px;--control-font:25px;}.choose p{font-size:23px;padding:10px;}
    .draft-order,.draft-order.many{display:flex;top:auto;bottom:10%;left:3%;width:94%;right:auto;display:flex;justify-content:center;gap:8px;}.draft-order h2,.order-portrait{display:none;}.draft-order>div{flex:1;min-width:0;}.draft-order p{font-size:10px;margin:0;}.order-index{display:inline;}
    .opponents{top:6%;left:7%;width:86%;height:17%;gap:4%;}.opponent{width:100%;max-width:40svh;grid-template-columns:1fr;justify-items:center;}.opponent-portrait{width:23vw;max-width:11svh;}.opponents:has(.opponent:nth-child(2)) .opponent-portrait{width:20vw;max-width:6svh;}.hidden-hand{height:6svh;width:100%;}.hidden-hand img{width:19%;margin-left:-5%;}.opponent p{font-size:9px;}.basic-supply{display:none;}
    .altars,.altars.four{top:26%;left:3%;width:94%;grid-template-columns:48% 48%;gap:1svh;}.altars.four{top:24%;grid-template-columns:39% 39%;justify-content:space-around;}
    .play-area{top:44%;left:21%;width:58%;height:7%;}.play-area span{font-size:20px;}.supply-control{top:53%;left:3%;width:29%;--control-height:44px;--control-font:21px;}.chronicle-control{top:53%;right:3%;width:32%;--control-height:44px;--control-font:21px;}
    .turn-marker.long{font-size:14px;}
    .turn-rail{top:60%;left:3%;width:94%;height:9%;padding:0 6%;}.turn-marker{font-size:19px;width:35%;}.resources{--icon-size:23px;--icon-number-scale:.8;}
    .hand{left:0;width:100%;padding:0 3%;bottom:13%;gap:0;align-items:end;}.hand button{height:34vw;min-height:100px;}.hand-slot{width:24vw;margin-left:-3vw;}.hand-face{width:100%;transform:translateY(calc((2 - var(--card-index)) * 2px));}
    .own-leader{left:37%!important;bottom:1%!important;width:26%!important;}.leader-face{display:none;}.leader-portrait{display:block;}.deck-pile{left:9%;bottom:2%;width:14%;}.discard-pile{right:6%;bottom:2%;width:20%;font-size:12px;}.discard-pile{height:10%;}.discard-pile img{height:65%;max-height:6svh;display:block;margin:auto;}.discard-pile span{padding:2px;}
    .error{left:5%;width:90%;top:19%;font-size:13px;padding:8px;}.connection{left:8%;width:84%;font-size:15px;--control-height:48px;--control-font:25px;}
    dialog{padding:20px 16px;}dialog h2{font-size:25px;margin:18px 28px 20px;}.supply-piles{grid-template-columns:repeat(3,1fr);gap:12px;}.supply-pages{gap:8px;margin-top:18px;}.supply-pages button{font-size:13px;padding:8px;}
  }
  @media (max-aspect-ratio:3/4){
    .hand-slot{width:22vw;margin-left:-2vw;}.hand button{height:31vw;}
    .trash-control{left:42%;top:1%;width:16%;--icon-size:18px;}.opponent-discard{min-height:44px;padding:0;font-size:9px;}.opponent-portrait{max-width:8svh;}.hidden-hand{height:5svh;}.play-area:has(.played-cards){top:44%;left:35%;width:30%;height:9%;} .played-cards button:first-child:nth-last-child(3){display:none;}.play-area:has(.played-cards) .played-cards{margin:0;gap:6px;}.all-played{top:53%;left:35%;width:30%;font-size:12px;min-height:44px;}.action-message{left:3%;width:94%;top:23%;font-size:10px;}.composition:has(.action-message) .altars{top:28%;}.composition:has(.outcome) .altars{top:22%;grid-template-columns:32% 32%;}.composition:has(.outcome) .opponent{grid-template-columns:1fr 1.6fr;}.composition:has(.outcome) .opponent-portrait{width:100%;max-width:7svh;}.composition:has(.outcome) .hidden-hand{height:6svh;}.composition:has(.outcome) .action-message{top:19%;}.composition:has(.action-message) .altars.four{top:28%;grid-template-columns:30% 30%;gap:0;}.composition:has(.played-cards) .altars.four{top:27%;grid-template-columns:repeat(4,minmax(0,1fr));gap:1%;}.composition:has(.outcome) .altars.four{top:24%;grid-template-columns:repeat(4,minmax(0,1fr));gap:1%;}.composition:has(.outcome):has(.altars.four) .action-message{top:21%;}.composition:has(.outcome) .opponents:has(.opponent:nth-child(2)) .opponent{display:flex;flex-direction:column;justify-content:flex-start;}.composition:has(.outcome) .opponents:has(.opponent:nth-child(2)) .opponent-portrait{max-width:5svh;}.composition:has(.outcome) .opponents:has(.opponent:nth-child(2)) .hidden-hand{height:3.5svh;flex-shrink:0;}.outcome{left:51%!important;top:33%!important;height:19%!important;width:44%!important;z-index:3;flex-direction:row;flex-wrap:nowrap;gap:0;--icon-size:16px;background:none;}.outcome-card{width:60%!important;flex-shrink:0;}.composition:has(.outcome) .play-area{left:7%;top:33%;width:33%;height:19%;}.composition:has(.outcome) .played-cards button:not(:last-child){display:none;}.hand-pages{left:32%;width:36%;bottom:27.5%;z-index:4;gap:6px;background:#071321e8;border-radius:8px;font-size:12px;}.hand-pages button{min-width:44px;min-height:44px;}.inspection:has(.play-command) .inspected{width:min(56vw,35svh);}.play-command{--control-font:22px;}
  }
</style>
