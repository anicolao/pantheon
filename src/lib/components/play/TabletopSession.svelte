<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { base } from '$app/paths';
  import PublicMotion from '$lib/components/play/PublicMotion.svelte';
  import { measureLayout, type Layout } from '$lib/components/play/motion-layout';
  import CardFace from '$lib/components/CardFace.svelte';
  import HandFan from '$lib/components/play/HandFan.svelte';
  import ResourceIcon from '$lib/components/ResourceIcon.svelte';
  import Portrait from '$lib/components/play/Portrait.svelte';
  import SupplyCoverflow from '$lib/components/play/SupplyCoverflow.svelte';
  import InlineChoice from './InlineChoice.svelte';
  import TabletopVictory from './TabletopVictory.svelte';
  import TabletopWorship from '$lib/components/play/TabletopWorship.svelte';
  import WorshipFace from '$lib/components/play/WorshipFace.svelte';
  import { sortHand } from '$lib/components/play/hand-order';
  import { tablePlayed } from '$lib/components/play/table-play';
  import { tablePurchases } from '$lib/components/play/table-purchases';
  import { replaySetup, leaderIds, type SetupState } from '$lib/game/setup';
  import { activePlayer, canPlayAction, canPlayTreasure, definition, eligibleGains, standings, worshipReason } from '$lib/game/actions';
  import { canUndo } from '$lib/game/undo';
  import type { GameCommand } from '$lib/backend/setup-repository';
  import type { BotProposal } from '$lib/bots/table';
  import { freshTable, occupy, begin, rematch, append, advanceEmptyActions, restoreTable, actor, edges, seatUid, seatName, type Edge, type Seat, type Tabletop } from '$lib/tabletop/table';

  let {initialTable,persist=true,motionRate=1,onState,onReady}:{initialTable?:Tabletop;persist?:boolean;motionRate?:number;onState?:(table:Tabletop)=>void;onReady?:(revision:number,available:boolean)=>void}=$props();
  export async function play(command:GameCommand){if(ready)await commit(command);}
  $effect(()=>{onState?.(table);});
  $effect(()=>{onReady?.(game?.activity.length??0,ready);});
  const storageKey = 'pantheon-tabletop-v1';
  let table = $state(untrack(()=>initialTable??freshTable())), mounted = $state(false), error = $state('');
  let market=$state<SupplyCoverflow>();
  let surfaceWidth=$state(1440),surfaceHeight=$state(1000);
  let selectedTemple=$state(''), templeBusy=$state(false), templeSource=$state<HTMLElement>(), templeOverlay=$state<TabletopWorship>(), templeOpened:(()=>void)|undefined;
  let board = $state<HTMLElement>(), rotation = $state(0), moving = $state(false), working = $state(false);
  let interaction=$state<InlineChoice>(),interactionBusy=$state(false),localChoices=$state<string[]>([]);
  let targets = $state<string[]>([]), inspected = $state(''), confirmReset = $state<Edge | null>(null);
  let pending = $state<GameCommand | null>(null), pendingText = $state('');
  let readers = $state<Record<Edge, 'chronicle' | 'trash' | null>>({south:null,west:null,north:null,east:null});
  const reading = $derived(Object.values(readers).some(Boolean));
  let readerCards = $state<Partial<Record<Edge,string>>>({}), layoutRevision = $state(0);
  async function toggleReader(edge: Edge, kind: 'chronicle' | 'trash') {
    readers[edge]=readers[edge]===kind?null:kind; delete readerCards[edge];
    await tick(); layoutRevision++;
  }
  let displayedUid = $state(''), animating = $state(false), reduced = $state(true), exitEdge = $state<Edge | null>(null), closeNotice = $state(false);
  let pendingDraws=$state<{step:string;card:string;uid:string;sequence:number}[]>([]);
  function openDraw(step:string){pendingDraws=pendingDraws.filter(draw=>draw.step!==step);}
  function presentedHand(id:string){return (game?.decks[id]?.hand??[]).filter(card=>!pendingDraws.some(draw=>draw.uid===id&&draw.card===card.id));}
  let motionBefore: Layout = {poses:[],width:100}, settleMotion: (()=>void) | undefined;
  let worker: Worker | undefined, request = 0, generation = 0;
  const game = $derived(table.events.length ? replaySetup(table.events) : null);
  const uid = $derived(game ? displayedUid || actor(game) : '');
  const activeSeat = $derived(table.seats.find(seat => seatUid(seat.edge) === uid));
  const finished = $derived(game?.turn.phase === 'finished');
  const human = $derived(activeSeat?.mode === 'human');
  const unit=$derived(Math.min(surfaceWidth,surfaceHeight)/100);
  const horizontal=$derived(activeSeat?.edge==='west'||activeSeat?.edge==='east'?surfaceHeight:surfaceWidth);
  const vertical=$derived(activeSeat?.edge==='west'||activeSeat?.edge==='east'?surfaceWidth:surfaceHeight);
  const templeDock=$derived(horizontal/unit>=130?'right':vertical/unit>=130?'top':'inline');
  const cardWidth=$derived(unit*(templeDock==='inline'?15:17));
  const tableWidth=$derived(Math.max(58*unit,Math.min(150*unit,horizontal-(templeDock==='right'?56:30)*unit)));
  const ready = $derived(mounted && !moving && !working && !animating && !exitEdge && !confirmReset && !finished && !templeBusy);
  const choice = $derived(game?.turn.choice);
  const inlineChoice=$derived(choice&&choice.kind!=='gain'&&!animating&&!templeBusy?choice:null);
  const scores = $derived(game?.phase === 'playing' ? standings(game) : []);
  const occupied = $derived(table.seats.filter(seat => seat.mode !== 'empty'));
  const gains = $derived(game && choice?.kind === 'gain' ? eligibleGains(game, choice.limit!, choice.actionOnly) : []);
  const marketSelection = $derived(choice?.kind === 'gain' ? {
    options: gains.map(card => ({ id: card.id, cardId: card.id, copy: 1 })), selected: targets,
    choose: (id: string) => void resolve([id]), kind: 'gain', choiceId: choice.id,
    browsedCardId: choice.browsedCardId, readOnly: !human || !ready
  } : undefined);
  const instruction = $derived(!choice ? '' : choice.kind === 'gain' ? `Choose ${choice.actionOnly ? 'an Action' : 'a card'} costing up to ${choice.limit} from the market` : `Choose ${choice.min === choice.max ? choice.max : `up to ${choice.max}`} to ${choice.kind} from your hand`);

  async function openTemple(cardId:string){
    if(selectedTemple===cardId)return;
    templeBusy=true;templeSource=document.querySelector<HTMLElement>(`[data-temple-id="${cardId}"]`)??undefined;
    const opened=new Promise<void>(resolve=>templeOpened=resolve);selectedTemple=cardId;
    await tick();await opened;templeBusy=false;
  }
  async function returnTemple(){if(!selectedTemple)return;templeBusy=true;await templeOverlay?.returnToPile();templeBusy=false;}
  function playerName(id: string) {
    const seat = table.seats.find(seat=>seatUid(seat.edge)===id);
    return definition(game?.leaders[id] ?? seat!.leader).name.split(',')[0];
  }
  function message(text: string) {
    return text.replace(/\b(South|West|North|East)\b/g, name=>playerName(seatUid(name.toLowerCase() as Edge)));
  }
  function flightsSettled(revision=Infinity) { pendingDraws=pendingDraws.filter(draw=>draw.sequence>revision);animating=false; settleMotion?.(); settleMotion=undefined; }
  function closeWindow() { window.close(); closeNotice=true; exitEdge=null; }
  function requestExit(edge: Edge) { if(game && !finished) exitEdge=edge; else closeWindow(); }
  function save() {
    if(!persist)return;
    try { localStorage.setItem(storageKey, JSON.stringify(table)); }
    catch { error = 'This browser could not save the table. Keep this tab open to continue.'; }
  }
  function seatMode(edge: Edge, mode: Seat['mode']) { table = occupy(table, edge, mode); save(); }
  function requestNewTable(edge:Edge) { if(finished)newTable();else confirmReset=edge; }
  function newTable() {
    generation++; request++; worker?.terminate(); worker = undefined;
    flightsSettled(); displayedUid=''; exitEdge=null; selectedTemple='';templeBusy=false;templeOpened?.();
    table = freshTable(); targets = [];localChoices=[];interactionBusy=false; inspected = ''; pending = null; confirmReset = null;
    rotation = 0; readers={south:null,west:null,north:null,east:null}; readerCards={}; moving = false; working = false; error = ''; save();
  }
  function playAgain() {
    try {
      const next=advanceEmptyActions(rematch(table,crypto.randomUUID()));
      newTable();table=next;displayedUid=actor(replaySetup(next.events));save();
    } catch(cause) {error=cause instanceof Error?cause.message:String(cause);}
  }
  function start() {
    try { table = advanceEmptyActions(begin(table, crypto.randomUUID())); displayedUid=actor(replaySetup(table.events)); error = ''; save(); }
    catch (cause) { error = cause instanceof Error ? cause.message : String(cause); }
  }
  async function commit(command: GameCommand, player = uid) {
    const current = generation;
    try {
      if(command.type==='god/worshipped')await openTemple(command.cardId);
      const next = advanceEmptyActions(append(table, player, command));
      const gain=replaySetup(next.events).movements.find(move=>move.sequence>table.events.length&&move.source==='tribute-of-the-tides'&&move.card?.cardId==='drachma'&&(move.kind==='gain'||move.kind==='topdeck'));
      if(gain){templeBusy=true;try{await market?.centerPile('drachma');}finally{templeBusy=false;}}
      if(current!==generation)return;
      motionBefore = measureLayout();
      const animate = game?.phase==='playing' && !reduced;
      const settled = animate ? new Promise<void>(resolve=>{settleMotion=resolve;animating=true;}) : Promise.resolve();
      if(game?.phase==='playing') displayedUid=player;
      if(animate && command.type!=='turn/ended')pendingDraws=replaySetup(next.events).movements.filter(move=>move.sequence>table.events.length&&move.kind==='draw'&&move.card).map(move=>({step:`${move.sequence}:${move.index}`,card:move.card!.id,uid:move.uid,sequence:move.sequence}));
      table = next;
      targets = []; inspected = ''; pending = null; error = ''; save();
      await tick();
      await settled;
      if(current!==generation)return;
      if(selectedTemple && !replaySetup(table.events).turn.choice)await returnTemple();
      displayedUid=actor(replaySetup(table.events));
      await tick();
    } catch (cause) { error = cause instanceof Error ? cause.message : String(cause); }
  }
  async function send(command: GameCommand) {
    if (!ready || !human || !game) return;
    if (command.type === 'card/bought' && game.decks[uid].hand.some(card => canPlayAction(game, uid, card.id))) {
      pending = command; pendingText = `Buy ${definition(command.cardId).name} and finish your remaining Actions?`; return;
    }
    await commit(command);
  }
  async function finishTurn() {
    if (!ready || !human || !game || choice || selectedTemple) return;
    if (game.turn.phase === 'actions') {
      pending = { type: 'turn/ended' }; pendingText = 'You still have playable Actions. Finish your turn?'; return;
    }
    await commit({ type: 'turn/ended' });
  }
  async function acceptPending() {
    const command = pending; if (!command || !game || !ready) return;
    if (command.type === 'turn/ended' && game.turn.phase === 'actions') await commit({ type: 'phase/advanced' });
    await commit(command);
  }
  async function resolve(selected = targets) {
    if (!choice || !ready || !human || selected.length < choice.min) return;
    await commit({ type: 'choice/resolved', choiceId: choice.id, targets: selected });
  }
  function handCard(id: string) {
    if (!game || !ready || !human) return;
    if (choice && choice.kind !== 'gain') {void interaction?.select(id);return;}
    if (canPlayAction(game, uid, id)) void send({ type: 'action/played', instanceId: id });
    else if (canPlayTreasure(game, uid, id)) void send({ type: 'treasure/played', instanceId: id });
  }
  function inspect(id: string) { if (ready) inspected = id; }

  // Rotate around the shared table, then enable the arriving player's controls.
  // Await the actual CSS transition; reduced motion resolves without a timer.
  $effect(() => {
    const edge = activeSeat?.edge;
    if (!mounted || !edge) return;
    const target = edges.indexOf(edge) * 90;
    untrack(() => {
      const delta = ((target - rotation + 540) % 360) - 180;
      if (!delta) return;
      moving = true; rotation += delta;
      const current = generation;
      void tick().then(async () => {
        await Promise.all((board?.getAnimations() ?? []).map(animation => animation.finished.catch(() => undefined)));
        if (current === generation) moving = false;
      });
    });
  });
  $effect(() => {
    const state = game, player = uid;
    if (!mounted || !state || !ready || activeSeat?.mode !== 'bot' || error) return;
    const revision = table.events.length, current = generation;
    untrack(() => {
      working = true;
      worker ??= new Worker(new URL('../../bots/table-worker.ts', import.meta.url), { type: 'module' });
      const id = ++request;
      worker.onmessage = async (event: MessageEvent<{ id: number; proposal?: BotProposal; error?: string }>) => {
        if (event.data.id !== request || current !== generation) return;
        if (event.data.error) { error = event.data.error; working = false; return; }
        const proposal = event.data.proposal;
        if (proposal && proposal.revision === table.events.length && proposal.actorUid === player) {
          await commit(proposal.command, player);
          // Let the actual card/hand/board transitions settle before the bot's next move.
          await tick();
          await Promise.all(document.getAnimations().filter(animation => animation.playState === 'running' && animation.effect?.getComputedTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => undefined)));
        }
        if (current === generation) working = false;
      };
      worker.onerror = () => { error = 'The bot stopped. Try continuing its turn.'; working = false; };
      worker.postMessage({ id, events: $state.snapshot(table.events), hostUid: state.players[0].uid, revision });
    });
  });
  onMount(() => {
    try { const saved = persist ? localStorage.getItem(storageKey) : null; if (saved) table = restoreTable(saved); }
    catch { error = 'The saved table could not be restored. Start a new table to play.'; }
    const media=matchMedia('(prefers-reduced-motion: reduce)'), update=()=>{reduced=media.matches;};
    update();media.addEventListener('change',update);
    mounted = true;
    return () => { generation++; worker?.terminate(); flightsSettled(); media.removeEventListener('change',update); };
  });
