<script lang="ts">
  import ResourceFrame from '../ResourceFrame.svelte';
  import { cardGesture } from './card-gesture';
  import { latestMoveIndex } from '$lib/game/public-table';
  import DialogFrame from "$lib/components/DialogFrame.svelte";
  import { onMount, tick, untrack } from 'svelte';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { motionDuration } from './motion';
  import { sortHand } from './hand-order';
  import { tablePurchases } from './table-purchases';
  import { measureLayout, type Layout } from './motion-layout';
  import { base } from '$app/paths';
  import { cards } from '$lib/game/cards';
  import { leaderIds, leaderLinks, type SetupState } from '$lib/game/setup';
  import type { GameCommand } from '$lib/backend/setup-repository';
  import type { CardDefinition } from '$lib/game/types';
  import CardFace from '../CardFace.svelte';
  import ResourceIcon from '../ResourceIcon.svelte';
  import GameButton from '../GameButton.svelte';
  import Portrait from './Portrait.svelte';
  import ActionChoice from './ActionChoice.svelte';
  import WorshipOverlay from './WorshipOverlay.svelte';
  import WorshipFace from './WorshipFace.svelte';
  import VictoryScene from './VictoryScene.svelte';
  import PublicTable from './PublicTable.svelte';
  import PublicMotion from './PublicMotion.svelte';
  import SupplyCoverflow from './SupplyCoverflow.svelte';
  import { activePlayer, canPlayAction, canPlayTreasure, departureReminder, definition, standings, eligibleGains } from '$lib/game/actions';

  let { game, uid, roomId, status, busy, error, command, retry, again }: {
    game: SetupState; uid: string; roomId: string; status: string; busy: boolean; error: string;
    command: (command: GameCommand, expectedRevision?: number) => Promise<void>; retry: () => void; again: () => void;
  } = $props();
  const initialRevision = untrack(() => game.activity.length);
  let motionRevision = -1;
  let motionBefore: Layout = { poses: [], width: 100 };
  $effect.pre(() => {
    const revision = game.activity.length;
    if (revision === motionRevision) return;
    untrack(() => { motionBefore = measureLayout(); motionRevision = revision; });
  });
  const animatedHand = new Set<string>();
  let selected = $state<string>('thaleia');
  let reduced = $state(true);
  let portraitLayout = $state(false);
  let drawer = $state<'players' | 'worship' | ''>('');
  function toggleDrawer(side: 'players' | 'worship') { drawer = drawer === side ? '' : side; }
  let inspected = $state<{ card: CardDefinition; copy: number; instanceId?: string } | null>(null);
  let modal = $state<'card' | 'chronicle' | 'zone' | 'advance' | 'worship' | ''>('');
  let worshipEvent = $state('counsel-of-olympus');
  let worshipSource = $state<DOMRect>();
  function worship(id: string) { worshipSource=document.querySelector<HTMLElement>(`[data-god-event="${id}"]`)?.getBoundingClientRect(); worshipEvent=id; drawer=''; void open('worship'); }
  async function prepareWorshipReturn(){if(portraitLayout){drawer='worship';await tick();await new Promise(resolve=>setTimeout(resolve,reduced?0:350));}}
  async function finishWorshipReturn(){
    if(!portraitLayout){close();return;}
    modal='';
    await tick();
    // Paint the landed card in its slot before sliding the drawer away.
    if(!reduced)await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    drawer='';
    await tick();
    document.querySelector<HTMLButtonElement>('[aria-controls="worship-drawer"]')?.focus();
  }

  let handPage = $state(0);
  let zone = $state<{ uid: string; kind: 'play' | 'discard' | 'trash'; title: string }>();
  const turnUid = $derived(activePlayer(game));
  const choice = $derived(game.turn.choice);
  const ownChoice = $derived(choice && turnUid === uid ? choice : null);
  const worshipChoice = $derived(ownChoice && definition(ownChoice.source).type==='Event' ? ownChoice : null);
  const worshipVisible = $derived(modal==='worship' || !!worshipChoice);
  let worshipTargets = $state<string[]>([]);
  const worshipChoiceId = $derived(worshipChoice?.id);
  $effect(()=>{if(worshipChoice && !modal){worshipEvent=worshipChoice.source;modal='worship';}});
  $effect(()=>{worshipChoiceId;worshipTargets=[];});
  const worshipOptions = $derived(worshipChoice ? (worshipChoice.kind==='gain' ? eligibleGains(game,worshipChoice.limit!,worshipChoice.actionOnly).slice().sort((a,b)=>(a.cost??0)-(b.cost??0)||a.id.localeCompare(b.id)).map(card=>({id:card.id,cardId:card.id,copy:card.supply[game.playerCount]-game.supply[card.id]+1})) : game.decks[uid].hand.slice().sort((a,b)=>(definition(a.cardId).cost??0)-(definition(b.cardId).cost??0))) : []);
  function selectWorshipTarget(id:string){if(!worshipChoice)return;worshipTargets=worshipTargets.includes(id)?worshipTargets.filter(value=>value!==id):worshipChoice.max===1?[id]:worshipTargets.length<worshipChoice.max?[...worshipTargets,id]:worshipTargets;}
  async function resolveWorship(){if(ready&&worshipChoice)await command({type:'choice/resolved',choiceId:worshipChoice.id,targets:worshipTargets});}

  const latestActivity = $derived(game.activity[latestMoveIndex(game)]);
  const latestMoves = $derived(game.movements.filter(move => move.sequence === latestActivity?.sequence));
  const revealed = $derived(latestMoves.find(move => move.kind === 'reveal'));
  const lastPublic = $derived([...latestMoves].reverse().find(move => ['trash', 'gain', 'discard', 'topdeck'].includes(move.kind) && move.card));
  const own = $derived(game.decks[uid]);
  const purchases = $derived(Object.fromEntries(game.players.map(player=>[player.uid,tablePurchases(game,player.uid)])));
  const playedCount = $derived(game.decks[turnUid]?.play.length ?? 0);
  const tablePlay = $derived([...(game.decks[turnUid]?.play ?? []),...(purchases[turnUid] ?? [])]);
  let handElement = $state<HTMLElement>();
  let handCapacity = $state(5);
  let tableCardWidth = $state(100);
  let handMinPeek = $state(44);
  const orderedHand = $derived(sortHand(own?.hand ?? []));
  const visibleHand = $derived(orderedHand.slice(handPage * handCapacity, (handPage + 1) * handCapacity));
  $effect(() => { if (own && handPage * handCapacity >= own.hand.length) handPage = Math.max(0, Math.ceil(own.hand.length / handCapacity) - 1); });
  $effect(() => {
    const count = own?.hand.length ?? 0;
    if (!handElement) return;
    const element = handElement;
    const resize = new ResizeObserver(() => {
      const card = element.querySelector<HTMLElement>('.hand-slot');
      if (!card) return;
      const phone = matchMedia('(max-aspect-ratio:3/4)').matches;
      const shortLandscape = matchMedia('(max-height:500px) and (min-aspect-ratio:3/4)').matches;
      const tableWidth = element.parentElement!.clientWidth, cardWidth = parseFloat(getComputedStyle(card).width);
      if (!cardWidth) return;
      const width = tableWidth * Number(getComputedStyle(element).getPropertyValue('--hand-room')) / 100;
      // Small landscape cards can expose most of their face and still overlap.
      // Use the same minimum exposure for both sizing and paging.
      const peek = Math.min(cardWidth * .85, phone || shortLandscape ? 28 : 44);
      handMinPeek = peek;
      const capacity = (room: number) => Math.max(1, Math.floor((room - 12 - cardWidth) / peek) + 1);
      // Measure the full fan first so a shrinking hand never gets stuck paging.
      const pagedRoom = Math.max(cardWidth, width - 88);
      handCapacity = count > capacity(width) ? capacity(pagedRoom) : capacity(width);
    });
    resize.observe(element.parentElement!);
    return () => resize.disconnect();
  });
  let dialog = $state<HTMLDialogElement>();
  let opener: HTMLElement | null = null;
  const links = $derived(leaderLinks(selected));
  const chooser = $derived(game.draftOrder[Object.keys(game.leaders).length]);
  const isChoice = $derived(chooser === uid && game.phase === 'draft');
  const nameOf = (id: string) => game.players.find(player => player.uid === id)!.name;
  const ownerOf = (leader: string) => Object.entries(game.leaders).find(([, value]) => value === leader)?.[0];
  const liveScores = $derived(Object.fromEntries((game.phase === 'playing' ? standings(game) : []).map(row => [row.uid,row.score])));
  const inspectedLeaderOwner = $derived(inspected?.card.type === 'Leader' ? ownerOf(inspected.card.id) : undefined);
  const opponents = $derived(game.turnOrder.filter(id => id !== uid));
  let supplyWarning = $state(false);
  const treasures = $derived(own?.hand.filter(card => definition(card.cardId).type === 'Treasure') ?? []);
  const advanceLabel = $derived(game.turn.phase === 'actions' ? 'To Treasures' : 'End turn');
  const remaining = $derived(departureReminder(game, uid));
  let resultsOpen=$state(true);
  const showResults=$derived(game.turn.phase==='finished'&&resultsOpen);
  $effect(()=>{if(game.turn.phase==='finished')untrack(()=>{resultsOpen=!modal;});});
  async function leaveResults(chronicle=false){resultsOpen=false;await tick();document.querySelector<HTMLButtonElement>('.final-control button')?.focus();if(chronicle)await open('chronicle');}
  const ready = $derived(status === 'synced' && !busy);
  const automaticTreasures = $derived(game.phase === 'playing' && turnUid === uid && game.turn.phase === 'actions' && !choice && !game.turn.queue.length && !own.hand.some(card => canPlayAction(game, uid, card.id)));
  let automaticPhaseRevision = -1;
  $effect(() => {
    if (!ready || !automaticTreasures) return;
    const revision = game.activity.length;
    if (automaticPhaseRevision === revision) return;
    automaticPhaseRevision = revision;
    // Persist the transition as an ordinary command, preserving old event streams.
    void command({type:'phase/advanced'}, revision);
  });
  $effect(() => { if (ownerOf(selected) && game.phase === 'draft') selected = leaderIds.find(id => !ownerOf(id)) ?? selected; });
  onMount(() => {
    const portrait = matchMedia('(max-aspect-ratio:3/4)');
    const updatePortrait = () => { portraitLayout = portrait.matches; drawer = ''; };
    updatePortrait(); portrait.addEventListener('change', updatePortrait);
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { reduced = media.matches; }; update(); media.addEventListener('change', update);
    return () => { media.removeEventListener('change', update); portrait.removeEventListener('change', updatePortrait); };
  });
  function arrive(node: Element) { return reduced ? { duration: 0 } : fly(node, { y: 24, duration: motionDuration(450), easing: cubicOut }); }
  function claimFlight(node: Element, leader: string | undefined) {
    if (typeof leader !== 'string' || reduced || game.activity.length <= initialRevision) return { duration: 0 };
    const source = document.querySelector(`[data-leader-choice="${leader}"]`)!.getBoundingClientRect();
    const target = node.getBoundingClientRect();
    return fly(node, { x: source.left + source.width / 2 - target.left - target.width / 2, y: source.top + source.height / 2 - target.top - target.height / 2, duration: motionDuration(450), easing: cubicOut });
  }
  function handRevision(id: string) { return game.movements.findLast(move => move.kind === 'draw' && move.card?.id === id)?.sequence ?? game.dealtAtSequence ?? 0; }
  // Keep the initial deal at the same slow-motion rate as subsequent flights.
  function deal(node: Element, index: number) {
    const id = (node as HTMLElement).dataset.instanceId!;
    const revision = handRevision(id);
    const animation = `${id}:${revision}`;
    if (animatedHand.has(animation)) return { duration: 0 };
    animatedHand.add(animation);
    if (reduced || revision <= initialRevision || revision !== game.dealtAtSequence) return { duration: 0 };
    const source = document.querySelector('.deck-pile')!.getBoundingClientRect(), target = node.getBoundingClientRect();
    return fly(node, { x: source.left + source.width / 2 - target.left - target.width / 2, y: source.top + source.height / 2 - target.top - target.height / 2, duration: motionDuration(300), delay: motionDuration(index * 40), easing: cubicOut, opacity: 1 });
  }
  function dealBack(node: Element, index: number) {
    if (reduced || !game.dealtAtSequence || game.dealtAtSequence <= initialRevision || game.activity.length !== game.dealtAtSequence) return { duration: 0 };
    const deck = node.closest('.opponent')?.querySelector('.opponent-deck');
    if (!deck) return { duration: 0 };
    const source = deck.getBoundingClientRect(), target = node.getBoundingClientRect();
    return fly(node, { x: source.left + source.width / 2 - target.left - target.width / 2, y: source.top + source.height / 2 - target.top - target.height / 2, duration: motionDuration(300), delay: motionDuration(index * 40), easing: cubicOut, opacity: 1 });
  }
  async function open(kind: 'card' | 'chronicle' | 'zone' | 'advance' | 'worship') { opener = document.activeElement as HTMLElement; modal = kind; await tick(); if (!['worship','chronicle','zone'].includes(kind)) dialog!.showModal(); }
  function inspect(id: string, copy = 1, instanceId?: string) { inspected = { card: definition(id), copy, instanceId }; void open('card'); }
  function close() { if (dialog?.open) dialog.close(); modal = ''; const target = opener; void tick().then(() => target?.focus()); }
  function inspectZone(player: string, kind: 'play' | 'discard' | 'trash', title: string) { zone = { uid: player, kind, title }; void open('zone'); }
  function playHand(id: string, copy: number, instanceId: string) {
    if (ready && (canPlayAction(game, uid, instanceId) || canPlayTreasure(game, uid, instanceId))) void command({type: definition(id).type === 'Action' ? 'action/played' : 'treasure/played', instanceId});
    else if (ready) inspect(id, copy, instanceId);
  }
  function playInspected() { const id = inspected?.instanceId; if (id && ready && (canPlayAction(game, uid, id) || canPlayTreasure(game, uid, id))) { const type = inspected!.card.type === 'Action' ? 'action/played' : 'treasure/played'; close(); void command({ type, instanceId: id }); } }
  function advance() { if (!ready || turnUid !== uid || choice || game.turn.phase === 'finished') return; if (game.turn.phase !== 'actions' && remaining) void open('advance'); else commitAdvance(); }
  function commitAdvance() { close(); handPage = 0; void command({ type: game.turn.phase === 'actions' ? 'phase/advanced' : 'turn/ended' }); }
  function choose() { if (isChoice && ready && !ownerOf(selected)) void command({ type: 'leader/chosen', leaderId: selected }); }
