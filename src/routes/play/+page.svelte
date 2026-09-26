<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { fly } from 'svelte/transition';
  import { base } from '$app/paths';
  import { afterNavigate, goto } from '$app/navigation';
  import { connectFirebase } from '$lib/backend/firebase';
  import { rememberTable } from '$lib/navigation/return-table';
  import { appendGameCommand, type GameCommand, createRoom, type CreationAttempt, resizeRoom, enterRoom, inspectRoom, SetupError, watchSetup } from '$lib/backend/setup-repository';
  import { setupSupply, type SetupState } from '$lib/game/setup';
  import GatheringSeat from '$lib/components/GatheringSeat.svelte';
  import GameButton from '$lib/components/GameButton.svelte';
  import SanctuaryLink from '$lib/components/SanctuaryLink.svelte';
  import CardFace from '$lib/components/CardFace.svelte';
  import { cards } from '$lib/game/cards';
  import GameSession from '$lib/components/play/GameSession.svelte';

  let services = $state<Awaited<ReturnType<typeof connectFirebase>>>();
  let status = $state('connecting');
  let unavailable = $state<'full' | 'missing' | 'started' | ''>('');
  let name = $state('');
  let nameError = $state('');
  let playerCount = $state<2 | 3 | 4>(2);
  let roomId = $state('');
  let reservedSeats = $state(0);
  let creationAttempt: CreationAttempt | undefined;
  let joinCode = $state('');
  let codeError = $state('');
  let capacityError = $state('');
  let capacityChoice = $state<2 | 3 | 4>(2);
  let setup = $state<SetupState | null>(null);
  let busy = $state(false);
  let playError = $state('');
  let draftSeed = '';
  let pendingCommand: { id: string; command: GameCommand } | undefined;
  let copied = $state(false);
  let manualInvitation = $state(false);
  let invitation = $state('');
  let reducedMotion = $state(false);
  let modal = $state<'invite' | 'details' | 'join' | ''>('');
  let dialog = $state<HTMLDialogElement>();
  let invitationInput = $state<HTMLInputElement>();
  let opener: HTMLElement | null = null;
  let stop: (() => void) | undefined;
  let alive = true;
  const latest = $derived(setup?.activity.at(-1));
  const count = $derived(setup?.playerCount ?? playerCount);
  $effect(() => { if (!busy) capacityChoice = count; });
  const openSeats = $derived(count - (setup?.players.length ?? 0));
  const title = $derived(unavailable === 'full' ? 'This table is full.' : unavailable === 'started' ? 'This game has already begun.' : unavailable ? 'This invitation was not found.' : 'Gather at the Table');
  const starting = ['obol', 'hamlet'].map(id => cards.find(card => card.id === id)!);
  function arrival(node: Element) { return reducedMotion ? { duration: 0 } : fly(node, { y: 20, duration: 450 }); }
  function fail(cause: unknown) {
    if (!alive) return;
    if (cause instanceof SetupError && (cause.code === 'full' || cause.code === 'missing' || cause.code === 'started')) {
      unavailable = cause.code; status = 'synced';
    } else if (cause instanceof SetupError && cause.code === 'name') {
      nameError = cause.message; status = 'synced';
    } else status = 'disconnected';
  }
  function subscribe() {
    stop?.();
    stop = watchSetup(services!.db, roomId, (next, synced) => {
      if (!alive || !next.players.length) return;
      setup = next;
      status = synced && navigator.onLine ? 'synced' : 'disconnected';
      if (synced && next.players.some(player => player.uid === services!.uid)) rememberTable(roomId, services!.uid);
    }, fail);
  }
  async function connect() {
    status = 'connecting';
    try {
      const connected = await connectFirebase();
      if (!alive) return;
      services = connected;
      if (roomId) {
        const room = await inspectRoom(connected.db, roomId);
        if (!alive) return;
        playerCount = room.playerCount;
        reservedSeats = room.members.length;
        if (room.members.includes(connected.uid)) { subscribe(); return; }
        if (room.phase && room.phase !== 'gathering') throw new SetupError('started', 'This game has already begun.');
        if (room.members.length >= room.playerCount) throw new SetupError('full', 'This table is full.');
      }
      status = 'synced';
    } catch (cause) { fail(cause); }
  }
  async function enter() {
    nameError = '';
    if (!name.trim()) { nameError = 'Choose a name.'; await tick(); document.getElementById('player-name')?.focus(); return; }
    if (busy || status !== 'synced' || !services) return;
    busy = true; status = 'joining';
    const creating = !roomId;
    try {
      const id = creating ? await createRoom(services.db, services.uid, name, playerCount, creationAttempt ??= { token: crypto.randomUUID() }) : roomId;
      if (!creating) await enterRoom(services.db, id, services.uid, name);
      if (!alive) return;
      roomId = id;
      localStorage.setItem('pantheon:name', name.trim());
      history.replaceState(null, '', `${base}/play/?room=${encodeURIComponent(roomId)}`);
      subscribe();
    } catch (cause) { fail(cause); }
    finally { if (alive) busy = false; }
  }
  async function sendCommand(command: GameCommand) {
    if (!services || !setup || busy || status !== 'synced') return;
    busy = true; playError = '';
    if (!pendingCommand || JSON.stringify(pendingCommand.command) !== JSON.stringify(command)) pendingCommand = { id: `${crypto.randomUUID()}:${setup.activity.length + 1}`, command };
    try { await appendGameCommand(services.db, roomId, services.uid, pendingCommand.id, pendingCommand.command); pendingCommand = undefined; }
    catch (cause) { playError = cause instanceof SetupError ? cause.message : 'We couldn’t save your choice. Try again.'; }
    finally { busy = false; }
  }
  function begin() { void sendCommand({ type: 'draft/started', seed: draftSeed ||= crypto.randomUUID() }); }
  async function showModal(kind: 'invite' | 'details' | 'join') {
    opener = document.activeElement as HTMLElement;
    copied = false; manualInvitation = false; codeError = ''; capacityError = '';
    invitation = new URL(`${base}/play/?room=${encodeURIComponent(roomId)}`, location.origin).href;
    modal = kind;
    await tick(); dialog!.showModal();
  }
  function closeModal() { dialog!.close(); modal = ''; opener?.focus(); }
  async function copyInvitation() {
    try { await navigator.clipboard.writeText(invitation); copied = true; }
    catch { manualInvitation = true; await tick(); invitationInput?.focus(); invitationInput?.select(); }
  }
  async function findTable() {
    const code = joinCode.trim().toUpperCase();
    if (!/^[A-Z]{4,5}$/.test(code)) { codeError = 'Enter a four- or five-letter game code.'; await tick(); document.getElementById('game-code')?.focus(); return; }
    closeModal();
    await goto(`${base}/play/?room=${code}`);
  }
  async function changeCapacity(value: 2 | 3 | 4) {
    if (busy || !services || !setup) return;
    busy = true; capacityError = '';
    try { await resizeRoom(services.db, roomId, services.uid, value); }
    catch (cause) { capacityError = cause instanceof SetupError ? cause.message : 'We couldn’t change the seats. Try again.'; }
    finally { busy = false; }
  }
  afterNavigate(({ from, to }) => {
    if (from && to && from.url.pathname === to.url.pathname && from.url.search !== to.url.search) {
      stop?.(); setup = null; unavailable = ''; pendingCommand = undefined; draftSeed = ''; playError = ''; nameError = ''; creationAttempt = undefined; joinCode = ''; codeError = ''; capacityError = ''; playerCount = 2; reservedSeats = 0;
      roomId = to.url.searchParams.get('room') ?? '';
      void connect();
    }
  });
  onMount(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => { reducedMotion = motion.matches; };
    const offline = () => { if (!unavailable) status = 'disconnected'; };
    const online = () => { if (!unavailable && !busy) void connect(); };
    updateMotion(); motion.addEventListener('change', updateMotion);
    window.addEventListener('offline', offline); window.addEventListener('online', online);
    roomId = new URL(location.href).searchParams.get('room') ?? '';
    name = localStorage.getItem('pantheon:name') ?? '';
    void connect();
    return () => { alive = false; stop?.(); motion.removeEventListener('change', updateMotion); window.removeEventListener('offline', offline); window.removeEventListener('online', online); };
  });
