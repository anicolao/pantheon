<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { base } from '$app/paths';
  import PublicMotion from '$lib/components/play/PublicMotion.svelte';
  import { measureLayout, type Layout } from '$lib/components/play/motion-layout';
  import CardFace from '$lib/components/CardFace.svelte';
  import CardBack from '$lib/components/CardBack.svelte';
  import ResourceIcon from '$lib/components/ResourceIcon.svelte';
  import Portrait from '$lib/components/play/Portrait.svelte';
  import SupplyCoverflow from '$lib/components/play/SupplyCoverflow.svelte';
  import WorshipFace from '$lib/components/play/WorshipFace.svelte';
  import { cardGesture } from '$lib/components/play/card-gesture';
  import { sortHand } from '$lib/components/play/hand-order';
  import { tablePlayed } from '$lib/components/play/table-play';
  import { tablePurchases } from '$lib/components/play/table-purchases';
  import { replaySetup, leaderIds, type SetupState } from '$lib/game/setup';
  import { activePlayer, canPlayAction, canPlayTreasure, definition, eligibleGains, standings, worshipReason } from '$lib/game/actions';
  import { canUndo } from '$lib/game/undo';
  import type { GameCommand } from '$lib/backend/setup-repository';
  import type { BotProposal } from '$lib/bots/table';
  import { freshTable, occupy, begin, append, advanceEmptyActions, restoreTable, actor, edges, seatUid, seatName, type Edge, type Seat } from '$lib/tabletop/table';

  const storageKey = 'pantheon-tabletop-v1';
  let table = $state(freshTable()), mounted = $state(false), error = $state('');
  let board = $state<HTMLElement>(), rotation = $state(0), moving = $state(false), working = $state(false);
  let targets = $state<string[]>([]), inspected = $state(''), showLog = $state(false), confirmReset = $state(false);
  let pending = $state<GameCommand | null>(null), pendingText = $state('');
  let displayedUid = $state(''), animating = $state(false), reduced = $state(true), exitEdge = $state<Edge | null>(null), closeNotice = $state(false);
  let motionBefore: Layout = {poses:[],width:100}, settleMotion: (()=>void) | undefined;
  let worker: Worker | undefined, request = 0, generation = 0;
  const game = $derived(table.events.length ? replaySetup(table.events) : null);
  const uid = $derived(game ? displayedUid || actor(game) : '');
  const activeSeat = $derived(table.seats.find(seat => seatUid(seat.edge) === uid));
  const finished = $derived(game?.turn.phase === 'finished');
  const human = $derived(activeSeat?.mode === 'human');
  const ready = $derived(mounted && !moving && !working && !animating && !exitEdge && !showLog && !finished);
  const choice = $derived(game?.turn.choice);
  const scores = $derived(game?.phase === 'playing' ? standings(game) : []);
  const occupied = $derived(table.seats.filter(seat => seat.mode !== 'empty'));
  const gains = $derived(game && choice?.kind === 'gain' ? eligibleGains(game, choice.limit!, choice.actionOnly) : []);
  const marketSelection = $derived(choice?.kind === 'gain' ? {
    options: gains.map(card => ({ id: card.id, cardId: card.id, copy: 1 })), selected: targets,
    choose: (id: string) => void resolve([id]), kind: 'gain', choiceId: choice.id,
    browsedCardId: choice.browsedCardId, readOnly: !human || !ready
  } : undefined);
  const instruction = $derived(!choice ? '' : choice.kind === 'gain' ? `Choose ${choice.actionOnly ? 'an Action' : 'a card'} costing up to ${choice.limit} from the market` : `Choose ${choice.min === choice.max ? choice.max : `up to ${choice.max}`} to ${choice.kind} from your hand`);

  function playerName(id: string) {
    const seat = table.seats.find(seat=>seatUid(seat.edge)===id);
    return definition(game?.leaders[id] ?? seat!.leader).name.split(',')[0];
  }
  function message(text: string) {
    return text.replace(/\b(South|West|North|East)\b/g, name=>playerName(seatUid(name.toLowerCase() as Edge)));
  }
  function flightsSettled() { animating=false; settleMotion?.(); settleMotion=undefined; }
  function closeWindow() { window.close(); closeNotice=true; exitEdge=null; }
  function requestExit(edge: Edge) { if(game && !finished) exitEdge=edge; else closeWindow(); }
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(table)); }
    catch { error = 'This browser could not save the table. Keep this tab open to continue.'; }
  }
  function seatMode(edge: Edge, mode: Seat['mode']) { table = occupy(table, edge, mode); save(); }
  function newTable() {
    generation++; request++; worker?.terminate(); worker = undefined;
    flightsSettled(); displayedUid=''; exitEdge=null;
    table = freshTable(); targets = []; inspected = ''; pending = null; confirmReset = false;
    rotation = 0; showLog = false; moving = false; working = false; error = ''; save();
  }
  function start() {
    try { table = advanceEmptyActions(begin(table, crypto.randomUUID())); displayedUid=actor(replaySetup(table.events)); error = ''; save(); }
    catch (cause) { error = cause instanceof Error ? cause.message : String(cause); }
  }
  async function commit(command: GameCommand, player = uid) {
    const current = generation;
    try {
      const next = advanceEmptyActions(append(table, player, command));
      motionBefore = measureLayout();
      const animate = game?.phase==='playing' && !reduced;
      const settled = animate ? new Promise<void>(resolve=>{settleMotion=resolve;animating=true;}) : Promise.resolve();
      if(game?.phase==='playing') displayedUid=player;
      table = next;
      targets = []; inspected = ''; pending = null; error = ''; save();
      await tick();
      await settled;
      if(current!==generation)return;
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
    if (!ready || !human || !game || choice) return;
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
    if (choice && choice.kind !== 'gain') {
      if (targets.includes(id)) targets = targets.filter(target => target !== id);
      else if (targets.length < choice.max) targets = [...targets, id];
      return;
    }
    if (canPlayAction(game, uid, id)) void send({ type: 'action/played', instanceId: id });
    else if (canPlayTreasure(game, uid, id)) void send({ type: 'treasure/played', instanceId: id });
  }
  function playable(state: SetupState, id: string) {
    return choice ? choice.kind !== 'gain' : canPlayAction(state, uid, id) || canPlayTreasure(state, uid, id);
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
      worker ??= new Worker(new URL('../../lib/bots/table-worker.ts', import.meta.url), { type: 'module' });
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
    try { const saved = localStorage.getItem(storageKey); if (saved) table = restoreTable(saved); }
    catch { error = 'The saved table could not be restored. Start a new table to play.'; }
    const media=matchMedia('(prefers-reduced-motion: reduce)'), update=()=>{reduced=media.matches;};
    update();media.addEventListener('change',update);
    mounted = true;
    return () => { generation++; worker?.terminate(); flightsSettled(); media.removeEventListener('change',update); };
  });