</script>

<svelte:window onkeydown={event => { if(event.key === 'Escape') drawer = ''; }} />

<main class="session" class:drafting={game.phase === 'draft'} data-status={status} aria-busy={busy || (status === 'synced' && automaticTreasures)}>
  <picture class="environment" aria-hidden="true"><source media="(max-aspect-ratio:3/4)" srcset={`${base}/assets/ui/table-mobile.webp`} /><img src={`${base}/assets/ui/table-desktop.webp`} alt="" draggable="false" /></picture>
  <div class="composition" class:covered={(!!ownChoice && !worshipChoice) || showResults} inert={status !== 'synced' || modal === 'chronicle' || modal === 'zone'} data-e2e-layout={modal || supplyWarning || ownChoice || showResults || status !== 'synced' ? undefined : true}>
    {#if game.phase === 'draft'}<header><a href={`${base}/`} aria-label="Back to sanctuary">‹ Sanctuary</a>{#if /^[A-Z]{4,5}$/.test(roomId)}<span><span class="code-label">Game code </span><strong>{roomId}</strong></span>{:else}<span>{game.playerCount} players</span>{/if}</header>{/if}
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
      <div class="drawer-toggles"><button aria-label="Players and Chronicle" aria-controls="player-drawer" aria-expanded={drawer === 'players'} onclick={()=>toggleDrawer('players')}>{drawer === 'players' ? '×' : '☰'}<span>Players</span></button><button aria-label="Worship" aria-controls="worship-drawer" aria-expanded={drawer === 'worship'} onclick={()=>toggleDrawer('worship')}>{drawer === 'worship' ? '×' : '☷'}<span>Worship</span></button></div>
      {#if portraitLayout && drawer}<button class="drawer-scrim" aria-label="Close sidebar" onclick={()=>drawer=''}></button>{/if}
      <aside id="player-drawer" class="player-sidebar" class:drawer-open={drawer === 'players'} inert={portraitLayout && drawer !== 'players'} aria-label="Players and Chronicle">
      <header class="table-navigation"><a href={`${base}/`} aria-label="Back to sanctuary">‹ Sanctuary</a>{#if /^[A-Z]{4,5}$/.test(roomId)}<span><span class="code-label">Game code </span><strong>{roomId}</strong></span>{:else}<span>{game.playerCount} players</span>{/if}</header>

      <section class="opponents" aria-label="Other players">
        {#each opponents as id}
          <div data-public-zone="seat" data-public-uid={id} class="opponent" data-testid="opponent" class:first={id === turnUid}>
            <button class="opponent-portrait" class:blessed={latestMoves.some(move => move.kind === 'leader' && move.uid === id)} aria-label={`Inspect ${nameOf(id)}’s leader, ${leaderLinks(game.leaders[id]).leader.name}`} onclick={()=>inspect(game.leaders[id])}><Portrait leader={game.leaders[id]} name={nameOf(id)} active={id === turnUid} /></button>
            <div class="opponent-deck" data-public-zone="deck" data-public-uid={id}><ResourceIcon resource="cards" value={game.decks[id].deck.length} label={`${nameOf(id)}’s deck: ${game.decks[id].deck.length} cards`}/></div>
            <div data-public-zone="hand" data-public-uid={id} class="hidden-hand" aria-label={`${nameOf(id)} has ${game.decks[id].hand.length} cards in hand`}>
              {#each game.decks[id].hand.slice(0, 5) as _, index}<img data-motion-key={`hidden:${id}:${index}`} data-motion-zone="hand" data-motion-uid={id} src={`${base}/assets/backs/back-deck-icon.webp`} alt="Card back" style:--index={index} draggable="false" in:dealBack|global={index} />{/each}
              {#if game.decks[id].hand.length > 5}<span class="hand-count">{game.decks[id].hand.length}</span>{/if}
            </div>
            <button data-public-zone="discard" data-public-uid={id} class="opponent-discard" aria-label={`Inspect ${nameOf(id)}’s discard pile, ${(game.decks[id].discard.length-purchases[id].length)} cards`} onclick={() => inspectZone(id, 'discard', `${nameOf(id)}’s discard`)}><ResourceIcon resource="discard" value={(game.decks[id].discard.length-purchases[id].length)} label={`${nameOf(id)}’s discard: ${(game.decks[id].discard.length-purchases[id].length)} cards`}/></button>
          </div>
        {/each}
      </section>
        <section class="live-chronicle" aria-label="Game log">
          <div class="chronicle-titlebar"><span>Chronicle</span><button data-public-zone="trash" class="trash-control" onclick={() => inspectZone(uid, 'trash', 'Shared trash')} aria-label={`Inspect shared trash, ${game.trash.length} cards`}><ResourceIcon resource="trash" value={game.trash.length} label={`${game.trash.length} cards in shared trash`} /></button><button class="log-control" aria-label="Chronicle" title="Expand Chronicle" onclick={()=>open('chronicle')}><span aria-hidden="true">↗</span></button></div>
          <div class="log-entries" role="log" aria-label="Recent game actions" aria-live="polite" aria-relevant="additions">
            {#each [...game.activity].reverse() as activity (activity.sequence)}<p class="log-entry">{activity.message}</p>{/each}
          </div>
        </section>

      <button data-public-zone="leader" data-public-uid={uid} class="own-leader" class:blessed={latestMoves.some(move => move.kind === 'leader' && move.uid === uid)} aria-label={`Inspect your leader, ${leaderLinks(game.leaders[uid]).leader.name}`} onclick={() => inspect(game.leaders[uid])}><div class="leader-face"><CardFace card={leaderLinks(game.leaders[uid]).leader} players={game.playerCount} points={liveScores[uid]} /></div><div class="leader-portrait"><Portrait leader={game.leaders[uid]} name={leaderLinks(game.leaders[uid]).leader.name.split(',')[0]} active={uid === turnUid} /></div></button>

      </aside>
      <div data-public-zone="deck" data-public-uid={uid} class="deck-pile" aria-label={`Your deck: ${own.deck.length} cards`}><ResourceIcon resource="cards" value={own.deck.length} label={`Your deck: ${own.deck.length} cards`} /></div>
      {#if worshipVisible}<WorshipOverlay {game} {uid} selected={worshipChoice?.source ?? worshipEvent} {ready} {error} {command} close={()=>void finishWorshipReturn()} sourceRect={worshipSource} prepareReturn={prepareWorshipReturn} choice={worshipChoice} targets={worshipTargets} resolve={resolveWorship}/>{/if}
      <div class="table-card-measure" bind:clientWidth={tableCardWidth} aria-hidden="true"></div>
      <div class="table-supply" inert={worshipVisible && !worshipChoice}><SupplyCoverflow sharedCardWidth={tableCardWidth} {game} {uid} {ready} {command} selection={worshipChoice ? {options:worshipOptions,selected:worshipTargets,choose:selectWorshipTarget,kind:worshipChoice.kind} : undefined} visible={(!modal || worshipVisible) && !supplyWarning && (!ownChoice || !!worshipChoice) && !showResults && !drawer} inspect={id=>inspect(id)} onDialog={open=>supplyWarning=open}/></div>
      <aside class="action-sidebar" aria-label="Worship, turn status, and controls" style:--god-count={game.sharedEvents.length}>
      <div id="worship-drawer" class="worship-drawer" class:drawer-open={drawer === 'worship'} inert={portraitLayout && drawer !== 'worship'}>
      <h2 class="drawer-title">Worship</h2>
      <section class="altars" aria-label="Shared god events" class:four={game.sharedEvents.length > 2}>
        {#each game.sharedEvents as id, index}<button data-public-zone="altar" data-public-card={id} data-god-event={id} style:visibility={worshipVisible && id === (worshipChoice?.source ?? worshipEvent) ? 'hidden' : undefined} disabled={worshipVisible} style:--altar-index={index} aria-label={`Inspect ${cards.find(card => card.id === id)!.name}`} onclick={() => worship(id)} in:arrive><WorshipFace {game} {uid} cardId={id} /></button>{/each}
      </section>

      </div>
      <section class="turn-rail" aria-label="Turn resources"><ResourceFrame /><div class="turn-marker" class:long={nameOf(turnUid).length > 12 && turnUid !== uid}><strong>{turnUid === uid ? 'Your turn' : `${nameOf(turnUid)}’s turn`}</strong><span>{game.turn.phase === 'actions' ? 'Actions' : game.turn.phase === 'treasures' ? 'Treasures' : game.turn.phase === 'finished' ? 'Complete' : 'Buys'} · Turn {game.turn.number}</span></div>
        <div class="resources"><ResourceIcon resource="actions" value={game.resources.actions} /><ResourceIcon resource="coins" value={game.resources.coins} /><ResourceIcon resource="buys" value={game.resources.buys} /><ResourceIcon resource="worship" value={game.resources.worship} /></div>
      </section>
        <div class="player-controls" inert={worshipVisible}>
      {#if turnUid === uid && game.turn.phase !== 'finished'}<div class="chronicle-control"><GameButton primary onclick={advance} disabled={!ready || !!choice}>{advanceLabel}</GameButton></div>{/if}
      {#if turnUid === uid && ['actions','treasures'].includes(game.turn.phase) && treasures.length}<div class="treasures-control"><GameButton primary disabled={!ready} onclick={()=>command({type:'treasures/played'})}>Play all Treasures</GameButton></div>{/if}
      {#if game.turn.phase==='finished'}<div class="chronicle-control final-control"><GameButton primary onclick={()=>resultsOpen=true}>Final scores</GameButton></div>{/if}
        </div>

      </aside>
      <button data-public-zone="discard" data-public-uid={uid} class="discard-pile" aria-label={`Inspect your discard pile: ${(own.discard.length-purchases[uid].length)} cards`} onclick={() => inspectZone(uid, 'discard', 'Your discard')}><ResourceIcon resource="discard" value={own.discard.length-purchases[uid].length} label={`Your discard: ${own.discard.length-purchases[uid].length} cards`} /></button>
      <div data-public-zone="play" data-public-uid={turnUid} class="play-area" aria-label="Active play area">
        {#if tablePlay.length}
          <div class="played-cards" class:with-purchases={playedCount > 0 && (purchases[turnUid]?.length ?? 0) > 0} style:--played-count={tablePlay.length}>
            {#each tablePlay as card,index (card.id)}
              <div class="played-card" style:--played-index={index} style:--purchase-offset={index >= playedCount ? 1 : 0} data-motion-key={`play:${card.id}`} data-motion-card={card.id} data-motion-face={card.cardId} data-motion-copy={card.copy} data-motion-zone="play" data-motion-uid={turnUid}><CardFace card={definition(card.cardId)} players={game.playerCount} copy={card.copy} /></div>
              <button style:--played-index={index} style:--purchase-offset={index >= playedCount ? 1 : 0} style:--played-hit-width={index === tablePlay.length - 1 || index === playedCount - 1 ? 'var(--table-card-width)' : 'var(--played-step)'} aria-label={`Inspect ${index >= playedCount ? 'purchased' : 'played'} ${definition(card.cardId).name}`} onclick={() => inspect(card.cardId, card.copy)}></button>
            {/each}
          </div>
        {:else}<span>Your play area</span>{/if}
      </div>
      {#if (revealed || lastPublic) && game.publicActivity.find(entry=>entry.sequence===latestActivity?.sequence)?.command!=='card/bought'}{#key game.activity.length}<button class="outcome" data-motion-key={revealed ? `reveal:${revealed.card!.id}` : undefined} data-motion-card={revealed?.card?.id} data-public-zone={revealed ? 'reveal' : undefined} data-public-uid={turnUid} aria-label={`Inspect ${revealed ? 'revealed' : lastPublic!.kind === 'trash' ? 'trashed' : 'gained'} ${definition((revealed ?? lastPublic)!.card!.cardId).name}`} onclick={() => inspect((revealed ?? lastPublic)!.card!.cardId, (revealed ?? lastPublic)!.card!.copy)}><div class="outcome-card"><CardFace card={definition((revealed ?? lastPublic)!.card!.cardId)} players={game.playerCount} copy={(revealed ?? lastPublic)!.card!.copy} /></div><span class="outcome-icons"><ResourceIcon resource={lastPublic?.kind === 'topdeck' ? 'topdeck' : lastPublic?.kind === 'trash' ? 'trash' : 'discard'} />{#if revealed && lastPublic?.kind === 'discard'}<ResourceIcon resource="coins" value="+2" />{/if}</span></button>{/key}{/if}

      <section inert={worshipVisible} bind:this={handElement} data-public-zone="hand" data-public-uid={uid} class="hand" aria-label="Your hand" style:--hand-count={visibleHand.length} style:--hand-spaces={Math.max(1,visibleHand.length-1)} style:--hand-min-peek={`${handMinPeek}px`}>
        {#each visibleHand as card, index (`${card.id}:${handRevision(card.id)}`)}
          <div class="hand-slot" data-motion-key={`hand:${card.id}`} data-motion-card={card.id} data-motion-face={card.cardId} data-motion-copy={card.copy} data-motion-zone="hand" data-motion-uid={uid} data-instance-id={card.id} style:--card-index={index} style:--fan-angle={`${(index-(visibleHand.length-1)/2)*Math.min(3,16/Math.max(1,visibleHand.length-1))}deg`} style:--fan-drop={`${Math.abs(index-(visibleHand.length-1)/2)*3}px`} in:deal|global={index}><div class="hand-face"><CardFace card={definition(card.cardId)} players={game.playerCount} copy={card.copy} /></div></div>
          <button data-motion-key={`hand-hit:${card.id}`} data-testid="hand-card" data-instance-id={card.id} aria-label={`${canPlayAction(game,uid,card.id)||canPlayTreasure(game,uid,card.id)?'Play':'Inspect'} hand card ${handPage * handCapacity + index + 1}: ${definition(card.cardId).name}`} aria-describedby="hand-help" style:--card-index={index} use:cardGesture={{activate:()=>playHand(card.cardId,card.copy,card.id),inspect:()=>inspect(card.cardId,card.copy,card.id)}}></button>
        {/each}
        <span id="hand-help" class="sr-only">Click or tap to play. Right-click, hold, or press Shift+F10 to inspect before playing.</span>
      </section>
      {#if own.hand.length > handCapacity}<nav class="hand-pages" aria-label="Hand pages"><button aria-label="Previous hand cards" disabled={handPage === 0} onclick={() => handPage--}>‹</button><span>{handPage + 1} / {Math.ceil(own.hand.length / handCapacity)}</span><button aria-label="Next hand cards" disabled={(handPage + 1) * handCapacity >= own.hand.length} onclick={() => handPage++}>›</button></nav>{/if}



    {/if}
    {#if error}<p class="error" role="alert">{error}</p>{/if}
  </div>
  {#if status !== 'synced'}<div class="connection" role="status" data-e2e-layout><p>Connection lost. Your place is kept.</p><GameButton onclick={retry}>Try again</GameButton></div>{/if}
</main>
<dialog class="framed-dialog" class:decision={modal==='advance'} bind:this={dialog} oncancel={event => { event.preventDefault(); close(); }} aria-labelledby="session-dialog-title" data-e2e-layout={modal && !['worship','chronicle','zone'].includes(modal) ? true : undefined} class:inspection={modal === 'card'}>
  <DialogFrame />
  <button class="close" aria-label="Close" onclick={close}>×</button>
  {#if modal === 'card' && inspected}<h2 id="session-dialog-title">{inspected.card.name}</h2><div class="inspected" class:landscape={inspected.card.type === 'Leader' || inspected.card.type === 'Event'}><CardFace card={inspected.card} players={game.playerCount} copy={inspected.copy} points={inspectedLeaderOwner ? liveScores[inspectedLeaderOwner] : undefined} /></div>
    {#if inspected.instanceId && (inspected.card.type === 'Action' || inspected.card.type === 'Treasure')}<div class="play-command"><GameButton primary onclick={playInspected} disabled={!ready || !(canPlayAction(game, uid, inspected.instanceId) || canPlayTreasure(game, uid, inspected.instanceId))}>Play {inspected.card.name}</GameButton>{#if !(canPlayAction(game, uid, inspected.instanceId) || canPlayTreasure(game, uid, inspected.instanceId))}<p>{turnUid !== uid ? 'Wait for your turn.' : choice ? 'Finish your current choice.' : inspected.card.type === 'Treasure' ? 'Treasures cannot be played after buying.' : game.resources.actions < 1 ? 'No Actions remaining.' : 'The Action phase is over.'}</p>{/if}</div>{/if}
  {:else if modal === 'advance'}<h2 id="session-dialog-title">{game.turn.phase === 'actions' ? 'Leave Actions?' : 'End your turn?'}</h2><div class="confirm-resources"><ResourceIcon resource="coins" value={game.resources.coins}/><ResourceIcon resource="buys" value={game.resources.buys}/><ResourceIcon resource="worship" value={game.resources.worship}/></div><p>You can still {remaining?.verb} {remaining?.verb==='worship'?remaining.card.god:remaining?.card.name}.</p><div class="confirm-controls"><GameButton primary onclick={close}>Keep playing</GameButton><GameButton onclick={commitAdvance} disabled={!ready}>{advanceLabel}</GameButton></div>
  {/if}
</dialog>
{#if modal === 'chronicle' || modal === 'zone'}<PublicTable {game} {uid} initialTab={modal === 'zone' ? zone!.kind : 'chronicle'} owner={modal === 'zone' ? zone!.uid : uid} {close}/>{/if}
<PublicMotion previousLayout={()=>motionBefore} {game} {status} {reduced} visible={!modal && !supplyWarning && !ownChoice && !showResults}/>

{#if ownChoice && !worshipChoice}<ActionChoice {game} {uid} choice={ownChoice} {ready} {error} {command} {status} {retry} />{/if}

{#if showResults}<VictoryScene {game} {uid} {busy} {status} {error} {again} {retry} close={()=>void leaveResults()} chronicle={()=>void leaveResults(true)}/>{/if}

<style>
  @media(min-aspect-ratio:3/4){.composition:has(.treasures-control) .hand-pages{left:85%;width:14%;bottom:24%;}}

  .turn-marker{border:0;background:none;color:inherit;padding:0;cursor:pointer;min-height:44px;}.treasures-control{position:absolute;left:2%;top:73%;width:16%;--control-height:clamp(48px,4.8svh,104px);--control-font:clamp(23px,2.3svh,50px);}.confirm-resources{display:flex;gap:24px;justify-content:center;--icon-size:30px;margin:24px;}.confirm-controls{display:flex;gap:24px;margin:32px auto 12px;max-width:640px;--control-height:56px;--control-font:24px;}.confirm-controls :global(button){flex:1;}dialog.decision{width:min(780px,94vw);max-height:94svh;border:0;box-shadow:none;padding:70px 70px 55px;}dialog.decision h2{font-size:clamp(32px,4svh,72px);margin-top:0;}dialog.decision .close{display:none;}dialog.decision::backdrop{background:#02081155;backdrop-filter:none;}@media(max-aspect-ratio:3/4){dialog.decision{padding:58px 35px 45px;}.confirm-controls{flex-direction:column;gap:6px;margin-top:20px;}.confirm-resources{margin:18px 0;gap:20px;}}
  @media(max-aspect-ratio:3/4){.treasures-control{left:35%;top:53%;width:30%;--control-height:44px;--control-font:17px;}.chronicle-control{--control-font:19px!important;}.confirm-controls{flex-direction:column;gap:16px;}.confirm-controls :global(button){flex:auto;}}

  .composition:has(.outcome) .play-area{left:34%;top:44%;width:20%;height:17%;}.composition:has(.outcome) .played-cards{margin-left:0;}.composition:has(.outcome) .played-cards button:not(:last-child){display:none;}.outcome{left:56%!important;top:44%!important;width:18%!important;height:17%!important;flex-direction:row!important;}.outcome-card{width:min(54%,12svh)!important;flex-shrink:0;}
  .blessed{filter:drop-shadow(0 0 9px #ffe091);}
  .hand-count{position:absolute;right:0;bottom:0;min-width:24px;background:#071321;border:1px solid #b99a51;border-radius:50%;text-align:center;}
  .trash-control{position:absolute;left:46%;top:1%;width:8%;height:44px;background:#071321c9;border:1px solid #aa8e52;border-radius:12px;--icon-size:20px;z-index:6;}.opponent-discard{border:0;padding:0 4px;background:#07132199;min-height:44px;font:inherit;color:inherit;border-radius:6px;}.played-cards{display:flex;gap:12px;height:100%;justify-content:center;}.played-cards button{height:100%;aspect-ratio:5/7;padding:0;border:0;background:none;}.play-area:has(.played-cards){left:31%;width:38%;}.play-area:has(.played-cards) .played-cards{margin-left:25%;}.outcome{position:absolute;left:4%;top:7%;width:13%;height:23%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:0;border:0;background:none;--icon-size:clamp(18px,2svh,42px);}.outcome-card{width:70%;}.hand-pages{position:absolute;left:1%;bottom:22%;width:18%;display:flex;justify-content:center;gap:8px;align-items:center;font-size:clamp(12px,1.6svh,32px);}.hand-pages button{min-width:44px;min-height:44px;border:1px solid #b99653;background:#071321;border-radius:8px;color:#f2d694;font-size:24px;}.discard-pile{border:0;padding:0;background:none;color:inherit;}.play-command{max-width:440px;margin:16px auto 0;--control-height:52px;--control-font:24px;}.play-command p{margin:8px 0 0;color:#edca8d;font-size:15px;}.inspection:has(.play-command) .inspected{width:min(260px,35svh);}
  .composition.covered{visibility:hidden;}
  .session{height:100svh;min-height:600px;position:relative;isolation:isolate;overflow:clip;background:#071321;}.environment{position:absolute;inset:0;z-index:-2;}.environment img{height:100%;width:100%;object-fit:cover;}.composition{height:100%;position:relative;--control-height:clamp(50px,6.5svh,128px);--control-font:clamp(22px,3svh,58px);}
  header{position:absolute;top:1.2%;left:2%;right:2%;display:flex;justify-content:space-between;align-items:center;z-index:6;font-size:clamp(12px,1.6svh,30px);}header a,header>span{padding:8px 14px;background:#071522d9;border:1px solid #ae91516b;border-radius:24px;color:#ecd5a1;text-decoration:none;}header a{min-height:44px;display:flex;align-items:center;}header strong{letter-spacing:.12em;}
  button{color:inherit;}button.draft-card,.leaders button,.altars button,.own-leader,.hand button{position:relative;border:0;background:none;padding:0;}button:focus-visible{outline:3px solid #ffdf8e;outline-offset:3px;border-radius:8px;}.draft-card:hover,.altars button:hover{filter:brightness(1.13);}
  .draft-title{position:absolute;left:5%;top:10%;width:28%;text-align:center;z-index:2;text-shadow:0 2px 5px #000;}h1{font:500 clamp(36px,5.4svh,110px)/.95 'Cormorant Garamond',serif;text-transform:uppercase;color:#f4db9f;margin:0;}.draft-title p{font:500 clamp(22px,3svh,58px)/1.2 'Cormorant Garamond',serif;margin:20px 0;}
  .hero{position:absolute;top:3%;left:26%;width:43%;height:52%;object-fit:contain;object-position:center bottom;pointer-events:none;}
  button.leader-card{position:absolute;left:17%;top:37%;width:min(37vw,57svh);z-index:2;}button.temple-card{position:absolute;left:57%;top:41%;width:min(13vw,20svh);z-index:2;}button.event-card{position:absolute;left:72%;top:43%;width:min(22vw,31svh);z-index:2;}
  .leaders{position:absolute;left:28%;width:44%;bottom:12%;display:flex;justify-content:center;gap:3%;}.leaders button{width:min(10vw,15svh);flex-shrink:0;}.taken{filter:saturate(.4);}.taken-by{position:absolute;bottom:-12%;left:0;width:100%;text-align:center;font-size:clamp(10px,1.4svh,26px);color:#ffdf8e;}.choose{position:absolute;bottom:2.6%;left:35%;width:30%;}.choose p{text-align:center;font:500 clamp(22px,3svh,56px)/1.2 'Cormorant Garamond',serif;margin:0;padding:12px;background:#071321bb;border-radius:20px;}
  .draft-order{position:absolute;right:3%;top:9%;width:14%;text-align:center;}.draft-order h2{font:500 clamp(14px,1.8svh,34px)/1 'Cormorant Garamond',serif;color:#edd196;text-transform:uppercase;letter-spacing:.08em;margin:0 0 12px;}.draft-order>div{display:flex;flex-direction:column;align-items:center;}.order-portrait{width:min(8vw,12svh);}.draft-order p{font-size:clamp(11px,1.3svh,26px);line-height:1.2;margin:0 0 10px;}.order-index{display:none;}.current p{color:#ffe099;}
  .draft-order.many{display:grid;grid-template-columns:1fr 1fr;gap:10px;}.draft-order.many h2{grid-column:1/-1;}.many .order-portrait{width:8svh;}.many p{font-size:clamp(10px,1.2svh,24px);}
  .opponents{position:absolute;top:5%;left:22%;width:56%;height:13%;display:flex;justify-content:center;gap:6%;}.opponent{position:relative;display:grid;grid-template-columns:1fr 1.6fr;align-items:center;width:40%;max-width:34svh;}.opponent-portrait{width:100%;max-width:10svh;}.hidden-hand{position:relative;display:flex;justify-content:center;min-width:0;height:9svh;}.hidden-hand img{width:25%;height:100%;object-fit:contain;margin-left:-7%;}
  .table-supply{position:absolute;left:0;top:20%;width:100%;height:34%;}
  
  .altars{position:absolute;left:1%;top:41%;width:98%;display:grid;grid-template-columns:18% 18%;justify-content:space-between;gap:2svh;pointer-events:none;}.altars button{pointer-events:auto;}.altars.four{top:35%;grid-template-columns:min(14vw,20svh) min(14vw,20svh);gap:1svh;}
  .play-area{position:absolute;left:24%;top:46%;height:14%;width:52%;display:grid;place-items:center;}.play-area span{font:500 clamp(20px,3svh,54px)/1 'Cormorant Garamond',serif;color:#ead8b4b0;text-shadow:0 2px 4px #000;}
  .chronicle-control{position:absolute;right:2%;top:65%;width:15%;--control-height:clamp(44px,5svh,100px);--control-font:clamp(20px,2.6svh,50px);}
  .turn-rail{position:absolute;left:23%;top:63%;width:54%;height:10%;isolation:isolate;padding:0 3%;display:flex;align-items:center;justify-content:center;} .turn-marker{width:35%;display:grid;text-align:center;font:600 clamp(18px,2.6svh,52px)/1.1 'Cormorant Garamond',serif;color:#f6dfac;}.turn-marker span{font-size:.65em;margin-top:4px;}.resources{display:flex;justify-content:space-evenly;width:65%;--icon-size:clamp(20px,3svh,64px);--icon-number-scale:.8;}
  .hand{position:absolute;left:29%;bottom:3%;width:calc(var(--hand-room) * 1%);--hand-room:54;height:clamp(130px,23svh,460px);--hand-card-width:clamp(94px,15svh,300px);--fan-width:min(calc(100% - 12px),max(calc(var(--hand-card-width) * (1 + (var(--hand-count) - 1) * .48)),calc(var(--hand-card-width) + (var(--hand-count) - 1) * var(--hand-min-peek))));--fan-step:calc((var(--fan-width) - var(--hand-card-width)) / var(--hand-spaces));}
  .hand-slot,.hand button{position:absolute;left:calc((100% - var(--fan-width))/2 + var(--card-index)*var(--fan-step));bottom:0;}
  .hand-slot{width:var(--hand-card-width);z-index:calc(var(--card-index)*2);pointer-events:none;}
  .hand-face{transform:translateY(var(--fan-drop)) rotate(var(--fan-angle));transform-origin:50% 100%;pointer-events:none;}
  .hand button{height:calc(var(--hand-card-width) * 1.2);width:var(--fan-step);z-index:calc(var(--card-index)*2 + 1);min-width:0;}
  .hand button:last-of-type{width:var(--hand-card-width);}
  .hand-slot:has(+ button:hover),.hand:not(:has(button:hover)) .hand-slot:has(+ button:focus-visible){filter:brightness(1.13) drop-shadow(0 0 5px #eebd63);}
  .hand:has(button:hover) button:focus-visible{outline:none;}
  .own-leader{position:absolute!important;left:1%;bottom:3%;width:17%;}.leader-portrait{display:none;}.deck-pile{position:absolute;left:19%;bottom:3%;width:7%;}.discard-pile{position:absolute;right:3%;bottom:4%;width:10%;text-align:center;font-size:clamp(12px,1.8svh,34px);}
  .error{position:absolute;left:24%;width:52%;top:29%;text-align:center;padding:12px;background:#481f18ee;border:1px solid #cb9872;border-radius:12px;color:#fff0cd;z-index:9;}.connection{position:absolute;left:30%;top:42%;width:40%;background:#071321ef;border:1px solid #b2914f;border-radius:16px;padding:20px;text-align:center;z-index:10;}.connection p{margin:0 0 16px;}
  dialog{width:min(900px,94vw);max-height:95svh;padding:28px;border:2px solid #b58b48;border-radius:20px;background:linear-gradient(#132431f5,#07111cfb);color:#f2dfb9;text-align:center;box-shadow:0 20px 80px #000b;}dialog::backdrop{background:#020811bb;backdrop-filter:blur(6px);}dialog h2{font:600 30px/1 'Cormorant Garamond',serif;margin:14px 32px 24px;}.close{position:absolute;right:7px;top:7px;width:44px;height:44px;border:0;background:none;font-size:28px;}.inspected{width:min(360px,49svh,78vw);margin:auto;}.inspected.landscape{width:min(680px,102svh,80vw);}
  @media(max-aspect-ratio:3/4){
    .session{min-height:0;}header{top:1%;left:2%;right:2%;font-size:11px;}header a,header>span{padding:6px 10px;}header a{min-height:34px;}
    .draft-title{left:10%;width:80%;top:6%;}h1{font-size:clamp(28px,7.2vw,50px);line-height:.92;}.draft-title h1 br{display:none;}.draft-title p{font-size:20px;margin:9px 0;}.hero{left:10%;top:13%;width:80%;height:27%;}
    button.leader-card{left:7%;top:31%;width:86%;}button.temple-card{left:13%;top:56%;width:25%;}button.event-card{left:43%;top:56%;width:46%;}
    .leaders{left:5%;width:90%;bottom:auto;top:74%;gap:1%;}.leaders button{width:24%;}.taken-by{font-size:10px;bottom:-7%;}.choose{left:10%;width:80%;bottom:2.5%;--control-height:50px;--control-font:25px;}.choose p{font-size:23px;padding:10px;}
    .draft-order,.draft-order.many{display:flex;top:auto;bottom:10%;left:3%;width:94%;right:auto;display:flex;justify-content:center;gap:8px;}.draft-order h2,.order-portrait{display:none;}.draft-order>div{flex:1;min-width:0;}.draft-order p{font-size:10px;margin:0;}.order-index{display:inline;}
    .opponents{top:6%;left:7%;width:86%;height:17%;gap:4%;}.opponent{width:100%;max-width:40svh;grid-template-columns:1fr;justify-items:center;}.opponent-portrait{width:23vw;max-width:11svh;}.opponents:has(.opponent:nth-child(2)) .opponent-portrait{width:20vw;max-width:6svh;}.hidden-hand{height:6svh;width:100%;}.hidden-hand img{width:19%;margin-left:-5%;}
    .altars,.altars.four{top:26%;left:3%;width:94%;grid-template-columns:48% 48%;gap:1svh;}.altars.four{top:24%;grid-template-columns:39% 39%;justify-content:space-around;}
    .play-area{top:44%;left:21%;width:58%;height:7%;}.play-area span{font-size:20px;}.chronicle-control{top:53%;right:3%;width:32%;--control-height:44px;--control-font:21px;}
    .turn-marker.long{font-size:14px;}
    .turn-rail{top:60%;left:3%;width:94%;height:9%;padding:0 6%;}.turn-marker{font-size:19px;width:35%;}.resources{--icon-size:23px;--icon-number-scale:.8;}
    .hand{left:4%;--hand-room:92;bottom:13%;height:21svh;--hand-card-width:min(30vw,14svh);}
    .own-leader{left:37%!important;bottom:1%!important;width:26%!important;}.leader-face{display:none;}.leader-portrait{display:block;}.deck-pile{left:9%;bottom:2%;width:14%;}.discard-pile{right:6%;bottom:2%;width:20%;font-size:12px;}.discard-pile{height:10%;}
    .error{left:5%;width:90%;top:19%;font-size:13px;padding:8px;}.connection{left:8%;width:84%;font-size:15px;--control-height:48px;--control-font:25px;}
    dialog{padding:20px 16px;}dialog h2{font-size:25px;margin:18px 28px 20px;}
  }
  /* Keep supply, hand, resources, and the result together on the phone table. */
  @media(max-aspect-ratio:3/4){
    .trash-control{left:42%;top:1%;width:16%;--icon-size:18px;}
    .played-cards button:first-child:nth-last-child(3){display:none;}.play-area:has(.played-cards) .played-cards{margin:0;gap:6px;}
    .composition:has(.hand-pages) .hand{left:48px;width:calc(100% - 96px);}
    .hand-pages{left:0;width:100%;z-index:4;justify-content:space-between;pointer-events:none;}.hand-pages span{position:absolute;left:0;bottom:-18px;width:44px;text-align:center;font-size:11px;}.hand-pages button{pointer-events:auto;min-width:44px;min-height:44px;}
    .inspection:has(.play-command) .inspected{width:min(56vw,35svh);}.play-command{--control-font:22px;}

    .composition .opponents{top:9%;left:3%;width:94%;height:10%;gap:2%;}
    .composition .opponents .opponent,.composition:has(.outcome) .opponents .opponent{display:grid;grid-template-columns:1fr;grid-template-rows:min(32px,4svh) min(16px,2svh) 24px;justify-items:center;align-items:center;gap:0;max-width:150px;}
    .composition .opponents .opponent-portrait,.composition:has(.outcome) .opponents .opponent-portrait{width:min(32px,4svh);max-width:32px;grid-row:auto;}
    .composition .opponents .hidden-hand,.composition:has(.outcome) .opponents .hidden-hand{height:min(16px,2svh);max-width:100px;}.composition .opponent-discard{min-height:24px;font-size:8px;}
    .composition .altars,.composition:has(.outcome) .altars,.composition:has(.played-cards) .altars.four{top:20%;left:3%;width:94%;display:flex;justify-content:space-evenly;gap:4px;}
    .composition .altars button{width:min(21vw,9svh);flex-shrink:0;}
    .table-supply{top:27%;left:0;width:100%;height:32%;}
    .composition .play-area,.composition:has(.outcome) .play-area{left:26%;top:53%;width:48%;height:7%;}
    .composition:has(.outcome) .play-area{left:22%;width:23%;}.composition .outcome{left:49%!important;top:53%!important;width:29%!important;height:7%!important;--icon-size:10px;}
    .composition .outcome-card{width:50%!important;max-width:5svh;}
    .composition .treasures-control{left:3%;top:63%;width:47%;--control-font:17px;}
    .composition .chronicle-control{right:3%;top:63%;width:44%;--control-font:17px!important;}
    .composition .turn-rail{top:71%;height:8%;}.composition .resources{--icon-size:21px;}
    .composition .hand{bottom:7%;height:13svh;--hand-card-width:min(27vw,9svh);}.composition .hand-pages{bottom:7%;}
    .composition .own-leader{left:44%!important;bottom:.5%!important;width:6svh!important;}
    .composition .deck-pile{left:12%;bottom:.5%;width:calc(6svh * 5 / 7);}
    .composition .discard-pile{right:6%;bottom:.5%;height:6%;width:23%;font-size:10px;}
  }
  @media(max-height:600px) and (max-aspect-ratio:3/4){
    .composition .turn-marker{font-size:14px;}
  }
  @media(max-height:500px) and (min-aspect-ratio:3/4){
    .hand-face{transform:translateY(min(var(--fan-drop),max(0px,calc(4svh - var(--hand-card-width)*.15)))) rotate(var(--fan-angle));}
    .composition:has(.hand-pages) .hand{left:32%;width:36%;}
    .composition .hand-pages,.composition:has(.treasures-control) .hand-pages{left:21%;width:58%;bottom:3%;justify-content:space-between;pointer-events:none;z-index:4;}
    .hand-pages button{pointer-events:auto;}.hand-pages span{position:absolute;left:0;bottom:-8px;width:44px;text-align:center;font-size:8px;line-height:8px;}
    .session{min-height:0;}header{font-size:9px;}header a{min-height:26px;padding:3px 8px;}header>span{padding:3px 8px;}.trash-control{height:26px;min-height:26px;--icon-size:10px;}
    .opponents{top:10%;height:12%;}.opponent-portrait{max-width:min(26px,6svh);}.hidden-hand{height:min(20px,5svh);}.opponent-discard{min-height:24px;font-size:8px;}
    .table-supply{top:23%;height:38%;left:0;width:100%;}
    .altars{top:34%;grid-template-columns:15% 15%;gap:4px;}
    .altars.four{top:28%;grid-template-columns:min(12vw,18svh) min(12vw,18svh);gap:2px;}
    .composition .play-area,.composition:has(.outcome) .play-area{top:57%;height:11%;left:32%;width:36%;}.composition:has(.outcome) .play-area{left:32%;width:16%;}
    .outcome{left:51%!important;top:57%!important;width:17%!important;height:11%!important;--icon-size:10px;}.outcome-card{max-width:7svh;}
    .treasures-control{top:60%;left:1%;width:19%;--control-font:12px;--control-height:34px;min-height:34px;font-size:10px;}
    .chronicle-control{top:60%;right:1%;width:19%;--control-height:34px;--control-font:13px;}
    .turn-rail{top:71%;height:13%;left:22%;width:56%;}.turn-marker{font-size:13px;min-height:32px;}.resources{--icon-size:15px;}
    .hand{left:23%;--hand-room:54;bottom:4%;height:15svh;--hand-card-width:10svh;}.own-leader{left:1%!important;bottom:1%;width:13%;}.deck-pile{left:16%;bottom:1%;width:4%;}.discard-pile{bottom:1%;right:2%;width:12%;font-size:9px;}
  }
  /* Layout study: a full-width supply band, with public play below it. */
  @media(min-height:501px) and (min-aspect-ratio:3/4){
    .altars,.altars.four{top:55%;grid-template-columns:min(12vw,14svh) min(12vw,14svh);gap:1svh;}
    .composition .play-area,.composition:has(.outcome) .play-area{top:55%;height:8%;}
    .composition .outcome{top:55%!important;height:8%!important;}.chronicle-control{top:74%;}
  }
  @media(max-aspect-ratio:3/4){
    .composition .play-area,.composition:has(.outcome) .play-area{top:60%;height:5%;}
    .composition .outcome{top:60%!important;height:5%!important;}
    .composition .treasures-control,.composition .chronicle-control{top:64%;}
    .composition .turn-rail{top:73%;height:7%;}
  }
  @media(max-height:500px) and (min-aspect-ratio:3/4), (max-height:900px) and (min-aspect-ratio:3/2){
    .composition{--worship-end:min(15vw,29svh);}
    .opponents{top:9%;height:10%;}
    .opponent{grid-template-columns:min(26px,6svh) 1fr;grid-template-rows:3svh 20px;gap:0 3px;}
    .opponent-portrait{grid-row:1/3;}.hidden-hand{height:3svh;}.opponent-discard{min-height:20px;}
    /* Worship cards bookend the same band as the supply, instead of taking a row. */
    .table-supply{top:20%;height:45%;left:calc(var(--worship-end) + 8px);width:calc(100% - 2 * var(--worship-end) - 16px);}
    .altars,.altars.four{top:20%;left:0;width:100%;height:45%;display:grid;grid-template-columns:var(--worship-end) var(--worship-end);justify-content:space-between;align-content:center;align-items:center;gap:8px 0;}
    .altars button{width:100%;}
    .composition .play-area,.composition:has(.outcome) .play-area{top:66%;height:5%;}
    .composition .outcome{top:66%!important;height:5%!important;}
    .treasures-control,.chronicle-control{top:65%;}
    .turn-rail{top:74%;height:10%;}
    .hand{bottom:3%;height:15svh;--hand-card-width:10svh;}
    .composition .hand-pages,.composition:has(.treasures-control) .hand-pages{bottom:3%;}
  }
  /* Table tools share one corner, leaving the top center for opponent hands. */
  .session:not(.drafting) header{right:auto;max-width:21%;flex-direction:column;align-items:flex-start;gap:3px;font-size:clamp(9px,1.3svh,22px);}
  .session:not(.drafting) header>span{padding:3px 8px;}
  .turn-marker{cursor:default;}
  @media(min-aspect-ratio:3/4){
    .composition .opponents{top:1%;left:24%;width:52%;}
    .table-supply{top:16%;}
    .composition .play-area,.composition:has(.outcome) .play-area{top:51%;height:12%;}
    .composition .outcome{top:51%!important;height:12%!important;}
  }
  @media(max-aspect-ratio:3/4){
    .session:not(.drafting) header{max-width:40%;}
    .session:not(.drafting) .code-label{display:none;}
  }
  @media(max-height:500px) and (min-aspect-ratio:3/4), (max-height:900px) and (min-aspect-ratio:3/2){
    .session:not(.drafting) .code-label{display:none;}
    .table-supply,.altars,.altars.four{top:12%;}
    .composition .play-area,.composition:has(.outcome) .play-area{top:58%;height:13%;}
    .composition .outcome{top:58%!important;height:13%!important;}
  }
  .outcome-icons{display:contents;}
  @media(max-aspect-ratio:3/4){.outcome-icons{display:flex;flex-direction:column;align-items:center;gap:5px;}}
  /* Size study: the same portrait card dimensions in all three active zones. */
  .table-card-measure{position:absolute;width:var(--table-card-width);height:0;visibility:hidden;pointer-events:none;}
  .composition{--table-card-height:min(22svh,44vw);--table-card-width:calc(var(--table-card-height) / 1.4);--supply-top:13svh;--supply-nav:0px;--play-top:calc(var(--supply-top) + var(--table-card-height) + var(--supply-nav) + 8px);}
  .composition .table-supply{top:var(--supply-top);height:calc(var(--table-card-height) + var(--supply-nav) + 2px);}
  .composition .hand{--hand-card-width:var(--table-card-width);height:var(--table-card-height);bottom:3%;}
  .composition .play-area,.composition:has(.outcome) .play-area{top:var(--play-top);height:var(--table-card-height);}
  .composition .played-cards{height:var(--table-card-height);margin:0;gap:6px;}
  .composition .played-cards button{width:var(--table-card-width);height:var(--table-card-height);flex-shrink:0;}
  .composition .outcome{top:var(--play-top)!important;height:var(--table-card-height)!important;}
  .composition .outcome-card{width:var(--table-card-width)!important;max-width:none;}
  .composition .treasures-control,.composition .chronicle-control{top:64%;}
  .composition .turn-rail{top:64%;height:10%;}
  @media(max-aspect-ratio:3/4){
    .composition{--table-card-height:min(17svh,40vw);--supply-top:27svh;}
    .composition .hand{bottom:7%;}
    .composition .treasures-control,.composition .chronicle-control{top:64%;}
    .composition .turn-rail{top:69%;height:6%;}
    .composition .play-area{left:10%;width:80%;}
    .composition:has(.outcome) .play-area{left:2%;width:calc(96% - var(--table-card-width) - 40px);}
    .composition .outcome{left:auto!important;right:2%;width:calc(var(--table-card-width) + 32px)!important;}
  }
  @media(max-height:500px) and (min-aspect-ratio:3/4), (max-height:900px) and (min-aspect-ratio:3/2){
    .composition{--table-card-height:22svh;--supply-top:max(10svh,56px);}
    .composition .altars{top:var(--supply-top);height:calc(var(--table-card-height) + var(--supply-nav));align-content:start;}
    .composition .turn-rail{top:64%;height:10%;}
    .composition .treasures-control,.composition .chronicle-control{top:64%;}
  }
  /* Short portrait screens still need a full touch row above the resource rail. */
  @media(max-aspect-ratio:3/4) and (max-height:700px){
    .composition{--table-card-height:15svh;}
    .composition .treasures-control,.composition .chronicle-control{top:calc(var(--play-top) + var(--table-card-height) + 4px);}
  }
  /* Opponent piles sit beside the hand, without a second row of labels. */
  .composition .opponents .opponent,.composition:has(.outcome) .opponents .opponent{display:grid;grid-template-columns:auto auto minmax(0,1fr) auto;grid-template-rows:auto;align-items:center;gap:3px;max-width:44svh;}
  .composition .opponents .opponent-portrait,.composition:has(.outcome) .opponents .opponent-portrait{grid-row:auto;width:min(5vw,7svh);max-width:none;}
  .composition .opponents .hidden-hand,.composition:has(.outcome) .opponents .hidden-hand{height:5svh;width:100%;max-width:none;}
  .opponent-deck,.composition .opponent-discard{--icon-size:clamp(12px,2.5svh,32px);}
  .composition .opponent-discard{padding:0;min-width:32px;min-height:32px;display:grid;place-items:center;background:none;}
  @media(max-aspect-ratio:3/4){
    .composition .opponents .opponent,.composition:has(.outcome) .opponents .opponent{grid-template-columns:auto minmax(0,1fr) auto;gap:2px;}
    .composition .opponents .opponent-portrait,.composition:has(.outcome) .opponents .opponent-portrait{grid-column:1/-1;width:24px;}
    .composition .opponents .hidden-hand,.composition:has(.outcome) .opponents .hidden-hand{height:20px;}
    .opponent-deck,.composition .opponent-discard{--icon-size:12px;}
  }
  /* Desktop Worship cards use the side space beside the public play area. */
  @media(min-width:1000px) and (min-height:901px) and (min-aspect-ratio:3/4){
    .composition .altars,.composition .altars.four{top:var(--play-top);left:1%;width:98%;height:calc(73svh - var(--play-top) - 8px);display:grid;grid-template-columns:min(22vw,calc(var(--table-card-height) * 1.4)) min(22vw,calc(var(--table-card-height) * 1.4));justify-content:space-between;align-content:start;gap:12px 0;}
    .composition .altars.four{grid-template-columns:min(22vw,calc((73svh - var(--play-top) - 20px) * .7)) min(22vw,calc((73svh - var(--play-top) - 20px) * .7));}
    .composition .altars button{width:100%;}
  }
  @media(min-width:1000px) and (min-height:501px) and (max-height:900px) and (min-aspect-ratio:3/2){
    .composition{--worship-end:min(20vw,calc(var(--table-card-height) * 1.4));}
    .composition .altars,.composition .altars.four{height:calc(var(--table-card-height) * 2 + 12px);align-content:start;gap:12px 0;}
  }
  .composition .play-area .played-cards{margin:0;}
  .composition .played-cards{position:relative;width:100%;--group-offset:0px;--played-span:min(100%,calc(var(--table-card-width) * var(--played-count)));--played-step:calc((var(--played-span) - var(--table-card-width)) / max(1,var(--played-count) - 1));}
  .composition .played-card,.composition .played-cards button,.composition:has(.outcome) .played-cards button:not(:last-child),.composition .played-cards button:first-child:nth-last-child(3){display:block;position:absolute;left:calc((100% - var(--played-span)) / 2 + var(--played-index) * var(--played-step) + var(--purchase-offset) * var(--group-offset));top:0;z-index:var(--played-index);}
  .composition .played-card{width:var(--table-card-width);height:var(--table-card-height);pointer-events:none;}
  .composition .played-cards button{width:var(--played-hit-width);aspect-ratio:auto;}
  @media(min-height:901px) and (min-aspect-ratio:3/4){
    .composition .treasures-control,.composition .chronicle-control{top:73%;}
    
  }
  /* Reserve a full card edge plus a clear gap between the two overlapping groups. */
  .composition .played-cards.with-purchases{
    --purchase-gap:clamp(16px,2vw,32px);
    --played-span:max(calc(2 * var(--table-card-width) + var(--purchase-gap)),min(100%,calc(var(--table-card-width) * var(--played-count) + var(--purchase-gap))));
    --played-step:calc((var(--played-span) - 2 * var(--table-card-width) - var(--purchase-gap)) / max(1,var(--played-count) - 2));
    --group-offset:calc(var(--table-card-width) + var(--purchase-gap) - var(--played-step));
  }

  /* Three-column table study: only cards occupy the central vertical stack. */
  .session:not(.drafting){min-height:0;}
  .session:not(.drafting) .composition{--center-left:22%;--center-width:53%;--table-card-height:min(29svh,38vw);--supply-top:2svh;--play-top:35svh;}
  .player-sidebar,.action-sidebar{position:absolute;top:1%;display:flex;flex-direction:column;gap:clamp(5px,1svh,20px);min-height:0;z-index:5;}
  .player-sidebar{left:1%;width:20%;bottom:23%;overflow:auto;scrollbar-width:thin;}
  .action-sidebar{right:1%;width:23%;bottom:1%;}
  .session .player-sidebar .opponents{position:static;width:100%;height:auto;display:flex;flex-direction:column;gap:clamp(6px,1.4svh,26px);flex-shrink:0;}
  .session .player-sidebar .opponents .opponent{width:100%;max-width:none;grid-template-columns:auto minmax(0,1fr) auto;grid-template-rows:auto auto;gap:2px 4px;}
  .session .player-sidebar .opponents .opponent-portrait{grid-column:1/-1;width:clamp(30px,6svh,120px);justify-self:center;}
  .session .player-sidebar .opponents .hidden-hand{height:clamp(20px,4svh,80px);width:100%;}
  .session .player-sidebar .opponent-deck,.session .player-sidebar .opponent-discard{--icon-size:clamp(10px,2svh,38px);min-width:0;min-height:24px;}
  .session .action-sidebar .turn-rail{position:relative;inset:auto;width:100%;height:auto;box-sizing:border-box;display:flex;flex-direction:column;gap:6px;padding:12px 4px;border:1px solid #af90566b;border-radius:12px;background:#071321d9;flex-shrink:0;}
  
  .session .action-sidebar .turn-marker{width:100%;min-height:0;font-size:clamp(16px,2.5svh,44px);}
  .session .action-sidebar .resources{width:100%;display:grid;grid-template-columns:1fr 1fr;justify-items:center;gap:4px;--icon-size:clamp(15px,2.7svh,52px);}
  .session .action-sidebar .altars,.session .action-sidebar .altars.four{position:static;width:100%;height:auto;display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0;pointer-events:auto;}
  .session .action-sidebar .altars button{width:min(100%,calc((46svh - (var(--god-count) - 1) * 4px) / var(--god-count) * 1.4));flex-shrink:0;}
  .live-chronicle{display:flex;flex-direction:column;flex:1;min-height:44px;overflow:hidden;border:1px solid #ad905960;border-radius:10px;background:#071321db;}
  .chronicle-titlebar{display:flex;align-items:center;gap:4px;padding:4px 6px;border-bottom:1px solid #ad90594d;color:#edd7a8;font:600 clamp(13px,1.8svh,30px)/1.2 'Cormorant Garamond',serif;}
  .chronicle-titlebar>span{flex:1;min-width:0;}
  .chronicle-titlebar .log-control,.session .chronicle-titlebar .trash-control{position:static;display:grid;place-items:center;width:32px;min-width:28px;height:32px;min-height:28px;padding:0;border:0;background:none;color:inherit;cursor:pointer;--icon-size:14px;}
  .chronicle-titlebar .log-control{font-size:24px;}

  .log-entries{overflow:auto;min-height:0;overscroll-behavior:contain;scrollbar-width:thin;font-size:clamp(10px,1.4svh,25px);line-height:1.35;}
  .log-entry{margin:0;padding:7px 9px;border-bottom:1px solid #ad905929;overflow-wrap:anywhere;}.log-entry:first-child{color:#ffe2a1;background:#b58c3512;}
  .player-controls{display:flex;flex-direction:column;gap:4px;flex-shrink:0;}
  .session .action-sidebar .treasures-control,.session .action-sidebar .chronicle-control{position:static;width:100%;--control-height:clamp(34px,5svh,94px);--control-font:clamp(13px,2.2svh,40px)!important;}
  .session .action-sidebar .treasures-control{order:-1;}
  .session:not(.drafting) .composition .table-supply{left:var(--center-left);width:var(--center-width);top:var(--supply-top);height:calc(var(--table-card-height) + 2px);}
  .session:not(.drafting) .composition .play-area{left:var(--center-left);width:var(--center-width);top:var(--play-top);height:var(--table-card-height);}
  .session:not(.drafting) .composition:has(.outcome) .play-area{width:calc(var(--center-width) - var(--table-card-width) - 32px);}
  .session:not(.drafting) .composition .outcome{left:auto!important;right:25%!important;top:var(--play-top)!important;width:calc(var(--table-card-width) + 24px)!important;height:var(--table-card-height)!important;--icon-size:12px;}
  .session:not(.drafting) .composition .hand{left:var(--center-left);width:var(--center-width);--hand-room:53;bottom:3%;height:var(--table-card-height);}
  .session:not(.drafting) .composition:has(.hand-pages) .hand{left:calc(var(--center-left) + 44px);width:calc(var(--center-width) - 88px);}
  .session:not(.drafting) .composition .hand-pages{left:var(--center-left);width:var(--center-width);bottom:4%;justify-content:space-between;pointer-events:none;z-index:6;}
  .session:not(.drafting) .composition .hand-pages button{pointer-events:auto;}.session:not(.drafting) .composition .hand-pages span{position:absolute;left:0;bottom:-12px;width:44px;text-align:center;font-size:10px;}
  @media(max-aspect-ratio:3/4){
    .session:not(.drafting) .composition{--center-left:22%;--center-width:51%;--table-card-height:min(27svh,38vw);--supply-top:4svh;--play-top:36svh;}
    .player-sidebar{width:20%;bottom:12%;}.action-sidebar{width:25%;}
    .session:not(.drafting) .composition .hand{--hand-room:51;bottom:9%;}
    .session:not(.drafting) .composition .hand-pages{bottom:calc(9% + var(--table-card-height) / 2 - 22px);}
    .session:not(.drafting) .composition .outcome{right:27%!important;}
    .session .player-sidebar .opponents .opponent-portrait{width:32px;}
    .session .action-sidebar .resources{--icon-size:14px;gap:2px;}
    .session .action-sidebar .treasures-control,.session .action-sidebar .chronicle-control{--control-font:12px!important;--control-height:40px;}
    .chronicle-titlebar{font-size:12px;padding:3px;gap:0;}.log-entry{padding:5px 4px;font-size:10px;}
  }
  @media(max-height:500px) and (min-aspect-ratio:3/4){
    .player-sidebar{bottom:21%;gap:4px;}
    .session .player-sidebar .opponents .opponent{grid-template-columns:28px auto minmax(0,1fr) auto;grid-template-rows:auto;gap:1px;}
    .session .player-sidebar .opponents .opponent-portrait{grid-column:auto;width:28px;}
    .session .action-sidebar .turn-rail{padding:5px 2px;gap:2px;}
    .session .action-sidebar .resources{display:flex;--icon-size:10px;}
    .session .action-sidebar .turn-marker{font-size:13px;}
    .session .action-sidebar .altars button{width:min(100%,calc((40svh - (var(--god-count) - 1) * 4px) / var(--god-count) * 1.4));}
    .session .action-sidebar .treasures-control,.session .action-sidebar .chronicle-control{--control-height:30px;--control-font:12px!important;}
    .action-sidebar{gap:3px;}
  }


  /* Compact side rails, with mirrored personal piles at the bottom corners. */
  .session:not(.drafting) .composition{--personal-pile-size:clamp(32px,8svh,160px);}
  .session:not(.drafting) header.table-navigation{top:1%;left:1%;right:auto;width:auto;max-width:none;flex-direction:row;align-items:center;gap:5px;font-size:clamp(10px,1.4svh,24px);}
  .session:not(.drafting) header.table-navigation .code-label{display:none;}
  .session:not(.drafting) header.table-navigation>span{padding:6px 8px;}
  .session .player-sidebar{top:calc(1svh + 52px);bottom:calc(1svh + var(--personal-pile-size) + 10.625vw + 20px);overflow:visible;}
  .session .player-sidebar .opponents .opponent{grid-template-columns:auto auto minmax(0,1fr) auto;grid-template-rows:auto;gap:3px;}
  .session .player-sidebar .opponents .opponent-portrait{grid-column:auto;width:clamp(36px,8svh,150px);}
  .session .action-sidebar .turn-rail{flex:1;min-height:0;overflow:auto;}
  @media(max-aspect-ratio:3/4){
    .session:not(.drafting) .composition{--personal-pile-size:6svh;}
    .session:not(.drafting) header.table-navigation a{padding:4px 6px;min-height:30px;font-size:10px;}
    .session .player-sidebar{top:calc(1svh + 40px);bottom:10%;}
    .session .player-sidebar .opponents .opponent{grid-template-columns:36px auto minmax(0,1fr) auto;gap:1px;}
    .session .player-sidebar .opponents .opponent-portrait{width:36px;}
    .session .player-sidebar .opponent-deck,.session .player-sidebar .opponent-discard{--icon-size:7px;min-height:20px;}
    .chronicle-titlebar{flex-wrap:wrap;}.chronicle-titlebar>span{flex-basis:100%;}
    .chronicle-titlebar .log-control,.session .chronicle-titlebar .trash-control{flex:1;}
  }
  @media(max-height:500px) and (min-aspect-ratio:3/4){
    .session:not(.drafting) .composition{--personal-pile-size:6svh;}
    .session:not(.drafting) header.table-navigation a{min-height:26px;padding:3px 6px;}
    .session .player-sidebar{top:calc(1svh + 34px);bottom:calc(1svh + var(--personal-pile-size) + 8.125vw + 16px);}
    .session .player-sidebar .opponents .opponent-portrait{width:36px;}
    .session .action-sidebar .turn-rail{flex-direction:row;flex-wrap:wrap;}
  }


  .session .player-sidebar .opponents .opponent{min-height:16svh;grid-template-columns:minmax(0,1.4fr) auto minmax(0,1fr) auto;}
  .session .player-sidebar .opponents .opponent-portrait{width:100%;max-width:16svh;aspect-ratio:1;padding:0;border:0;background:none;cursor:pointer;}
  .session .player-sidebar .opponents .hidden-hand{height:7svh;}
  .session .action-sidebar .turn-rail{border:0;border-radius:0;background:none;padding:clamp(20px,4svh,60px) 13%;overflow:visible;isolation:isolate;}
  @media(max-aspect-ratio:3/4){
    .session .player-sidebar .opponents .opponent{min-height:9svh;grid-template-columns:minmax(0,1fr) auto auto;}
    .session .player-sidebar .opponents .opponent-portrait{grid-row:1/3;max-width:none;}
    .session .player-sidebar .opponents .hidden-hand{grid-column:2/4;grid-row:2;height:3svh;}
    .session .action-sidebar .turn-rail{padding:22px 12%;}
    .session .action-sidebar .turn-marker{font-size:16px;}
    .session .action-sidebar .resources{--icon-size:12px;}
  }
  @media(max-height:500px) and (min-aspect-ratio:3/4){
    .session .player-sidebar .opponents .opponent{min-height:18svh;}
    .session .player-sidebar .opponents .opponent-portrait{max-width:18svh;}
    .session .player-sidebar .opponents .hidden-hand{height:6svh;}
    .session .action-sidebar .turn-rail{padding:16px 12%;}
  }


  /* Let the opponent piles fill the taller row; overlap backs instead of shrinking them. */
  .session .player-sidebar .opponents .opponent{--opponent-pile-height:min(12svh,4.3vw);grid-template-columns:34% calc(var(--opponent-pile-height)*5/7) minmax(0,1fr) var(--opponent-pile-height);gap:2px;}
  .session .player-sidebar .opponent-deck,.session .player-sidebar .opponent-discard{--icon-size:calc(var(--opponent-pile-height)/2);--icon-number-scale:.8;}
  .session .player-sidebar .opponent-deck{width:calc(var(--opponent-pile-height)*5/7);display:flex;justify-content:center;}
  .session .player-sidebar .opponent-discard{width:var(--opponent-pile-height);height:var(--opponent-pile-height);}
  .session .player-sidebar .opponents .hidden-hand{height:var(--opponent-pile-height);display:block;}
  .session .player-sidebar .opponents .hidden-hand img{position:absolute;top:0;left:calc(var(--index)*max(2px,(100% - var(--opponent-pile-height)*5/7)/4));width:calc(var(--opponent-pile-height)*5/7);height:100%;max-width:none;margin:0;object-fit:contain;}
  @media(max-aspect-ratio:3/4){
    .session .player-sidebar .opponents .opponent{--opponent-pile-height:clamp(22px,7vw,32px);grid-template-columns:minmax(28px,1fr) minmax(0,1fr) minmax(0,1fr);}
    .session .player-sidebar .opponents .hidden-hand{height:var(--opponent-pile-height);--opponent-pile-height:clamp(32px,10vw,44px);}
    .session .player-sidebar .opponent-discard{width:100%;}
  }

  /* Full-width leader and portrait drawers share the same live table content. */
  .drawer-toggles,.drawer-title{display:none;}
  .worship-drawer{display:contents;}
  .session .player-sidebar{top:1%;bottom:1%;}
  .session:not(.drafting) .player-sidebar header.table-navigation{position:static;flex-shrink:0;}
  .session:not(.drafting) .player-sidebar .own-leader{position:relative!important;left:auto!important;bottom:auto!important;width:100%!important;flex-shrink:0;}
  .session .player-sidebar .own-leader .leader-face{display:block;}
  .session .player-sidebar .own-leader .leader-portrait{display:none;}
  @media(max-aspect-ratio:3/4){
    .session:not(.drafting) .composition{--center-left:2%;--center-width:96%;--table-card-height:min(25svh,58vw);--supply-top:88px;--play-top:calc(88px + 27svh);}
    .drawer-toggles{position:absolute;inset:8px 10px auto;display:flex;justify-content:space-between;z-index:32;pointer-events:none;}
    .drawer-toggles button{pointer-events:auto;width:56px;height:56px;border:1px solid #c8aa6570;border-radius:12px;background:#091829cf;backdrop-filter:blur(14px);color:#f7dfab;font-size:24px;display:grid;place-content:center;gap:2px;}
    .drawer-toggles span{font-size:10px;}
    .drawer-scrim{position:absolute;inset:72px 0 0;z-index:29;border:0;background:#02081266;backdrop-filter:blur(3px);}
    .session .player-sidebar,.session .action-sidebar .worship-drawer{position:absolute;top:76px;bottom:8px;width:min(84vw,380px);box-sizing:border-box;padding:14px;display:flex;flex-direction:column;gap:12px;background:#081523f2;border:1px solid #ae915675;border-radius:16px;box-shadow:0 12px 36px #0009;z-index:30;transition:transform 350ms cubic-bezier(.2,.8,.2,1),visibility 350ms;visibility:hidden;overflow:auto;}
    .session .player-sidebar{left:8px;transform:translateX(calc(-100% - 16px));}
    .session .action-sidebar .worship-drawer{right:8px;transform:translateX(calc(100% + 16px));}
    .session .player-sidebar.drawer-open,.session .action-sidebar .worship-drawer.drawer-open{transform:translateX(0);visibility:visible;}
    .session .player-sidebar .live-chronicle{min-height:120px;}
    .session .player-sidebar .opponents .opponent{--opponent-pile-height:52px;grid-template-columns:28% calc(var(--opponent-pile-height)*5/7) minmax(0,1fr) var(--opponent-pile-height);min-height:88px;}
    .session .player-sidebar .opponents .opponent-portrait{grid-row:auto;}
    .session .player-sidebar .opponents .hidden-hand{grid-row:auto;grid-column:auto;--opponent-pile-height:52px;}
    .session .player-sidebar .chronicle-titlebar{flex-wrap:nowrap;font-size:18px;}
    .session .player-sidebar .chronicle-titlebar>span{flex-basis:auto;}
    .session .player-sidebar .chronicle-titlebar button{flex:0 0 32px;}
    .session .player-sidebar .log-entry{font-size:13px;padding:8px;}
    .session .action-sidebar{display:contents;}
    .drawer-title{display:block;margin:0;color:#f6dfac;font:600 24px 'Cormorant Garamond',serif;}
    .session .action-sidebar .altars{gap:12px;}
    .session .action-sidebar .altars button{width:100%;}
    .session .action-sidebar .turn-rail{position:absolute;left:74px;right:74px;top:8px;bottom:auto;width:auto;height:62px;padding:0;gap:0;z-index:28;justify-content:center;background:#081523b8;border-radius:12px;}
    .session .action-sidebar .turn-rail :global(.resource-frame){display:none;}
    .session .action-sidebar .turn-marker{font-size:17px;line-height:1;}
    .session .action-sidebar .turn-marker span{font-size:11px;margin-top:3px;}
    .session .action-sidebar .resources{display:flex;justify-content:center;gap:8px;--icon-size:9px;}
    .session .action-sidebar .player-controls{position:absolute;left:8px;right:8px;bottom:max(8px,env(safe-area-inset-bottom));z-index:12;display:flex;flex-direction:row;gap:8px;padding:10px;min-height:44px;box-sizing:border-box;border:1px solid #e5d3a44d;border-radius:16px;background:linear-gradient(135deg,#d6e6f32b,#07132199);backdrop-filter:blur(18px) saturate(135%);box-shadow:0 4px 24px #0006;}
    .session .action-sidebar .player-controls:empty{display:none;}
    .session .action-sidebar .player-controls>div{flex:1;width:auto;--control-height:44px;--control-font:15px!important;}
    .session:not(.drafting) .composition .hand{--hand-room:96;bottom:64px;}
    .session:not(.drafting) .composition .hand-pages{bottom:calc(64px + var(--table-card-height)/2 - 22px);}
    .session:not(.drafting) .composition .outcome{right:2%!important;}
  }
  @media(prefers-reduced-motion:reduce){.session .player-sidebar,.session .action-sidebar .worship-drawer{transition:none;}}

  .session .player-sidebar{bottom:calc(1% + var(--personal-pile-size) + 10px);}
  .session:not(.drafting) .composition>.deck-pile,.session:not(.drafting) .composition>.discard-pile{position:absolute;bottom:1%;width:var(--personal-pile-size);height:var(--personal-pile-size);display:grid;place-items:center;--icon-size:calc(var(--personal-pile-size)/2);--icon-number-scale:.8;}
  .session:not(.drafting) .composition>.deck-pile{left:calc(11% - var(--personal-pile-size)/2);}
  .session:not(.drafting) .composition>.discard-pile{right:calc(12.5% - var(--personal-pile-size)/2);}
  .session .action-sidebar{bottom:calc(1% + var(--personal-pile-size) + 10px);}
  @media(max-aspect-ratio:3/4){
    .session .player-sidebar{bottom:8px;}
    .session .action-sidebar .player-controls{left:62px;right:62px;bottom:12px;padding:0;min-height:0;background:none;border:0;border-radius:0;backdrop-filter:none;box-shadow:none;gap:4px;}
    .session .action-sidebar .player-controls>div{--control-height:48px;--control-font:12px!important;}
    .session:not(.drafting) .composition>.deck-pile,.session:not(.drafting) .composition>.discard-pile{bottom:12px;width:48px;height:48px;--icon-size:24px;z-index:13;}
    .session:not(.drafting) .composition>.deck-pile{left:8px;}
    .session:not(.drafting) .composition>.discard-pile{right:8px;}
    .session:not(.drafting) .composition .hand{bottom:80px;}
    .session:not(.drafting) .composition .hand-pages{bottom:calc(80px + var(--table-card-height)/2 - 22px);}
    .session .action-sidebar .turn-marker{display:flex;align-items:baseline;justify-content:space-between;gap:6px;box-sizing:border-box;padding:0 6px;font-size:13px;text-align:left;}
    .session .action-sidebar .turn-marker strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .session .action-sidebar .turn-marker span{flex-shrink:0;font-size:10px;margin:0;text-align:right;}
    .session .action-sidebar .resources{--icon-size:clamp(18px,5.6vw,24px);gap:2px;justify-content:space-evenly;}
  }

</style>