</script>

<svelte:head><title>Gather at the Table — Pantheon: Bloodlines</title><link rel="preload" as="image" href={`${base}/assets/ui/sanctuary-button-secondary.webp`} /></svelte:head>
{#if setup && setup.phase !== 'gathering' && services}
  <GameSession game={setup} uid={services.uid} {roomId} {status} {busy} error={playError} command={sendCommand} retry={connect} />
{:else}
<main class="gathering" class:unavailable data-status={status}>
  <picture class="environment" aria-hidden="true">
    <source media="(max-aspect-ratio:3/4)" srcset={`${base}/assets/ui/${unavailable ? 'unavailable' : 'gather'}-mobile.webp`} />
    <img src={`${base}/assets/ui/${unavailable ? 'unavailable' : 'gather'}-desktop.webp`} alt="" fetchpriority="high" draggable="false" />
  </picture>
  <div class="composition" data-e2e-layout={modal ? undefined : true}>
    <header>
      <a class="back" href={`${base}/`} aria-label="Back to sanctuary">‹ <span>Sanctuary</span></a>
      {#if !unavailable}<button class="details" onclick={() => showModal('details')}>Table details</button>{/if}
    </header>
    {#if unavailable}
      <section class="unavailable-message">
        <h1>{title}</h1><div class="flourish" aria-hidden="true">❧</div>
        <p>{unavailable === 'full' ? 'Every seat has been taken.' : unavailable === 'started' ? 'The players have chosen their seats.' : 'Ask your friend for a new invitation.'}</p>
        <div class="recovery-links"><SanctuaryLink href={`${base}/play/`} label="Find another table" primary /><SanctuaryLink href={`${base}/`} label="Back" /></div>
      </section>
    {:else}
      <form onsubmit={event => { event.preventDefault(); void enter(); }} novalidate>
        <section class="seats" aria-label="Players at the table" class:four={count > 2}>
          {#if setup}
            {#each setup.players as player, index (player.uid)}
              <div class="seat-position" data-testid="seat-arrival" in:arrival><GatheringSeat name={player.name} {index} own={player.uid === services?.uid} host={index === 0} /></div>
            {/each}
            {#each Array(openSeats) as _, index}<div class="seat-position"><GatheringSeat index={setup.players.length + index} /></div>{/each}
          {:else}
            {#each Array(count) as _, index}
              <div class="seat-position">
                {#if index === reservedSeats}<GatheringSeat {index} entering bind:value={name} disabled={status !== 'synced'} invalid={!!nameError} />
                {:else if index < reservedSeats}<GatheringSeat {index} name="Seat taken" host={index === 0} />
                {:else}<GatheringSeat {index} />{/if}
              </div>
            {/each}
          {/if}
        </section>
        <div class="heading">
          <h1>{title}</h1>
          <p>{count} players · {setup ? openSeats ? `${openSeats} ${openSeats === 1 ? 'seat' : 'seats'} open` : 'Everyone is here' : roomId ? 'Your seat awaits' : 'Choose your gathering'}</p>
          {#if /^[A-Z]{4,5}$/.test(roomId)}<p class="room-code">Game code <strong data-testid="room-code">{roomId}</strong></p>{/if}
          {#if nameError}<p id="name-error" role="alert">{nameError}</p>{/if}
        </div>
        {#if !setup && !roomId}
          <fieldset class="seat-count" style:--seat-skin={`url("${base}/assets/ui/gather-seat.webp")`}><legend>Players</legend>
            {#each [2,3,4] as number}<label class:selected={playerCount === number}><input type="radio" name="players" value={number} bind:group={playerCount} aria-label={`${number} players`} disabled={busy} /><span aria-hidden="true">{number}</span></label>{/each}
          </fieldset>
        {/if}
        {#if !setup && !roomId}<div class="join-choice"><GameButton onclick={() => showModal('join')} disabled={busy || status !== 'synced'}>Join a game</GameButton></div>{/if}
        {#if !setup}<div class="enter" class:invited={!!roomId}><GameButton type="submit" primary disabled={busy || status !== 'synced'}>{busy ? 'Taking your seat…' : roomId ? 'Join table' : 'Create table'}</GameButton></div>{/if}
      </form>
      {#if playError}<p class="play-error" role="alert">{playError}</p>{/if}
      {#if setup}
        {#if setup.players[0]?.uid === services?.uid && !openSeats}<div class="begin"><GameButton primary onclick={begin} disabled={busy || status !== 'synced'}>{busy ? 'Drawing first player…' : 'Begin'}</GameButton></div>{/if}
        <button class="invitation-seal" onclick={() => showModal('invite')}><img src={`${base}/assets/ui/gather-invite.webp`} alt="" aria-hidden="true" /><span>Invite friends</span></button>
        <div class="activity" aria-live="polite" aria-atomic="true">{#key latest?.sequence}<p data-testid="latest-activity" in:arrival>{latest?.message}</p>{/key}</div>
      {/if}
      {#if status !== 'synced'}
        <div class="connection" role="status">
          <p>{status === 'disconnected' ? setup ? 'Connection lost. Your place is kept.' : 'We couldn’t reach the table.' : status === 'joining' ? 'Taking your seat…' : 'Opening the table…'}</p>
          {#if status === 'disconnected'}<GameButton onclick={connect}>Try again</GameButton>{/if}
        </div>
      {/if}
    {/if}
  </div>
</main>
<dialog bind:this={dialog} oncancel={event => { event.preventDefault(); closeModal(); }} data-e2e-layout={modal ? true : undefined} aria-labelledby="dialog-title">
  <button class="close" aria-label="Close" onclick={closeModal}>×</button>
  {#if modal === 'join'}
    <h2 id="dialog-title">Join a game</h2>
    <p>Enter the code shared by your host.</p>
    <form class="join-form" onsubmit={event => { event.preventDefault(); void findTable(); }} novalidate>
      <label for="game-code">Game code</label>
      <input id="game-code" bind:value={joinCode} maxlength="5" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-invalid={!!codeError} aria-describedby={codeError ? 'code-error' : undefined} />
      {#if codeError}<p id="code-error" role="alert">{codeError}</p>{/if}
      <GameButton type="submit" primary>Find table</GameButton>
    </form>
  {:else if modal === 'invite'}
    <h2 id="dialog-title">Invite friends</h2><img class="dialog-seal" src={`${base}/assets/ui/gather-invite.webp`} alt="" />
    {#if /^[A-Z]{4,5}$/.test(roomId)}<p class="room-code">Game code <strong>{roomId}</strong></p>{/if}
    <p>Share your invitation. A seat awaits.</p>
    <GameButton primary onclick={copyInvitation}>{copied ? 'Invitation copied' : 'Copy invitation'}</GameButton>
    <p role="status">{copied ? 'Send it to the players you want at your table.' : manualInvitation ? 'Select and copy your invitation below.' : ''}</p>
    {#if manualInvitation}<label class="manual">Your invitation<input bind:this={invitationInput} readonly value={invitation} onclick={() => invitationInput?.select()} /></label>{/if}
  {:else if modal === 'details'}
    <h2 id="dialog-title">Supply for {count} players</h2>
    {#if setup && setup.players[0]?.uid === services?.uid}
      <fieldset class="capacity"><legend>Players at your table</legend>
        {#each [2,3,4] as number}<label><input type="radio" name="capacity" aria-label={`${number} players`} value={number} bind:group={capacityChoice} disabled={busy || status !== 'synced' || number < setup.players.length} onchange={() => changeCapacity(number as 2 | 3 | 4)} /><span>{number}</span></label>{/each}
      </fieldset>
      <p class="capacity-hint">Occupied seats stay at the table.</p>
      {#if capacityError}<p role="alert">{capacityError}</p>{/if}
    {/if}
    <dl class="supply"><div><dt>Each Territory</dt><dd>{count * 3}</dd></div><div><dt>Each regular Action</dt><dd>{count * 4}</dd></div><div><dt>Obol / Drachma / Talent</dt><dd>40 / 30 / 20</dd></div></dl>
    <p>{setupSupply(count).length} piles · Starting cards are extra.</p>
    <h3>Each starting deck</h3><div class="starting-cards">{#each starting as card}<figure><CardFace {card} players={count} /><figcaption>{card.id === 'obol' ? '6 Obols' : '3 Hamlets'}</figcaption></figure>{/each}</div>
    <p>1 matching Temple · Ten cards each.<br />Your Temple follows your leader’s god.</p>
    <a href={`${base}/rules/`}>Read the rules</a>
  {/if}
</dialog>

{/if}

<style>
  .begin{position:absolute;right:5%;bottom:3%;width:25%;}.play-error{position:absolute;top:73%;left:24%;width:52%;text-align:center;background:#401d1ded;padding:10px;border:1px solid #cb9872;}
  .room-code strong{display:inline-block;margin-left:.4em;letter-spacing:.15em;color:#ffe5a6;font-weight:700;user-select:all;} .heading .room-code{margin-top:.3em;font-size:clamp(16px,2svh,38px);}
  .join-form{display:grid;gap:16px;} .join-form input{width:100%;height:64px;border:1px solid #bd995e;border-radius:8px;background:#061321;color:#ffe5a6;text-align:center;font:600 34px 'Cormorant Garamond',serif;letter-spacing:.18em;text-transform:uppercase;}
  .capacity{display:flex;justify-content:center;gap:16px;border:0;padding:0;margin:0;}.capacity label{position:relative;width:54px;height:44px;display:grid;place-items:center;}.capacity input{appearance:none;position:absolute;inset:0;margin:0;border:1px solid #b8995c;border-radius:8px;background:#07111c;}.capacity input:checked{background:#594326;border-color:#ffe5a6;}.capacity input:disabled{opacity:.35;cursor:not-allowed;}.capacity span{z-index:1;pointer-events:none;font-size:22px;}.capacity-hint{margin:8px 0;}
  .gathering { position:relative; height:100svh; min-height:360px; overflow:clip; isolation:isolate; background:#061321; }
  .environment{position:absolute;inset:0;z-index:-1;} .environment img{width:100%;height:100%;object-fit:cover;}
  .composition {height:100%;position:relative;--control-height:clamp(54px,7svh,140px);--control-font:clamp(24px,3.4svh,64px);}
  header{position:absolute;top:2%;left:3%;right:3%;display:flex;justify-content:space-between;align-items:center;z-index:3;}
  .back,.details{min-height:44px;display:flex;align-items:center;padding:8px 14px;border:1px solid #b8995c80;border-radius:24px;background:#091724c9;color:#efd8a8;font-size:clamp(14px,1.6svh,30px);text-decoration:none;gap:10px;}
  .seats{position:absolute;left:20%;top:17%;width:60%;height:43%;display:grid;grid-template-columns:repeat(2,1fr);grid-auto-rows:min-content;justify-items:center;align-content:space-between;column-gap:12%;}
  .seat-position{width:min(22vw,27svh);will-change:transform;}
  .seats.four{top:10%;height:51%;}.four .seat-position{width:min(19vw,24svh);}
  .heading{position:absolute;top:63%;left:23%;width:54%;text-align:center;text-shadow:0 2px 5px #000;}
  h1{font:600 clamp(32px,4.4svh,88px)/1.05 'Cormorant Garamond',serif;color:#f5e1ac;margin:0 0 .2em;}
  .heading p{margin:0;font:500 clamp(18px,2.4svh,48px)/1.2 'Cormorant Garamond',serif;}
  .heading [role='alert']{font-family:inherit;font-size:clamp(14px,1.8svh,32px);color:#ffd0af;margin-top:8px;}
  .seat-count{position:absolute;left:35%;width:30%;top:76%;display:flex;justify-content:center;gap:6%;padding:0;border:0;margin:0;}
  legend{text-align:center;font:500 clamp(16px,1.8svh,34px)/1.1 'Cormorant Garamond',serif;margin-bottom:6px;}
  .seat-count label{position:relative;isolation:isolate;width:28%;height:clamp(48px,7svh,140px);display:grid;place-items:center;background:var(--seat-skin) center/100% 100% no-repeat;}
  .seat-count input{position:absolute;inset:0;margin:0;width:100%;height:100%;appearance:none;border:0;border-radius:50%;cursor:pointer;}
  .seat-count span{pointer-events:none;font:600 clamp(24px,3.8svh,74px)/1 'Cormorant Garamond',serif;color:#edd7a8;}
  .seat-count .selected{filter:drop-shadow(0 0 8px #ffd27f);}.seat-count input:focus-visible{outline:3px solid #fff0b8;outline-offset:2px;}
  .join-choice{position:absolute;left:5%;bottom:5%;width:27%;}
  .enter{position:absolute;right:5%;bottom:5%;width:27%;}
  .invitation-seal{position:absolute;left:5%;bottom:3%;width:clamp(120px,15vw,420px);aspect-ratio:1.1;border:0;padding:0;background:none;isolation:isolate;}
  .invitation-seal img{position:absolute;inset:0;width:100%;height:100%;z-index:-1;}
  .invitation-seal span{position:absolute;top:67%;left:8%;width:84%;font:700 clamp(20px,2.6svh,52px)/1 'Cormorant Garamond',serif;color:#342615;transform:rotate(-7deg);}
  .activity{position:absolute;left:29%;bottom:9%;width:48%;text-align:center;font:500 clamp(18px,2.4svh,44px)/1.3 'Cormorant Garamond',serif;text-shadow:0 2px 4px #000;}.activity p{margin:0;overflow-wrap:anywhere;}
  .connection{position:absolute;left:34%;width:32%;top:48%;text-align:center;background:#0a1524f0;border:1px solid #b99a61;border-radius:20px;padding:16px;z-index:4;font-size:clamp(14px,1.7svh,32px);--control-height:44px;--control-font:24px;}.connection p{margin:0 0 8px;}
  .unavailable-message{position:absolute;top:43%;left:53%;width:42%;text-align:center;}.unavailable-message p{font:500 clamp(20px,3svh,56px)/1.3 'Cormorant Garamond',serif;}.flourish{color:#e4bd70;font-size:clamp(24px,4svh,70px);line-height:1;}.recovery-links{display:grid;gap:16px;width:85%;margin:auto;--menu-button-height:clamp(54px,7svh,140px);--menu-label-size:clamp(24px,3.3svh,62px);}
  dialog{width:min(520px,92vw);max-height:94svh;padding:32px;border:2px solid #b58b48;border-radius:20px;background:linear-gradient(#132431f5,#07111cfb);color:#f2dfb9;text-align:center;box-shadow:0 20px 80px #000b;--control-height:56px;--control-font:26px;}
  dialog::backdrop{background:#020811bb;backdrop-filter:blur(6px);}dialog h2{font:600 32px/1 'Cormorant Garamond',serif;margin:12px 20px 24px;}dialog h3{font:600 24px/1 'Cormorant Garamond',serif;margin:18px 0 10px;}dialog p{font-size:15px;line-height:1.4;}dialog .close{position:absolute;right:8px;top:8px;width:44px;height:44px;border:0;background:none;font-size:28px;}
  .dialog-seal{width:140px;}.manual{display:grid;gap:8px;text-align:left;font-size:14px;}.manual input{width:100%;min-height:44px;padding:8px;border:1px solid #b58b48;background:#f5e3be;color:#292419;}.supply{margin:0;}.supply div{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #b58b4866;padding:8px 0;}.supply dd{margin:0;white-space:nowrap;color:#efcc85;}.starting-cards{display:flex;justify-content:center;gap:20px;}.starting-cards figure{width:100px;margin:0;}figcaption{font-size:14px;margin-top:6px;}dialog a{display:inline-flex;align-items:center;min-height:44px;}
  @media(max-aspect-ratio:3/4){
    header{top:1%;left:3%;right:3%;}.back,.details{padding:6px 12px;font-size:13px;}
    .heading{top:9%;left:4%;width:92%;}h1{font-size:clamp(27px,7.6vw,52px);}.heading p{font-size:clamp(17px,4.7vw,30px);}
    .seats,.seats.four{left:5%;width:90%;top:29%;height:42%;column-gap:8%;}.seat-position,.four .seat-position{width:min(40vw,22svh);}
    .seat-count{top:75%;left:23%;width:54%;gap:4%;}.seat-count label{width:30%;height:52px;}.seat-count span{font-size:26px;}legend{font-size:16px;}
    .join-choice{left:5%;width:42%;bottom:4%;--control-height:54px;--control-font:24px;}
    .enter{right:5%;width:44%;bottom:4%;--control-height:54px;--control-font:24px;}
    .begin{right:5%;bottom:3%;width:44%;--control-height:50px;--control-font:26px;} .composition:has(.begin) .activity{bottom:14%;font-size:17px;}
    .enter.invited{right:8%;width:84%;--control-font:28px;}
    .invitation-seal{left:5%;bottom:3%;width:34%;}.invitation-seal span{font-size:21px;}.activity{left:42%;bottom:9%;width:52%;font-size:20px;}
    .connection{top:61%;left:12%;width:76%;font-size:14px;}
    .unavailable-message{left:5%;width:90%;top:43%;}.unavailable-message h1{font-size:34px;}.unavailable-message p{font-size:23px;}.recovery-links{width:88%;--menu-button-height:56px;--menu-label-size:26px;}
    dialog{padding:22px 18px;}dialog h2{font-size:28px;}dialog p{font-size:14px;}.supply{font-size:14px;}.starting-cards figure{width:85px;}
  }
  @media(max-height:500px) and (min-aspect-ratio:3/4){
    .seats,.seats.four{left:16%;top:18%;width:68%;height:38%;grid-template-columns:repeat(4,1fr);gap:2%;}.seat-position,.four .seat-position{width:min(15vw,35svh);}
    .heading{top:60%;}h1{font-size:26px;}.heading p{font-size:17px;}.seat-count{top:auto;bottom:3%;left:36%;width:28%;}legend{display:none;}.seat-count label{height:44px;}.enter{width:25%;right:3%;bottom:4%;--control-height:44px;--control-font:22px;}
    .activity{bottom:4%;font-size:16px;}.invitation-seal{width:110px;bottom:1%;}.invitation-seal span{font-size:18px;}.connection{top:56%;}.unavailable-message{top:22%;}.unavailable-message h1{font-size:28px;}.unavailable-message p{font-size:18px;margin:8px;}.flourish{font-size:24px;}.recovery-links{--menu-button-height:44px;--menu-label-size:22px;gap:8px;}
  }
</style>