</script>

<svelte:head><title>Pantheon · Tabletop</title><meta name="description" content="Four edges, one shared table. Join a leader, draft, and play Pantheon together on a tabletop display."/></svelte:head>
<main class="tabletop" data-e2e-layout data-status="synced" data-tabletop-phase={game?.phase ?? 'gathering'} style:--table-art={`url('${base}/assets/ui/table-desktop.webp')`}>
  <div class="table-inlay" aria-hidden="true"></div>
  {#each table.seats as seat, index (seat.edge)}
    {@const id = seatUid(seat.edge)}
    {@const active = uid === id && !finished}
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
          <button class="leader" data-public-card={leader} data-public-zone="leader" data-public-uid={id} data-motion-angle={index*90} aria-label={`Inspect ${playerName(id)} leader`} onclick={() => inspect(leader)}><Portrait {leader} name={playerName(id)} {active} points={scores.find(score=>score.uid===id)?.score}/></button>
          {#if game.phase === 'playing'}
            <div class="edge-deck" data-public-zone="deck" data-public-uid={id} data-motion-angle={index*90}><ResourceIcon resource="cards" value={game.decks[id].deck.length} label={`${playerName(id)} deck`}/></div>
            <div class="table-hand" data-hand-owner={id} data-face-up={active} style:--count={game.decks[id].hand.length}>
              {#each sortHand(game.decks[id].hand) as card, position (card.id)}
                <div class="hand-slot" class:table-card-measure={active} data-motion-key={`hand:${card.id}`} data-motion-zone="hand" data-motion-uid={id} data-motion-card={card.id} data-motion-face={active ? card.cardId : undefined} data-motion-copy={card.copy} data-motion-angle={index*90} class:selected={active && targets.includes(card.id)} style:--position={position} style:--stack={position}>
                  <span class="flip" class:faceup={active}>
                    <span class="front" aria-hidden={!active}><CardFace card={definition(card.cardId)} copy={card.copy} players={game.playerCount}/></span>
                    <span class="back" aria-hidden={active}><CardBack format="deck"/></span>
                  </span>
                </div>
                <button class="hand-card" class:playable={active && playable(game,card.id)}
                  disabled={!active || !ready || !human} style:--position={position} style:--stack={position}
                  aria-label={active ? `${choice && choice.kind !== 'gain' ? 'Select' : 'Play'} ${definition(card.cardId).name}` : `${playerName(id)} face-down card`}
                  use:cardGesture={{ activate: () => handCard(card.id), inspect: () => inspect(card.cardId) }}></button>
              {/each}
            </div>
            <div class="edge-deck" data-public-zone="discard" data-public-uid={id} data-motion-angle={index*90}><ResourceIcon resource="discard" value={game.decks[id].discard.length} label={`${playerName(id)} discard`}/></div>
          {:else}<p class="draft-wait">{active ? 'Choose a leader from the table' : game.leaders[id] ? 'Leader chosen' : 'Waiting to draft'}</p>{/if}
        </div>
        <div class="edge-controls">
          {#if active && game.phase === 'playing' && human}
            <button disabled={!ready || !!choice || !game.decks[id].hand.some(card=>canPlayTreasure(game!,id,card.id))} onclick={()=>send({type:'treasures/played'})}>Play all Treasures</button>
            {#if canUndo(game,id)}<button disabled={!ready} onclick={()=>send({type:'action/undone',targetSequence:game!.undo!.sequence})}>Undo</button>{/if}
            <button class="primary" disabled={!ready || !!choice} onclick={finishTurn}>End turn</button>
          {:else}<span>{finished ? 'Final score' : active ? 'Bot is playing' : `Turn ${game.turnOrder.indexOf(id)+1}`}</span>{/if}
        </div>
      {/if}
    </section>
  {/each}

  <section class="shared-table" bind:this={board} style:--rotation={`${rotation}deg`} aria-label="Shared table" aria-busy={moving || working || animating} data-facing={activeSeat?.edge ?? 'south'}>
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
      <div class="results"><p class="eyebrow">The empires of Olympus</p><h1>Final standing</h1>{#each scores as score}<p><strong>{playerName(score.uid)}</strong><ResourceIcon resource="victory" value={score.score}/></p>{/each}<button class="primary" onclick={newTable}>New table</button></div>
    {:else if game.phase === 'draft'}
      <div class="draft"><p class="eyebrow">{playerName(uid)} chooses · {human ? 'Tap your bloodline' : 'Bot is choosing'}</p><h1>Choose your leader</h1><p>Play starts at {playerName(game.turnOrder[0])}, then goes clockwise.</p>
        <div class="draft-leaders">{#each leaderIds as leader}<button disabled={!ready || !human || Object.values(game.leaders).includes(leader)} aria-label={`Choose ${definition(leader).name.split(',')[0]}`} onclick={()=>send({type:'leader/chosen',leaderId:leader})}><CardFace card={definition(leader)} players={game.playerCount}/></button>{/each}</div>
        <p>Draft: {game.draftOrder.map(playerName).join(' → ')}</p>
      </div>
    {:else}
      <div class="table-status"><strong>{playerName(uid)}’s turn</strong><span>{game.turn.phase} · Turn {game.turn.number}</span><div class="counters">{#each ['actions','coins','buys','worship'] as resource}<ResourceIcon resource={resource as 'actions'|'coins'|'buys'|'worship'} value={game.resources[resource as keyof typeof game.resources]}/>{/each}</div></div>
      <div class="market"><SupplyCoverflow {game} {uid} ready={ready && human && (!choice || choice.kind==='gain')} visible={true} {inspect} onDialog={()=>{}} command={send} selection={marketSelection} {rotation} followAffordable={!animating} warnOnActions={false}/></div>
      <div class="temples" aria-label="Worship actions">{#each [...game.sharedEvents].sort((a,b)=>(definition(a).cost??0)-(definition(b).cost??0)||definition(a).name.localeCompare(definition(b).name)) as event}<button disabled={!ready || !human || !!worshipReason(game,uid,event)} data-public-zone="altar" data-public-card={event} data-motion-angle={rotation} aria-label={`Worship ${definition(event).god}`} onclick={()=>send({type:'god/worshipped',cardId:event})}><WorshipFace {game} {uid} cardId={event} dimUnavailable/></button>{/each}</div>
      <div class="play-area" data-public-zone="play" data-public-uid={uid} data-motion-angle={rotation} aria-label="Played cards"><span class="reveal-anchor" data-public-zone="reveal" data-public-uid={uid} data-motion-angle={rotation} aria-hidden="true"></span>
        {#if !game.decks[uid].play.length && !tablePurchases(game,uid).length}<span class="empty-play">Your play area</span>{/if}
        <div class="played">{#each tablePlayed(game,uid) as card}<button data-motion-key={`play:${card.id}`} data-motion-zone="play" data-motion-uid={uid} data-motion-card={card.id} data-motion-face={card.cardId} data-motion-copy={card.copy} data-motion-angle={rotation} aria-label={`Inspect played ${definition(card.cardId).name}`} onclick={()=>inspect(card.cardId)}><CardFace card={definition(card.cardId)} copy={card.copy} players={game.playerCount}/></button>{/each}</div>
        <div class="purchased">{#each tablePurchases(game,uid) as card}<button data-motion-key={`purchase:${card.id}`} data-motion-zone="play" data-motion-uid={uid} data-motion-card={card.id} data-motion-face={card.cardId} data-motion-copy={card.copy} data-motion-angle={rotation} aria-label={`Inspect purchased ${definition(card.cardId).name}`} onclick={()=>inspect(card.cardId)}><CardFace card={definition(card.cardId)} copy={card.copy} players={game.playerCount}/></button>{/each}</div>
      </div>
      <div class="table-message">
        {#if pending}<p>{pendingText}</p><button class="primary" disabled={!ready} onclick={acceptPending}>Confirm</button><button onclick={()=>pending=null}>Keep playing</button>
        {:else if choice}<p class="choice-instruction" role="status">{definition(choice.source).name}: {instruction}</p>{#if choice.kind!=='gain'}<button class="primary" disabled={!ready || !human || targets.length<choice.min} onclick={()=>resolve()}>{choice.kind==='trash'?'Done trashing':'Discard selected'} ({targets.length})</button>{:else if choice.min===0}<button disabled={!ready || !human} onclick={()=>resolve([])}>Gain none</button>{/if}
        {:else}<p>{message(game.activity.at(-1)?.message ?? '')}</p>{/if}
      </div>
    {/if}
    {#if inspected}<div class="inspection"><CardFace card={definition(inspected)} players={game?.playerCount??4}/><button class="primary" onclick={()=>inspected=''}>Return to table</button></div>{/if}
    {#if showLog && game}<section class="chronicle"><h2>Chronicle</h2><ol>{#each game.activity.slice(-30).reverse() as entry}<li>{message(entry.message)}</li>{/each}</ol><button onclick={()=>showLog=false}>Close Chronicle</button></section>{/if}
    {#if confirmReset}<div class="reset-confirm"><p>Finish this table and start a new one?</p><button onclick={newTable}>New table</button><button onclick={()=>confirmReset=false}>Keep playing</button></div>{/if}
    {#if error}<div class="error" role="alert">{error}{#if activeSeat?.mode==='bot'}<button onclick={()=>{worker?.terminate();worker=undefined;error='';working=false;}}>Continue bot turn</button>{/if}<button onclick={()=>confirmReset=true}>New table</button></div>{/if}
    <footer><a href={`${base}/`}>Sanctuary</a>{#if game}<span class="trash-pile" data-public-zone="trash" data-motion-angle={rotation}><ResourceIcon resource="trash" value={game.trash.length} label={`${game.trash.length} cards in the trash`}/></span><button onclick={()=>showLog=!showLog}>Chronicle</button><button onclick={()=>confirmReset=true}>New table</button>{:else}<span>Shared-screen tabletop</span>{/if}</footer>
  </section>
  {#each edges as edge, index}
    <div class="corner-controls" data-corner={edge} style:--corner-angle={`${index*90}deg`}>
      {#if game}<button onclick={()=>showLog=!showLog} aria-label={`Chronicle for ${playerName(seatUid(edge))}`}>Chronicle</button>{/if}
      <button class="exit" aria-label={`Exit from ${playerName(seatUid(edge))} edge`} onclick={()=>requestExit(edge)}>×</button>
    </div>
  {/each}
  {#if exitEdge}<div class="exit-shade" aria-hidden="true"></div><div class="exit-confirm" tabindex="-1" role="dialog" aria-modal="true" aria-label="Leave the table?" data-exit-edge={exitEdge} style:transform={`translate(-50%,-50%) rotate(${edges.indexOf(exitEdge)*90}deg)`}><h2>Leave the table?</h2><p>Your game is saved in this browser.</p><button onclick={closeWindow}>Exit</button><button class="primary" onclick={()=>exitEdge=null}>Keep playing</button></div>{/if}
  {#if closeNotice}<p class="close-notice" role="status">If your browser keeps this window open, close its tab to leave.</p>{/if}
  {#if game?.phase==='playing'}<PublicMotion {game} {uid} openDraw={()=>{}} previousLayout={()=>motionBefore} status="synced" {reduced} visible={true} onFlightsSettled={flightsSettled}/>{/if}
</main>

<style>
  .tabletop{position:fixed;inset:0;overflow:hidden;background:radial-gradient(ellipse at center,#112a36cc,#071321e8 70%),var(--table-art) center/cover;color:#f4e4bf;font-family:'Atkinson Hyperlegible',sans-serif;--unit:1vmin;--gold:#c9a663;--card-width:11vmin;}
  .table-inlay{position:absolute;inset:3vmin;border:1px solid #b6965744;border-radius:18%;box-shadow:inset 0 0 0 1vmin #050b1277,inset 0 0 0 1.1vmin #d7b97422;pointer-events:none;}
  button,a{touch-action:manipulation;}button{font:inherit;color:inherit;background:#102632;border:1px solid #c9a66388;border-radius:.8vmin;padding:.7vmin 1.2vmin;cursor:pointer;min-height:3.6vmin;font-size:clamp(10px,1.25vmin,24px);}button:disabled{cursor:default;filter:brightness(.65) saturate(.65);}button:not(:disabled):hover,button:focus-visible{outline:2px solid #f6dc9b;outline-offset:2px;}.primary{background:linear-gradient(#f0d89a,#a5803f);color:#15212a;font-weight:700;box-shadow:0 .4vmin 1vmin #0008;}a{color:#e9cf92;}p{margin:.6vmin 0;}h1,h2{font-family:'Cormorant Garamond',serif;font-weight:600;margin:0;}h1{font-size:4.5vmin;}.eyebrow{text-transform:uppercase;letter-spacing:.14em;font-size:1.1vmin;color:#d3b47a;}
  .edge{position:absolute;width:62vmin;height:20vmin;left:50%;top:calc(100% - var(--edge-inset,10.5vmin));transform:translate(-50%,-50%) rotate(var(--angle));transform-origin:center;z-index:3;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.7vmin;}
  .edge[data-edge=west]{left:var(--edge-inset,10.5vmin);top:50%;}.edge[data-edge=north]{top:var(--edge-inset,10.5vmin);}.edge[data-edge=east]{left:calc(100% - var(--edge-inset,10.5vmin));top:50%;}
  .edge.gathering{height:26vmin;--edge-inset:14vmin;}.join-portrait{width:16vmin;border:0;background:none;padding:0;filter:drop-shadow(0 1vmin 1vmin #0008);}.join-portrait span{display:block;font-size:1.3vmin;white-space:nowrap;}.seat-mode{font-size:1.2vmin;min-height:3.5vmin;}.edge-line{width:100%;display:flex;align-items:center;gap:1.5vmin;}.leader{width:9vmin;flex-shrink:0;background:none;border:0;padding:0;}.edge-deck{--icon-size:2.3vmin;flex-shrink:0;}.edge-controls{display:flex;justify-content:center;align-items:center;gap:1vmin;height:3.8vmin;font-size:1.3vmin;}.draft-wait{font-size:1.8vmin;}
  .table-hand{position:relative;height:15.4vmin;flex:1;min-width:0;perspective:100vmin;}.hand-slot,.hand-card{position:absolute;padding:0;width:var(--card-width);height:15.4vmin;top:0;left:calc(var(--position) * (100% - var(--card-width)) / max(1,var(--count) - 1));border:0;background:none;z-index:var(--stack);border-radius:.6vmin;transition:top 180ms ease-out;}.hand-slot{pointer-events:none;}.hand-card{width:calc((100% - var(--card-width)) / max(1,var(--count) - 1));border-radius:0;}.hand-card:last-child{width:var(--card-width);}.hand-slot:has(+ .hand-card:not(:disabled):hover){filter:brightness(1.13);}.hand-slot.selected{outline:.3vmin solid #f6dd8b;top:-1vmin;}.hand-card:disabled{filter:none;}.flip{display:block;width:100%;height:100%;position:relative;transform:rotateY(180deg);transform-style:preserve-3d;transition:transform 450ms ease-out;}.flip.faceup{transform:rotateY(0);}.front,.back{position:absolute;inset:0;backface-visibility:hidden;}.back{transform:rotateY(180deg);}
  .shared-table{position:absolute;left:50%;top:50%;width:66vmin;height:66vmin;margin:-33vmin 0 0 -33vmin;transform:rotate(var(--rotation)) translateY(-4vmin);transition:transform 650ms cubic-bezier(.2,.7,.2,1);border:1px solid #c9a66355;border-radius:50%;background:radial-gradient(ellipse,#16333c44,#05141b55);display:flex;flex-direction:column;align-items:stretch;z-index:2;--icon-size:2vmin;}
  .welcome{position:absolute;inset:19vmin 10vmin;text-align:center;white-space:nowrap;line-height:1.1;}.welcome h1{font-size:6.5vmin;}.welcome p,.welcome span{font-size:1.3vmin;}.start-control{position:absolute;left:50%;top:50%;width:19vmin;margin-left:-9.5vmin;transform:rotate(var(--start-angle)) translateY(15vmin);transform-origin:50% 0;display:grid;justify-items:center;gap:.8vmin;}.start{width:12vmin;font-size:2.3vmin;min-height:5vmin;}.start-control label{display:flex;gap:.4vmin;align-items:center;font-size:1vmin;white-space:nowrap;}.start-control input{width:1.5vmin;height:1.5vmin;accent-color:#dab672;}.setup-note{position:absolute;top:35vmin;left:17vmin;width:24vmin;text-align:center;font-size:1vmin;line-height:1.5;}
  .table-status{height:7vmin;flex-shrink:0;text-align:center;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:0 1vmin;font-size:1.25vmin;}.table-status strong{font-family:'Cormorant Garamond',serif;font-size:2.5vmin;}.counters{display:flex;gap:1vmin;justify-content:center;width:100%;--icon-size:1.7vmin;}.market{height:23vmin;flex-shrink:0;width:100%;}.temples{height:8.5vmin;display:flex;align-items:center;justify-content:center;gap:1vmin;}.temples button{width:10vmin;padding:0;background:none;border:0;}.play-area{height:17vmin;display:flex;justify-content:center;align-items:center;gap:3vmin;position:relative;}.played,.purchased{display:flex;max-width:72%;align-items:center;justify-content:center;}.played button,.purchased button{width:8vmin;flex:0 1 8vmin;min-width:0;padding:0;border:0;background:none;}.played button+button,.purchased button+button{margin-left:.35vmin;}.reveal-anchor{position:absolute;width:11vmin;height:15.4vmin;pointer-events:none;}.trash-pile{--icon-size:2vmin;}.empty-play{font:2.3vmin 'Cormorant Garamond',serif;color:#dfc18a66;}.table-message{height:5.5vmin;text-align:center;font-size:1.1vmin;line-height:1.3;}.table-message button{min-height:2.8vmin;font-size:1.1vmin;padding:.4vmin .8vmin;}.table-message p{margin:.2vmin 1vmin;}.choice-instruction{color:#ffe69e;}
  footer{position:absolute;top:calc(100% - 2vmin);left:0;width:100%;display:flex;align-items:center;justify-content:center;gap:1.6vmin;font-size:1vmin;margin-top:0;} .shared-table:has(.welcome){width:58vmin;height:58vmin;margin:-29vmin 0 0 -29vmin;transform:none;} .shared-table:has(.welcome) footer{top:40vmin;}footer button{border:0;background:none;min-height:2vmin;padding:.2vmin;font-size:1vmin;}
  .draft,.results{padding:7vmin 4vmin;text-align:center;font-size:1.3vmin;}.draft-leaders{display:grid;grid-template-columns:1fr 1fr;gap:1.5vmin;margin:2vmin 0;}.draft-leaders button{border:0;padding:0;background:none;}.draft-leaders button:disabled{opacity:.4;}.results p{display:flex;justify-content:center;align-items:center;gap:2vmin;font-size:2vmin;}
  .inspection,.chronicle,.reset-confirm,.error{position:absolute;z-index:10;left:7%;top:10%;width:86%;padding:2vmin;border:1px solid var(--gold);border-radius:2vmin;background:#091b25f5;box-sizing:border-box;text-align:center;font-size:1.5vmin;}.inspection{width:45%;left:27.5%;top:5%;}.inspection button{margin-top:1vmin;}.chronicle{height:80%;display:flex;flex-direction:column;}.chronicle ol{flex:1;overflow:auto;text-align:left;font-size:1.2vmin;line-height:1.5;padding-left:2vmin;}.error{top:38%;color:#ffd19b;}.reset-confirm{top:38%;}.reset-confirm button,.error button{margin:1vmin;}
  .edge{transition:width 400ms ease-out,height 400ms ease-out,top 400ms ease-out,left 400ms ease-out;}.table-hand,.leader{transition:width 400ms ease-out,height 400ms ease-out;}.hand-slot,.hand-card{transition:width 400ms ease-out,height 400ms ease-out,top 180ms ease-out;}
  .edge.inactive{width:43vmin;height:12vmin;--edge-inset:6.5vmin;--card-width:6.5vmin;}.edge.inactive .table-hand,.edge.inactive .hand-slot,.edge.inactive .hand-card{height:9.1vmin;}.edge.inactive .leader{width:6vmin;}.edge.inactive .edge-controls{height:2vmin;}.edge.inactive .edge-line{gap:1vmin;}
  .corner-controls{position:absolute;z-index:12;display:flex;align-items:center;gap:1vmin;transform:rotate(var(--corner-angle));transform-origin:calc(100% - 2.25vmin) 2.25vmin;}.corner-controls[data-corner=south]{right:1vmin;bottom:1vmin;}.corner-controls[data-corner=west]{right:calc(100% - 5.5vmin);bottom:1vmin;}.corner-controls[data-corner=north]{right:calc(100% - 5.5vmin);top:1vmin;}.corner-controls[data-corner=east]{right:1vmin;top:1vmin;}.exit{font-size:3vmin;width:4.5vmin;height:4.5vmin;padding:0;}.exit-shade{position:absolute;inset:0;background:#0009;z-index:29;}.exit-confirm{position:absolute;z-index:30;left:50%;top:50%;width:40vmin;background:#091b25;border:1px solid var(--gold);border-radius:2vmin;padding:3vmin;text-align:center;box-shadow:0 1vmin 4vmin #000b;}.exit-confirm button{margin:1vmin;}.close-notice{position:absolute;bottom:0;left:25%;width:50%;text-align:center;z-index:40;background:#091b25;}
  @media(prefers-reduced-motion:reduce){.shared-table,.flip,.hand-card,.hand-slot,.edge,.table-hand,.leader{transition:none;}}
</style>
