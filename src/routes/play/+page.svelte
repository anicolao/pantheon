<script lang="ts">
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';
  import { base } from '$app/paths';
  import { connectFirebase } from '$lib/backend/firebase';
  import { enterRoom, watchSetup } from '$lib/backend/setup-repository';
  import { setupSupply, type SetupState } from '$lib/game/setup';
  let services = $state<Awaited<ReturnType<typeof connectFirebase>>>();
  let status = $state('connecting');
  let error = $state('');
  let name = $state('');
  let playerCount = $state<2 | 3 | 4>(2);
  let roomId = $state('');
  let setup = $state<SetupState | null>(null);
  let busy = $state(false);
  let copied = $state(false);
  let reducedMotion = $state(false);
  function arrival(node: Element, options: { x?: number; y?: number }) {
    return reducedMotion ? { duration: 0 } : fly(node, { ...options, duration: 450 });
  }
  let stop: (() => void) | undefined;
  let alive = true;
  const latest = $derived(setup?.activity.at(-1));
  const supply = $derived(setupSupply(setup?.playerCount ?? playerCount));
  function fail(cause: unknown) { error = cause instanceof Error ? cause.message : 'Could not connect. Please reload and try again.'; status = 'error'; }
  function subscribe() {
    stop?.();
    stop = watchSetup(services!.db, roomId, (next, synced) => { setup = next; status = synced ? 'synced' : 'syncing'; }, fail);
  }
  async function enter(create: boolean) {
    busy = true; error = ''; status = 'syncing';
    const id = create ? crypto.randomUUID() : roomId;
    try {
      await enterRoom(services!.db, id, services!.uid, name, create ? playerCount : undefined);
      if (!alive) return;
      roomId = id;
      localStorage.setItem('pantheon:name', name.trim());
      history.replaceState(null, '', `${base}/play/?room=${encodeURIComponent(roomId)}`);
      subscribe();
    } catch (cause) { fail(cause); }
    finally { busy = false; }
  }
  async function invite() {
    try { await navigator.clipboard.writeText(location.href); copied = true; }
    catch { error = 'Copy the address from your browser to invite another player.'; }
  }
  onMount(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => { reducedMotion = motion.matches; };
    updateMotion(); motion.addEventListener('change', updateMotion);
    roomId = new URL(location.href).searchParams.get('room') ?? '';
    const savedName = localStorage.getItem('pantheon:name') ?? '';
    name = savedName;
    void connectFirebase().then(async connected => {
      if (!alive) return;
      services = connected; status = 'synced';
      if (roomId && savedName) await enter(false);
    }).catch(fail);
    return () => { alive = false; stop?.(); motion.removeEventListener('change', updateMotion); };
  });
</script>

