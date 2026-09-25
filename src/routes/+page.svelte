<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { doc, getDocFromServer } from 'firebase/firestore';
  import { connectFirebase } from '$lib/backend/firebase';
  import { forgetTable, readReturnTable } from '$lib/navigation/return-table';
  import SanctuaryLink from '$lib/components/SanctuaryLink.svelte';
  import CardFace from '$lib/components/CardFace.svelte';
  import CardBack from '$lib/components/CardBack.svelte';
  import { cards } from '$lib/game/cards';

  let status = $state('checking');
  let room = $state('');
  let unreachable = $state(false);
  let alive = true;
  const displayCards = ['thaleia', 'temple-of-athena', 'acropolis'].map(id => cards.find(card => card.id === id)!);
  async function findTable() {
    status = 'checking'; unreachable = false; room = '';
    const remembered = readReturnTable();
    if (!remembered) { status = 'ready'; return; }
    try {
      const { db, uid } = await connectFirebase();
      if (!alive) return;
      if (uid !== remembered.uid) { forgetTable(); status = 'ready'; return; }
      const snapshot = await getDocFromServer(doc(db, 'games', remembered.roomId));
      if (!alive) return;
      if (snapshot.exists() && snapshot.data().members?.includes(uid)) room = remembered.roomId;
      else forgetTable();
    } catch { if (alive) unreachable = true; }
    if (alive) status = 'ready';
  }
  onMount(() => { void findTable(); return () => { alive = false; }; });
</script>

<svelte:head>
  <title>Pantheon: Bloodlines</title>
  <meta name="description" content="Choose your bloodline. Build your empire. A game of cards and divine favor for two to four players." />
</svelte:head>

<main class="sanctuary" data-status={status}>
  <picture class="environment" aria-hidden="true">
    <source media="(max-aspect-ratio: 3/4)" srcset={`${base}/assets/ui/sanctuary-mobile.webp`} />
    <img src={`${base}/assets/ui/sanctuary-desktop.webp`} alt="" fetchpriority="high" draggable="false" />
  </picture>
  <div class="arrival">
    <div class="composition" data-e2e-layout>
      <h1><span class="sr-only">Pantheon: Bloodlines</span><img src={`${base}/assets/ui/sanctuary-wordmark.webp`} alt="" aria-hidden="true" draggable="false" /></h1>
      <nav class="menu" aria-label="Enter the sanctuary">
        <SanctuaryLink href={`${base}/play/`} label="Play" primary />
        {#if room}<SanctuaryLink href={`${base}/play/?room=${encodeURIComponent(room)}`} label="Continue" />{/if}
        <SanctuaryLink href={`${base}/rules/`} label="Learn" />
      </nav>
      {#if unreachable}
        <div class="return-status" role="status"><p>We couldn’t reach your table.</p><button onclick={findTable}>Try again</button></div>
      {:else}<p class="sr-only" role="status">{status === 'checking' ? 'Finding your table…' : 'The sanctuary awaits.'}</p>{/if}
      <div class="table-cards" aria-label="Cards of Pantheon">
        {#each displayCards as card}
          <div class={`display-card ${card.id}`}><CardFace {card} /></div>
        {/each}
        <div class="display-back"><CardBack format="deck" /></div>
      </div>
    </div>
  </div>
</main>

<style>
  .sanctuary { position:relative; width:100%; height:100svh; min-height:320px; isolation:isolate; overflow:clip; background:#071628; }
  .environment { position:absolute; inset:0; z-index:-1; }
  .environment img { width:100%; height:100%; object-fit:cover; object-position:center; }
  .arrival { height:100%; animation:arrive 450ms ease-out both; }
  .composition { position:relative; width:100%; height:100%; --menu-button-height:clamp(54px,7.7svh,160px); --menu-label-size:clamp(28px,4.2svh,90px); }
  h1 { position:absolute; margin:0; left:24%; top:5%; width:55%; height:25%; }
  h1 img { display:block; width:100%; height:100%; object-fit:contain; }
  .menu { position:absolute; top:32%; left:36%; width:31%; display:grid; gap:clamp(6px,1svh,24px); }
  .table-cards { position:absolute; left:9%; bottom:5%; width:82%; height:31%; }
  /* Keep angled cards on stable compositing layers through image/font loading. */
  .display-card,.display-back { position:absolute; bottom:0; will-change:transform; }
  .thaleia { width:27%; left:0; transform:rotate(-9deg); }
  .temple-of-athena { width:17%; left:31%; transform:rotate(5deg); }
  .acropolis { width:18%; left:56%; transform:rotate(10deg); }
  .display-back { width:16%; right:4%; transform:rotate(13deg); }
  .return-status { position:absolute; top:57%; left:32%; width:39%; text-align:center; font-size:clamp(14px,1.7svh,32px); }
  .return-status p { margin:0 0 6px; text-shadow:0 2px 5px #000; }
  .return-status button { min-height:44px; padding:6px 24px; border:1px solid #d6b879; border-radius:20px; background:#101923ed; }
  @keyframes arrive { from { opacity:0; transform:scale(1.025); } to { opacity:1; transform:scale(1); } }
  @media(max-aspect-ratio:3/4) {
    .composition { --menu-button-height:clamp(48px,6.9svh,90px); --menu-label-size:clamp(26px,3.6svh,48px); }
    h1 { left:4%; top:7%; width:92%; height:17%; }
    .menu { top:39%; left:16%; width:68%; gap:1.3svh; }
    .table-cards { left:4%; bottom:7%; width:92%; height:22%; }
    .thaleia { left:0; bottom:0; width:37%; transform:rotate(-9deg); }
    .temple-of-athena { left:29%; width:26%; bottom:3%; transform:rotate(0); }
    .acropolis { left:60%; width:27%; bottom:0; transform:rotate(8deg); }
    .display-back { right:4%; width:22%; bottom:-2%; transform:rotate(15deg); z-index:-1; }
    .return-status { top:64%; left:8%; width:84%; font-size:14px; }
  }
  @media(max-height:500px) and (min-aspect-ratio:3/4) {
    .composition { --menu-button-height:44px; --menu-label-size:26px; }
    h1 { top:1%; height:27%; }
    .menu { top:30%; width:28%; left:38%; gap:5px; }
    .table-cards { left:4%; width:92%; bottom:7%; }
    .thaleia { width:23%; }.temple-of-athena { left:27%; width:12%; }.acropolis { left:71%; width:12%; }.display-back{width:11%;}
  }
  @media(prefers-reduced-motion:reduce) { .arrival { animation:none; } }
</style>