</script>

<svelte:head><title>Pantheon · Tabletop</title><meta name="description" content="Four edges, one shared table. Join a leader, draft, and play Pantheon together on a tabletop display."/></svelte:head>
<main style:--card-width={`${cardWidth}px`} class="tabletop" data-e2e-layout data-status="synced" data-tabletop-phase={game?.phase ?? 'gathering'} style:--table-art={`url('${base}/assets/ui/table-desktop.webp')`}>
  <div class="play-surface" bind:clientWidth={surfaceWidth} bind:clientHeight={surfaceHeight} style:inset={`${readers.east ? 28 : reading ? 6 : 0}vmin ${readers.south ? 28 : reading ? 6 : 0}vmin ${readers.west ? 28 : reading ? 6 : 0}vmin ${readers.north ? 28 : reading ? 6 : 0}vmin`}>
  <div class="table-inlay" aria-hidden="true"></div>
  {#each table.seats as seat, index (seat.edge)}
    {@const id = seatUid(seat.edge)}
    {@const active = uid === id && !finished}
    {@const faceUp = active && !!game && actor(game) === id}
    {@const leader = game?.leaders[id] ?? seat.leader}
    <section class="edge" class:gathering={!game} class:active class:inactive={!!game && !active} data-edge={seat.edge} data-active={active} style:--angle={`${index * 90}deg`} aria-label={`${playerName(id)} seat`}>
      {#if !game}
        <button class="join-portrait" class:joined={seat.mode !== 'empty'} disabled={!mounted}
          aria-label={seat.mode === 'empty' ? `Join ${playerName(id)}` : `Leave ${playerName(id)} seat`}
          onclick={() => seatMode(seat.edge, seat.mode === 'empty' ? 'human' : 'empty')}>
          <Portrait {leader} name={definition(leader).name.split(',')[0]} active={seat.mode !== 'empty'}/>
          <span>{seat.mode === 'empty' ? 'Tap to join' : seat.mode === 'bot' ? 'Bot · chooses its leader' : `Joined ${occupied.slice().sort((a,b)=>a.joined-b.joined).findIndex(item=>item.edge===seat.edge)+1}`}</span>
        </button>
        <button class="seat-mode" disabled={!mounted} onclick={() => seatMode(seat.edge, seat.mode === 'bot' ? 'human' : 'bot')}>{seat.mode === 'bot' ? `Play ${playerName(id)} yourself` : `Add bot as ${playerName(id)}`}</button>
      {:else if seat.mode !== 'empty'}
        <div class="edge-line">
          <div class="leader-status">
          <button class="leader" data-public-card={leader} data-public-zone="leader" data-public-uid={id} data-motion-angle={index*90} aria-label={`Inspect ${playerName(id)} leader`} onclick={() => inspect(leader)}><Portrait {leader} name={playerName(id)} {active} points={scores.find(score=>score.uid===id)?.score}/></button>
          {#if active && game.phase==='playing' && !finished}
            <div class="turn-status" aria-label={`${playerName(id)} turn status`}>
              <strong>Your turn – {game.turn.phase}</strong>
              <div class="counters">{#each ['actions','coins','buys','worship'] as resource}<ResourceIcon resource={resource as 'actions'|'coins'|'buys'|'worship'} value={game.resources[resource as keyof typeof game.resources]}/>{/each}</div>
            </div>
          {/if}
          </div>
          {#if game.phase === 'playing'}
            <div class="edge-deck" data-public-zone="deck" data-public-uid={id} data-motion-angle={index*90}><ResourceIcon resource="cards" value={game.decks[id].deck.length} label={`${playerName(id)} deck`}/></div>
            <div class="table-hand" data-public-zone="hand" data-public-uid={id} data-motion-angle={index*90} data-hand-total={presentedHand(id).length} data-hand-owner={id} data-face-up={faceUp} style:visibility={active && !faceUp && animating ? 'hidden' : undefined} style:--count={game.decks[id].hand.length}>
              <HandFan cards={sortHand(presentedHand(id))} uid={id} players={game.playerCount} {faceUp} angle={index*90} measure={active} staged={active?targets:[]}
                disabled={card=>!active||!ready||!human||interactionBusy||targets.includes(card.id)}
                label={card=>faceUp ? `${choice && choice.kind!=='gain'?'Select':'Play'} ${definition(card.cardId).name}` : `${playerName(id)} face-down card`}
                activate={card=>handCard(card.id)} inspect={card=>inspect(card.cardId)}/>

            </div>
            <div class="edge-deck" data-public-zone="discard" data-public-uid={id} data-motion-angle={index*90}><ResourceIcon resource="discard" value={game.decks[id].discard.length} label={`${playerName(id)} discard`}/></div>
          {:else}<p class="draft-wait">{active ? 'Choose a leader from the table' : game.leaders[id] ? 'Leader chosen' : 'Waiting to draft'}</p>{/if}
        </div>
        <div class="edge-controls">
          {#if active && game.phase === 'playing' && human}
            <button disabled={!ready || !!choice || !game.decks[id].hand.some(card=>canPlayTreasure(game!,id,card.id))} onclick={()=>send({type:'treasures/played'})}>Play all Treasures</button>
            {#if canUndo(game,id)}<button disabled={!ready} onclick={()=>send({type:'action/undone',targetSequence:game!.undo!.sequence})}>Undo</button>{/if}
            <button class="primary" disabled={!ready || !!choice || !!selectedTemple} onclick={finishTurn}>End turn</button>
          {:else}<span>{finished ? 'Final score' : active ? 'Bot is playing' : `Turn ${game.turnOrder.indexOf(id)+1}`}</span>{/if}
        </div>
      {/if}
    </section>
  {/each}

  <section class="shared-table" class:finished class:playing={game?.phase==='playing'&&!finished} data-temple-dock={templeDock} style:--table-width={`${tableWidth}px`} bind:this={board} style:--rotation={`${rotation}deg`} aria-label="Shared table" aria-busy={moving || working || animating} data-facing={activeSeat?.edge ?? 'south'}>
    {#if !game}
      <div class="welcome"><p class="eyebrow">One table · Four bloodlines</p><h1>Pantheon</h1><p>Choose your edge. Tap your leader.</p><span>{occupied.length} of 4 seats joined</span></div>
      {#each edges as edge, index}
        <div class="start-control" style:--start-angle={`${index * 90}deg`}>
          <button class="start primary" disabled={!mounted || occupied.length < 2} aria-label={`Play facing ${playerName(seatUid(edge))}`} onclick={start}>Play</button>
          <label><input type="checkbox" bind:checked={table.randomize} onchange={save}/>Randomize play order</label>
        </div>
      {/each}
      <p class="setup-note">{table.randomize ? 'Choose player 1 at random. Draft in reverse; play clockwise.' : 'Keep your leaders. Last to join goes first; play in reverse join order.'}</p>
    {:else if finished}
      <TabletopVictory {game} again={playAgain} fresh={newTable}/>
    {:else if game.phase === 'draft'}
      <div class="draft"><p class="eyebrow">{playerName(uid)} chooses · {human ? 'Tap your bloodline' : 'Bot is choosing'}</p><h1>Choose your leader</h1><p>Play starts at {playerName(game.turnOrder[0])}, then goes clockwise.</p>
        <div class="draft-leaders">{#each leaderIds as leader}<button disabled={!ready || !human || Object.values(game.leaders).includes(leader)} aria-label={`Choose ${definition(leader).name.split(',')[0]}`} onclick={()=>send({type:'leader/chosen',leaderId:leader})}><CardFace card={definition(leader)} players={game.playerCount}/></button>{/each}</div>
        <p>Draft: {game.draftOrder.map(playerName).join(' → ')}</p>
      </div>
    {:else}
      <div class="market"><SupplyCoverflow bind:this={market} {motionRate} {game} {uid} sharedCardWidth={cardWidth} ready={ready && human && (!selectedTemple || !!choice) && (!choice || choice.kind==='gain')} visible={true} {inspect} onDialog={()=>{}} command={send} selection={marketSelection} {rotation} followAffordable={!animating&&!templeBusy} warnOnActions={false}/></div>
      <div class="temples" class:side={templeDock!=='inline'} aria-label="Worship actions">{#each [...game.sharedEvents].sort((a,b)=>(definition(a).cost??0)-(definition(b).cost??0)||definition(a).name.localeCompare(definition(b).name)) as event}<button disabled={!ready || !human || !!selectedTemple || !!worshipReason(game,uid,event)} data-temple-id={event} class:zoomed={selectedTemple===event} data-public-zone="altar" data-public-card={event} data-motion-angle={rotation} aria-label={`Worship ${definition(event).god}`} onclick={()=>openTemple(event)}><WorshipFace {game} {uid} cardId={event} dimUnavailable/></button>{/each}</div>
      <div class="play-area" class:choosing={!!inlineChoice} inert={!!selectedTemple||!!inlineChoice} data-public-zone="play" data-public-uid={uid} data-motion-angle={rotation} aria-label="Played cards"><span class="reveal-anchor" data-public-zone="reveal" data-public-uid={uid} data-motion-angle={rotation} aria-hidden="true"></span>
        {#if !game.decks[uid].play.length && !tablePurchases(game,uid).length}<span class="empty-play">Your play area</span>{/if}
        <div class="played" style:--count={tablePlayed(game,uid).length}>{#each tablePlayed(game,uid) as card,index (card.id)}<div class="table-card" style:--index={index} data-motion-key={`play:${card.id}`} data-motion-zone="play" data-motion-uid={uid} data-motion-card={card.id} data-motion-face={card.cardId} data-motion-copy={card.copy} data-motion-angle={rotation}><CardFace card={definition(card.cardId)} copy={card.copy} players={game.playerCount}/></div><button style:--index={index} aria-label={`Inspect played ${definition(card.cardId).name}`} onclick={()=>inspect(card.cardId)}></button>{/each}</div>
        <div class="purchased" style:--count={tablePurchases(game,uid).length}>{#each tablePurchases(game,uid) as card,index (card.id)}<div class="table-card" style:--index={index} data-motion-key={`purchase:${card.id}`} data-motion-zone="play" data-motion-uid={uid} data-motion-card={card.id} data-motion-face={card.cardId} data-motion-copy={card.copy} data-motion-angle={rotation}><CardFace card={definition(card.cardId)} copy={card.copy} players={game.playerCount}/></div><button style:--index={index} aria-label={`Inspect purchased ${definition(card.cardId).name}`} onclick={()=>inspect(card.cardId)}></button>{/each}</div>
      </div>
      {#if pending || (choice?.kind==='gain' && !selectedTemple)}
      <div class="table-message">
        {#if pending}<p>{pendingText}</p><button class="primary" disabled={!ready} onclick={acceptPending}>Confirm</button><button onclick={()=>pending=null}>Keep playing</button>
        {:else if choice?.kind==='gain' && !selectedTemple}<p class="choice-instruction" role="status">{definition(choice.source).name}: {instruction}</p>{#if choice.min===0}<button disabled={!ready || !human} onclick={()=>resolve([])}>Gain none</button>{/if}
        {/if}
      </div>
      {/if}
    {/if}
    {#if inlineChoice && game}{#key inlineChoice.id}<div class="choice-stage"><InlineChoice bind:this={interaction} {game} {uid} choice={inlineChoice} ready={ready&&human} {error} {reduced} {rotation} autoConfirm={false} homeSelector={`[data-public-zone="${inlineChoice.kind==='trash'?'trash':'discard'}"][data-public-uid="${uid}"] [data-resource="${inlineChoice.kind}"]`} command={send} bind:targets bind:busy={interactionBusy} handled={id=>localChoices=[...localChoices.slice(-15),id]}/></div>{/key}{/if}
    {#if selectedTemple && game}<TabletopWorship covered={!!inlineChoice} bind:this={templeOverlay} {game} {uid} cardId={selectedTemple} {rotation} source={templeSource} selectedCount={targets.length} resolve={()=>resolve()} ready={ready&&human} busy={templeBusy||working||animating} submit={()=>send({type:'god/worshipped',cardId:selectedTemple})} close={()=>selectedTemple=''} onOpened={()=>{templeOpened?.();templeOpened=undefined;}}/>{/if}
    {#if inspected}<div class="inspection"><CardFace card={definition(inspected)} players={game?.playerCount??4}/><button class="primary" onclick={()=>inspected=''}>Return to table</button></div>{/if}
    {#if error}<div class="error" role="alert">{error}{#if activeSeat?.mode==='bot'}<button onclick={()=>{worker?.terminate();worker=undefined;error='';working=false;}}>Continue bot turn</button>{/if}<button onclick={()=>requestNewTable(activeSeat?.edge??'south')}>New game</button></div>{/if}
  </section>
  </div>
  {#each edges as edge, index}
    <div class="corner-controls" data-corner={edge} style:--corner-angle={`${index*90}deg`}>
      {#if game}
        <button aria-pressed={readers[edge]==='chronicle'} onclick={()=>toggleReader(edge,'chronicle')} aria-label={`Chronicle for ${playerName(seatUid(edge))}`}>Chronicle</button>
        <button aria-pressed={readers[edge]==='trash'} onclick={()=>toggleReader(edge,'trash')} aria-label={`Trash for ${playerName(seatUid(edge))}`} data-public-zone="trash" data-public-uid={seatUid(edge)} data-motion-angle={index*90}><ResourceIcon resource="trash" value={game.trash.length} label={`${game.trash.length} cards in the trash`}/></button>
      {/if}
      <button class="exit" aria-label={`Exit from ${playerName(seatUid(edge))} edge`} onclick={()=>requestExit(edge)}>×</button>
    </div>
    {#if game && readers[edge]}
      <aside class="reader-dock" data-reader-edge={edge} data-reader-kind={readers[edge]} style:--reader-angle={`${index*90}deg`} style:--reader-top={`${readers.east ? 28 : 0}vmin`} style:--reader-right={`${readers.south ? 28 : 0}vmin`} style:--reader-bottom={`${readers.west ? 28 : 0}vmin`} style:--reader-left={`${readers.north ? 28 : 0}vmin`} aria-label={`${readers[edge]==='chronicle'?'Chronicle':'Trash'} for ${playerName(seatUid(edge))}`}>
        <div class="reader-panel">
          <header><h2>{readers[edge]==='chronicle'?'Chronicle':`Trash · ${game.trash.length}`}</h2>{#if readers[edge]==='chronicle'}<button class="new-game" onclick={()=>requestNewTable(edge)}>New game</button>{/if}<button aria-label={`Close ${readers[edge]==='chronicle'?'Chronicle':'Trash'} for ${playerName(seatUid(edge))}`} onclick={()=>toggleReader(edge,readers[edge]!)}>×</button></header>
          {#if readers[edge]==='chronicle'}<ol class="reader-scroll chronicle">{#each game.activity.slice().reverse() as entry}<li>{message(entry.message)}</li>{/each}</ol>
          {:else}<div class="reader-scroll trash-reader">
            {#if readerCards[edge]}<button onclick={()=>delete readerCards[edge]}>All trashed cards</button><CardFace card={definition(readerCards[edge]!)} players={game.playerCount}/>
            {:else if !game.trash.length}<p>No cards have been trashed.</p>
            {:else}<div class="trash-cards">{#each game.trash as card}<button aria-label={`Inspect trashed ${definition(card.cardId).name}`} onclick={()=>readerCards[edge]=card.cardId}><CardFace card={definition(card.cardId)} copy={card.copy} players={game.playerCount}/></button>{/each}</div>{/if}
          </div>{/if}
        </div>
      </aside>
    {/if}
  {/each}
  {#if confirmReset}<div class="exit-shade" aria-hidden="true"></div><div class="exit-confirm" tabindex="-1" role="dialog" aria-modal="true" aria-label="Start a new game?" data-reset-edge={confirmReset} style:transform={`translate(-50%,-50%) rotate(${edges.indexOf(confirmReset)*90}deg)`}><h2>Start a new game?</h2><p>This replaces the saved game and clears all seats. Everyone can choose a leader again.</p><button onclick={newTable}>New game</button><button class="primary" onclick={()=>confirmReset=null}>Keep playing</button></div>{/if}
  {#if exitEdge}<div class="exit-shade" aria-hidden="true"></div><div class="exit-confirm" tabindex="-1" role="dialog" aria-modal="true" aria-label="Leave the table?" data-exit-edge={exitEdge} style:transform={`translate(-50%,-50%) rotate(${edges.indexOf(exitEdge)*90}deg)`}><h2>Leave the table?</h2><p>Your game is saved in this browser.</p><button onclick={closeWindow}>Exit</button><button class="primary" onclick={()=>exitEdge=null}>Keep playing</button></div>{/if}
  {#if closeNotice}<p class="close-notice" role="status">If your browser keeps this window open, close its tab to leave.</p>{/if}
  {#if game?.phase==='playing'}<PublicMotion {localChoices} drawCardWidth={cardWidth} preserveFacing skipCleanupDeal {layoutRevision} {game} {uid} {openDraw} previousLayout={()=>motionBefore} status="synced" {reduced} visible={true} onFlightsSettled={flightsSettled}/>{/if}
</main>

<style>
  .tabletop{container-type:size;position:fixed;inset:0;overflow:hidden;background:radial-gradient(ellipse at center,#112a36cc,#071321e8 70%),var(--table-art) center/cover;color:#f4e4bf;font-family:'Atkinson Hyperlegible',sans-serif;--unit:1cqmin;--gold:#c9a663;--card-width:16cqmin;}
  .play-surface{position:absolute;container-type:size;}
  .table-inlay{position:absolute;inset:3cqmin;border:1px solid #b6965744;border-radius:18%;box-shadow:inset 0 0 0 1cqmin #050b1277,inset 0 0 0 1.1cqmin #d7b97422;pointer-events:none;}
  button{touch-action:manipulation;}button{font:inherit;color:inherit;background:#102632;border:1px solid #c9a66388;border-radius:.8cqmin;padding:.7cqmin 1.2cqmin;cursor:pointer;min-height:3.6cqmin;font-size:clamp(10px,1.25cqmin,24px);}button:disabled{cursor:default;filter:brightness(.65) saturate(.65);}button:not(:disabled):hover,button:focus-visible{outline:2px solid #f6dc9b;outline-offset:2px;}.primary{background:linear-gradient(#f0d89a,#a5803f);color:#15212a;font-weight:700;box-shadow:0 .4cqmin 1cqmin #0008;}p{margin:.6cqmin 0;}h1,h2{font-family:'Cormorant Garamond',serif;font-weight:600;margin:0;}h1{font-size:4.5cqmin;}.eyebrow{text-transform:uppercase;letter-spacing:.14em;font-size:1.1cqmin;color:#d3b47a;}
  .edge{position:absolute;width:62cqmin;height:20cqmin;left:50%;top:calc(100% - var(--edge-inset,10.5cqmin));transform:translate(-50%,-50%) rotate(var(--angle));transform-origin:center;z-index:3;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.7cqmin;}
  .edge[data-edge=west]{left:var(--edge-inset,10.5cqmin);top:50%;}.edge[data-edge=north]{top:var(--edge-inset,10.5cqmin);}.edge[data-edge=east]{left:calc(100% - var(--edge-inset,10.5cqmin));top:50%;}
  .edge.active{width:66cqmin;height:29cqmin;--edge-inset:15cqmin;}
  .edge.gathering{height:26cqmin;--edge-inset:14cqmin;}.join-portrait{width:16cqmin;border:0;background:none;padding:0;filter:drop-shadow(0 1cqmin 1cqmin #0008);}.join-portrait span{display:block;font-size:1.3cqmin;white-space:nowrap;}.seat-mode{font-size:1.2cqmin;min-height:3.5cqmin;}.edge-line{width:100%;display:flex;align-items:center;gap:1.5cqmin;}.leader-status{width:9cqmin;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:.5cqmin;}.edge.active .leader-status{width:13cqmin;}.leader{width:9cqmin;flex-shrink:0;background:none;border:0;padding:0;}.edge-deck{--icon-size:2.3cqmin;flex-shrink:0;}.edge-controls{display:flex;justify-content:center;align-items:center;gap:1cqmin;height:3.8cqmin;font-size:1.3cqmin;}.draft-wait{font-size:1.8cqmin;}
  .table-hand{position:relative;height:calc(var(--card-width)*1.4);flex:1;min-width:0;--hand-card-width:var(--card-width);--hand-min-peek:2cqmin;}

  .shared-table{position:absolute;left:50%;top:50%;width:66cqmin;height:66cqmin;margin:-33cqmin 0 0 -33cqmin;transform:rotate(var(--rotation)) translateY(-4cqmin);transition:transform 650ms cubic-bezier(.2,.7,.2,1);border:1px solid #c9a66355;border-radius:50%;background:radial-gradient(ellipse,#16333c44,#05141b55);display:flex;flex-direction:column;align-items:stretch;z-index:2;--icon-size:2cqmin;}
  .shared-table.finished{transform:none;transition:none;}
  .shared-table.playing{width:var(--table-width);height:58cqmin;margin: -29cqmin 0 0 calc(var(--table-width) / -2);transform:rotate(var(--rotation)) translateY(-8cqmin);border-radius:4cqmin;}
  .shared-table.playing[data-temple-dock=right]{translate:calc(-13cqmin * cos(var(--rotation))) calc(-13cqmin * sin(var(--rotation)));}
  .shared-table.playing .market{height:27cqmin;}.shared-table.playing .temples{height:11cqmin;gap:1cqmin;}.shared-table.playing .temples button{width:16cqmin;}.shared-table.playing .play-area{height:27cqmin;}.shared-table.playing .table-message{height:4cqmin;}
  .shared-table.playing .temples.side{position:absolute;}.shared-table.playing[data-temple-dock=right] .temples.side{left:calc(100% + 2cqmin);top:0;width:24cqmin;height:58cqmin;flex-direction:column;justify-content:center;gap:1cqmin;}.shared-table.playing[data-temple-dock=right] .temples button{width:22cqmin;}
  .shared-table.playing[data-temple-dock=top] .temples.side{left:0;bottom:calc(100% + 2cqmin);width:100%;height:14cqmin;}.temples button.zoomed{visibility:hidden;}
  .welcome{position:absolute;inset:19cqmin 10cqmin;text-align:center;white-space:nowrap;line-height:1.1;}.welcome h1{font-size:6.5cqmin;}.welcome p,.welcome span{font-size:1.3cqmin;}.start-control{position:absolute;left:50%;top:50%;width:19cqmin;margin-left:-9.5cqmin;transform:rotate(var(--start-angle)) translateY(15cqmin);transform-origin:50% 0;display:grid;justify-items:center;gap:.8cqmin;}.start{width:12cqmin;font-size:2.3cqmin;min-height:5cqmin;}.start-control label{display:flex;gap:.4cqmin;align-items:center;font-size:1cqmin;white-space:nowrap;}.start-control input{width:1.5cqmin;height:1.5cqmin;accent-color:#dab672;}.setup-note{position:absolute;top:35cqmin;left:17cqmin;width:24cqmin;text-align:center;font-size:1cqmin;line-height:1.5;}
  .shared-table.playing[data-temple-dock=inline] .market{height:24cqmin;} .shared-table.playing[data-temple-dock=inline] .temples{height:10cqmin;} .shared-table.playing[data-temple-dock=inline] .play-area{height:24cqmin;}
  .play-area.choosing{opacity:.16;}
  /* Card indices order the piles locally, below worship and choice overlays. */
  .play-area{isolation:isolate;}
  .choice-stage{position:absolute;left:0;bottom:4cqmin;width:100%;height:calc(var(--card-width)*1.4);z-index:10;--center-left:0px;--center-width:100%;--play-top:0px;--table-card-width:var(--card-width);--table-card-height:calc(var(--card-width)*1.4);--motion-speed:1.5;}
  .turn-status{width:100%;text-align:center;}.turn-status strong{display:block;font-size:1.35cqmin;line-height:1.3;font-weight:600;text-transform:capitalize;white-space:nowrap;}.counters{display:grid;grid-template-columns:repeat(2,1fr);justify-items:center;gap:0;--icon-size:3.25cqmin;--icon-number-scale:.8;}
  .market{height:23cqmin;flex-shrink:0;width:100%;}.temples{height:8.5cqmin;display:flex;align-items:center;justify-content:center;gap:1cqmin;}.temples button{width:10cqmin;padding:0;background:none;border:0;}.play-area{height:17cqmin;display:flex;justify-content:center;align-items:center;gap:3cqmin;position:relative;}.played,.purchased{position:relative;flex:var(--count) 1 0;min-width:var(--card-width);max-width:calc(var(--card-width) * (1 + (var(--count) - 1)*1.04));height:calc(var(--card-width)*1.4);--step:calc((100% - var(--card-width))/max(1,var(--count) - 1));}.played:empty,.purchased:empty{display:none;}.table-card,.played button,.purchased button{position:absolute;left:calc(var(--index)*var(--step));top:0;}.table-card{width:var(--card-width);z-index:calc(var(--index)*2);pointer-events:none;}.played button,.purchased button{width:var(--step);height:100%;z-index:calc(var(--index)*2 + 1);padding:0;border:0;background:none;}.played button:last-child,.purchased button:last-child{width:var(--card-width);}.reveal-anchor{position:absolute;width:var(--card-width);height:calc(var(--card-width)*1.4);pointer-events:none;}.empty-play{font:2.3cqmin 'Cormorant Garamond',serif;color:#dfc18a66;}.table-message{position:absolute;bottom:0;left:0;right:0;z-index:4;background:#091b25ee;border-radius:1cqmin;height:5.5cqmin;text-align:center;font-size:1.1cqmin;line-height:1.3;}.table-message button{min-height:2.8cqmin;font-size:1.1cqmin;padding:.4cqmin .8cqmin;}.table-message p{margin:.2cqmin 1cqmin;}.choice-instruction{color:#ffe69e;}
  .shared-table:has(.welcome){width:58cqmin;height:58cqmin;margin:-29cqmin 0 0 -29cqmin;transform:none;}
  .draft{padding:7cqmin 4cqmin;text-align:center;font-size:1.3cqmin;}.draft-leaders{display:grid;grid-template-columns:1fr 1fr;gap:1.5cqmin;margin:2cqmin 0;}.draft-leaders button{border:0;padding:0;background:none;}.draft-leaders button:disabled{opacity:.4;}
  .inspection,.error{position:absolute;z-index:10;left:7%;top:10%;width:86%;padding:2cqmin;border:1px solid var(--gold);border-radius:2cqmin;background:#091b25f5;box-sizing:border-box;text-align:center;font-size:1.5cqmin;}.inspection{width:45%;left:27.5%;top:5%;}.inspection button{margin-top:1cqmin;}.error{top:38%;color:#ffd19b;}.error button{margin:1cqmin;}
  .edge{transition:width 400ms ease-out,height 400ms ease-out,top 400ms ease-out,left 400ms ease-out;}.table-hand,.leader{transition:width 400ms ease-out,height 400ms ease-out;}
  .edge.inactive{width:43cqmin;height:12cqmin;--edge-inset:6.5cqmin;--card-width:6.5cqmin;}.edge.inactive .table-hand{height:9.1cqmin;}.edge.inactive .leader,.edge.inactive .leader-status{width:6cqmin;}.edge.inactive .edge-controls{height:2cqmin;}.edge.inactive .edge-line{gap:1cqmin;}
  .corner-controls{position:absolute;z-index:12;display:flex;align-items:center;gap:1cqmin;transform:rotate(var(--corner-angle));transform-origin:calc(100% - 2.25cqmin) 2.25cqmin;}.corner-controls[data-corner=south]{right:1cqmin;bottom:1cqmin;}.corner-controls[data-corner=west]{right:calc(100% - 5.5cqmin);bottom:1cqmin;}.corner-controls[data-corner=north]{right:calc(100% - 5.5cqmin);top:1cqmin;}.corner-controls[data-corner=east]{right:1cqmin;top:1cqmin;}.exit{font-size:3cqmin;width:4.5cqmin;height:4.5cqmin;padding:0;}.exit-shade{position:absolute;inset:0;background:#0009;z-index:29;}.exit-confirm{position:absolute;z-index:30;left:50%;top:50%;width:40cqmin;background:#091b25;border:1px solid var(--gold);border-radius:2cqmin;padding:3cqmin;text-align:center;box-shadow:0 1cqmin 4cqmin #000b;}.exit-confirm button{margin:1cqmin;}.close-notice{position:absolute;bottom:0;left:25%;width:50%;text-align:center;z-index:40;background:#091b25;}
  .corner-controls{--icon-size:1.5vmin;height:4.5vmin;}.corner-controls button{height:4.5vmin;box-sizing:border-box;}.corner-controls button[aria-pressed=true]{border-color:#ffe3a3;background:#24454d;}
  .reader-dock{position:absolute;z-index:8;container-type:size;box-sizing:border-box;}
  .reader-dock[data-reader-edge=south]{right:6vmin;width:21vmin;top:calc(var(--reader-top) + 6vmin);bottom:calc(var(--reader-bottom) + 6vmin);}
  .reader-dock[data-reader-edge=north]{left:6vmin;width:21vmin;top:calc(var(--reader-top) + 6vmin);bottom:calc(var(--reader-bottom) + 6vmin);}
  .reader-dock[data-reader-edge=west]{bottom:6vmin;height:21vmin;left:calc(var(--reader-left) + 6vmin);right:calc(var(--reader-right) + 6vmin);}
  .reader-dock[data-reader-edge=east]{top:6vmin;height:21vmin;left:calc(var(--reader-left) + 6vmin);right:calc(var(--reader-right) + 6vmin);}
  .reader-panel{position:absolute;left:50%;top:50%;width:100cqw;height:100cqh;transform:translate(-50%,-50%) rotate(var(--reader-angle));background:#091b25f5;border:1px solid var(--gold);border-radius:1vmin;padding:1.2vmin;box-sizing:border-box;display:flex;flex-direction:column;gap:1vmin;box-shadow:0 .5vmin 2vmin #0008;}
  .reader-dock[data-reader-edge=west] .reader-panel,.reader-dock[data-reader-edge=east] .reader-panel{width:100cqh;height:100cqw;}
  .reader-panel header{display:flex;align-items:center;justify-content:space-between;gap:1vmin;}.reader-panel h2{font-size:2.4vmin;}.reader-panel button{font-size:1.5vmin;min-height:3.6vmin;padding:.5vmin 1vmin;}
  .reader-panel header:has(.new-game){gap:.5vmin;}.reader-panel header:has(.new-game) h2{font-size:2vmin;}.reader-panel header:has(.new-game) button{padding:.5vmin;}.reader-panel .new-game{font-size:1.3vmin;white-space:nowrap;}
  .reader-scroll{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;font-size:clamp(12px,1.5vmin,28px);line-height:1.5;margin:0;padding:0;}.chronicle{list-style:none;}.chronicle li{padding:1vmin 0;border-bottom:1px solid #c9a66333;}.trash-cards{display:grid;grid-template-columns:1fr 1fr;gap:.8vmin;}.trash-cards button{border:0;padding:0;background:none;}.trash-reader>button{margin-bottom:1vmin;}
  @media(prefers-reduced-motion:reduce){.shared-table,.edge,.table-hand,.leader{transition:none;}}
</style>