<svelte:head><title>Game setup — Pantheon: Bloodlines</title></svelte:head>
<main class="play-shell" data-e2e-layout data-status={status}>
  <header><a href={`${base}/`}>PANTHEON <span>Bloodlines</span></a><nav aria-label="Main navigation"><a href={`${base}/gallery/`}>Cards</a><a href={`${base}/rules/`}>Rules</a></nav></header>
  <div class="connection" role="status">{status === 'connecting' ? 'Signing in…' : status === 'synced' ? 'Signed in anonymously · Connected' : status === 'syncing' ? 'Connecting to the table…' : 'Connection needs attention'}</div>
  {#if error}<p role="alert">{error}</p>{/if}
  {#if !setup}
    <section class="welcome">
      <p class="eyebrow">YOUR FIRST EMPIRE</p><h1>{roomId ? 'Join the table' : 'Gather your bloodlines'}</h1>
      <p>No account needed. Invite friends and prepare your shared table.</p>
      <form onsubmit={event => { event.preventDefault(); void enter(!roomId); }}>
        <label>Your name<input disabled={status !== 'synced'} bind:value={name} maxlength="24" autocomplete="nickname" required /></label>
        {#if !roomId}<label>Players<select aria-label="Players" bind:value={playerCount}><option value={2}>2 players</option><option value={3}>3 players</option><option value={4}>4 players</option></select></label>{/if}
        <button disabled={busy || status !== 'synced' || !name.trim()}>{roomId ? 'Join table' : 'Create table'}</button>
      </form>
      <p class="scope">First milestone: shared setup. Leader selection and turns are coming next.</p>
    </section>
  {:else}
    <div class="table-heading"><div><p class="eyebrow">SHARED TABLE</p><h1>Prepare your empire</h1></div><button onclick={invite}>{copied ? 'Invitation copied' : 'Copy invitation'}</button></div>
    <section class="seats" aria-label="Players at the table">
      {#each setup.players as player (player.uid)}
        <article class="seat occupied" data-testid="player-seat" transition:arrival={{ y: 18 }}><span class="seat-mark">{setup.players.indexOf(player) + 1}</span><div><h2>{player.name}</h2><p>{player.uid === services!.uid ? 'You' : 'At the table'} · Leader not chosen</p></div></article>
      {/each}
      {#each Array(setup.playerCount - setup.players.length) as _, index}<article class="seat waiting"><span class="seat-mark">{setup.players.length + index + 1}</span><p>Waiting for a player</p></article>{/each}
    </section>
    <div class="activity" aria-live="polite" aria-atomic="true">{#key latest?.sequence}<p data-testid="latest-activity" in:arrival={{ x: 12 }}>{latest?.message}</p>{/key}</div>
    <section class="preparation"><div><h2>Each starting deck</h2><div class="starting-deck">{#each [{ id: 'obol', name: '6 Obols' }, { id: 'hamlet', name: '3 Hamlets' }, { id: 'temple-of-athena', name: '1 matching Temple' }] as card}<figure><img src={`${base}/assets/cards/${card.id}.webp`} alt="" /><figcaption>{card.name}</figcaption></figure>{/each}</div><p class="note">Ten cards each. Your Temple follows your leader’s god.</p></div>
    <div class="supply"><h2>Supply for {setup.playerCount} players</h2><dl><div><dt>Each Territory</dt><dd>{3 * setup.playerCount}</dd></div><div><dt>Each regular Action</dt><dd>{4 * setup.playerCount}</dd></div><div><dt>Obol / Drachma / Talent</dt><dd>40 / 30 / 20</dd></div></dl><p class="note">{supply.length} piles · Starting cards are extra.</p></div></section>
    <p class="scope">{setup.players.length === setup.playerCount ? 'Everyone is here.' : 'Share the invitation to fill the table.'} Leader selection and turns are coming next.</p>
  {/if}
</main>

<style>
  .play-shell { max-width: 1100px; padding: 24px 32px; margin: auto; min-height: 100svh; }
  header { display:flex; justify-content:space-between; align-items:center; gap:20px; padding-bottom:20px; border-bottom:1px solid #887044; }
  header > a { text-decoration:none; letter-spacing:.12em; color:#e6ce9b; } header span { display:block; font-size:12px; letter-spacing:.2em; } nav { display:flex; gap:20px; }
  .connection { font-size:13px; color:#b4c6b1; margin:16px 0 24px; }
  .welcome { max-width:560px; margin:50px auto; } h1,h2 { font-family:'Cormorant Garamond',serif; color:#f0dfbb; } h1 { font-size:42px; line-height:1.05; margin:6px 0 16px; } h2 { font-size:25px; margin:0 0 12px; } p { line-height:1.5; } .eyebrow { font-size:11px; letter-spacing:.15em; color:#c9af7b; margin:0; }
  form { display:grid; gap:18px; margin:30px 0; } label { display:grid; gap:8px; } input,select,button { min-height:44px; padding:10px 14px; border:1px solid #87734e; border-radius:5px; background:#202a28; color:#eee3ce; } button { background:#dbbf83; color:#20231d; } button:disabled { opacity:.45; cursor:default; } .scope,.note { font-size:13px; color:#b7bbae; } .table-heading { display:flex; justify-content:space-between; align-items:center; gap:16px; }
  .seats { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin:12px 0; } .seat { display:flex; align-items:center; gap:14px; padding:16px; border:1px solid #706342; border-radius:8px; background:#202c28; min-width:0; } .seat h2 { font-family:inherit; font-size:18px; overflow-wrap:anywhere; margin:0 0 4px; } .seat p { font-size:12px; margin:0; color:#b9c3b7; } .seat-mark { color:#e0c184; font-size:24px; flex-shrink:0; } .waiting { border-style:dashed; background:transparent; }
  .activity { border-left:3px solid #cbb078; padding:4px 16px; margin:20px 0; } .activity p { margin:0; overflow-wrap:anywhere; }
  .preparation { display:grid; grid-template-columns:1fr 1fr; gap:32px; margin-top:28px; } .starting-deck { display:flex; gap:12px; } figure { margin:0; flex:1; min-width:0; } figure img { width:100%; height:100px; object-fit:cover; border-radius:6px; } figcaption { font-size:12px; margin-top:5px; } dl { margin:0; } dl div { display:flex; justify-content:space-between; gap:12px; border-bottom:1px solid #536044; padding:10px 0; font-size:14px; } dd { margin:0; white-space:nowrap; color:#e5ca92; } [role='alert'] { color:#ffbcad; }
  @media(max-width:600px) { .play-shell { padding:16px 20px; } .connection { margin:12px 0 18px; font-size:12px; } .welcome { margin:36px auto; } h1 { font-size:32px; } .table-heading { align-items:start; } .table-heading button { max-width:110px; font-size:12px; } .seats { gap:8px; } .seat { padding:10px; gap:8px; } .seat h2 { font-size:14px; } .seat p { font-size:10px; } .preparation { grid-template-columns:1fr; gap:12px; margin-top:16px; } h2 { font-size:22px; margin-bottom:8px; } figure img { height:62px; } .activity { margin:12px 0; font-size:14px; } .note { margin:6px 0; font-size:11px; } .scope { font-size:11px; margin:10px 0; } dl div { padding:7px 0; font-size:12px; } }
</style>
