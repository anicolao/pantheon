<script lang="ts">
  import { base } from '$app/paths';
  import { onMount, tick } from 'svelte';
  import CardFace from './CardFace.svelte';
  import CardBack from './CardBack.svelte';
  import ResourceIcon from './ResourceIcon.svelte';
  import { cardFormat, copyCount, resourceNames, type PlayerCount, type Resource } from '$lib/game/presentation';
  import { cards } from '$lib/game/cards';
  import { cardTypes, gods, godSymbols, type CardDefinition, type CardType, type God } from '$lib/game/types';

  let ready = $state(false);
  onMount(() => { ready = true; });
  let kind = $state<CardType | 'All'>('All');
  let god = $state<God | 'All'>('All');
  let query = $state('');
  let tabletop = $state(false);
  let showBacks = $state(false);
  let players = $state<PlayerCount>(2);
  let selectedCopy = $state(1);
  let inspectBack = $state(false);
  let selected = $state<CardDefinition | null>(null);
  let inspector: HTMLDialogElement;
  const order: CardType[] = ['Leader', 'Action', 'Treasure', 'Territory', 'Event'];
  const ordered = [...cards].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
  const visible = $derived(ordered.filter(card =>
    (kind === 'All' || card.type === kind) && (god === 'All' || card.god === god) &&
    `${card.name} ${card.god} ${card.effect} ${card.favored ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())
  ));

  async function inspect(card: CardDefinition) {
    selected = card;
    selectedCopy = 1;
    inspectBack = showBacks;
    await tick();
    inspector.showModal();
  }

  function reset() { kind = 'All'; god = 'All'; query = ''; }
</script>

<svelte:head>
  <title>Card gallery — Pantheon: Bloodlines</title>
  <meta name="description" content="Explore the leaders, divine blessings, and empire-building cards of Pantheon: Bloodlines. The complete illustrated v0.1 card gallery." />
</svelte:head>

<div class="shell" class:tabletop>
  <a class="skip-link" href="#collection">Skip to card collection</a>
  <header class="site-header">
    <a href={`${base}/`} class="brand" aria-label="Pantheon: Bloodlines home"><span class="brand-mark" aria-hidden="true">Π</span><span>PANTHEON<small>B L O O D L I N E S</small></span></a>
    <nav aria-label="Main navigation"><a class="active" href={`${base}/gallery/`} aria-current="page">Card gallery</a><a href="https://github.com/anicolao/pantheon/blob/main/MVP_CARDSET.md">Rules ↗</a></nav>
    <span class="edition">FIRST EDITION <b>v0.1</b></span>
  </header>

  <main>
    <section class="hero" aria-labelledby="hero-title">
      <img class="hero-art" src={`${base}/assets/cards/acropolis.webp`} alt="" width="960" height="640" />
      <div class="hero-copy"><p class="eyebrow">A mythic world. An empire of your making.</p><h1 id="hero-title">An empire begins<br />with a <em>single card.</em></h1><p class="intro">Choose your bloodline. Court the gods.<br />Discover the cards that will shape your empire.</p><a class="explore" href="#collection">Explore the collection <span aria-hidden="true">↓</span></a></div>
      <div class="hero-caption"><span>ACROPOLIS</span><span>Hestia · Territory · 6 VP</span></div>
    </section>

    <section class="collection" id="collection" aria-labelledby="collection-title">
      <div class="collection-heading"><div><p class="eyebrow">THE FOUNDING COLLECTION</p><h2 id="collection-title">Card gallery <span>26</span></h2></div><p>Four bloodlines. Five affiliations.<br />Every path to power starts here.</p></div>
      <div class="type-tabs" role="group" aria-label="Filter by card type">
        {#each ['All', ...cardTypes] as type}
          <button disabled={!ready} class:chosen={kind === type} aria-pressed={kind === type} onclick={() => kind = type as CardType | 'All'}>{type === 'All' ? 'All cards' : type === 'Territory' ? 'Territories' : `${type}s`} <span>{type === 'All' ? cards.length : cards.filter(c => c.type === type).length}</span></button>
        {/each}
      </div>
      <div class="toolbar">
        <label class="search"><span>Search cards</span><input disabled={!ready} type="search" bind:value={query} placeholder="Search the collection…" /></label>
        <label class="god-filter"><span>God affiliation</span><select disabled={!ready} bind:value={god}><option value="All">All gods</option>{#each gods as deity}<option value={deity}>{deity}</option>{/each}</select></label>
        <label class="player-filter"><span>Players</span><select aria-label="Players" disabled={!ready} bind:value={players}><option value={2}>2 players</option><option value={3}>3 players</option><option value={4}>4 players</option></select></label>
        <label class="view-toggle"><input disabled={!ready} type="checkbox" bind:checked={tabletop} /><span>Tabletop view</span></label>
        <label class="view-toggle"><input disabled={!ready} type="checkbox" bind:checked={showBacks} /><span>Show backs</span></label>
        <button disabled={!ready} class="print" onclick={() => window.print()}>Print cards ↗</button>
      </div>
      <div class="collection-meta"><p aria-live="polite" role="status">{visible.length} of {cards.length} cards <span>· {tabletop ? 'Large faces for a shared display' : 'Select a card to inspect'}</span></p><span class="prototype">GALLERY PROTOTYPE · NO ACTIVE GAME</span></div>

      <div class="resource-legend" aria-label="Resource icon legend">{#each Object.entries(resourceNames) as [resource, label]}<span><ResourceIcon resource={resource as Resource} /><span>{label}</span></span>{/each}</div>
      <p class="copy-note">Faces show copy 1 of each card. Totals include starting decks for {players} players. Inspect a card to select another copy. Deck · 63 × 88 mm / Event · 88 × 63 mm / Leader · 120 × 75 mm.</p>
      <div class="card-grid" data-testid="card-grid">
        {#each visible as card (card.id)}
          <div class="card-item" data-format={cardFormat(card)}>
            <div class="card-wrap">{#if showBacks}<CardBack format={cardFormat(card)} />{:else}<CardFace {card} {players} />{/if}<button disabled={!ready} class="inspect-card" onclick={() => inspect(card)} aria-label={`Inspect ${card.name}`}></button></div>
            <div class="card-caption"><span><b aria-hidden="true">{godSymbols[card.god]}</b> {card.god} <span class="separator">/</span> {card.type}</span><span aria-hidden="true">↗</span></div>
          </div>
        {:else}
          <div class="empty"><h3>No cards found</h3><p>Try another name, rule, or affiliation.</p><button onclick={reset}>Reset filters</button></div>
        {/each}
      </div>
      <aside class="devotion-note"><span aria-hidden="true">◈</span><div><h3>Blood calls to blood.</h3><p>Each matching Action in play gives 1 Devotion. Your leader adds 1 for their own god. Reach 2 to receive a Favored blessing.</p></div><a href="https://github.com/anicolao/pantheon/blob/main/MVP_CARDSET.md#10-gods-devotion-and-invocations">Read the invocation rules ↗</a></aside>
    </section>
  </main>
  <footer class="site-footer"><span>PANTHEON: BLOODLINES</span><p>A race for land. A legacy among gods.</p><a href="https://github.com/anicolao/pantheon">Open source · GPLv3 ↗</a></footer>
</div>

<dialog bind:this={inspector} data-format={selected ? cardFormat(selected) : 'deck'} aria-label={selected ? `${selected.name} details` : 'Card details'}>
  <button class="close" onclick={() => inspector.close()}>Close <span aria-hidden="true">×</span></button>
  {#if selected}
    <div class="inspector-controls"><label>Copy<select aria-label="Copy" bind:value={selectedCopy}>{#each Array.from({ length: copyCount(selected, players) }, (_, i) => i + 1) as n}<option value={n}>{n}/{copyCount(selected, players)}</option>{/each}</select></label><button onclick={() => inspectBack = !inspectBack}>{inspectBack ? 'Show front' : 'Show back'}</button></div>
    {#if inspectBack}<CardBack format={cardFormat(selected)} />{:else}<CardFace card={selected} {players} copy={selectedCopy} />{/if}
    <div class="accessible-rules"><h3>{selected.name}</h3><p>{selected.effect}</p>{#if selected.favored}<p><strong>Favored:</strong> {selected.favored}</p>{/if}</div>
  {/if}
  <p class="dialog-hint">Press Escape or Close to return to the collection.</p>
</dialog>

<style>
  .shell { max-width: 1920px; margin: auto; background: radial-gradient(ellipse at 30% 50%, #26312c44, transparent 65%); }
  .skip-link { position: fixed; left: 1rem; top: -5rem; z-index: 5; padding: 1rem; background: #151b1b; }
  .skip-link:focus { top: 1rem; }
  .site-header { display: flex; align-items: center; justify-content: space-between; gap: 2rem; padding: 1.6rem 5%; border-bottom: 1px solid #8d805633; }
  .brand { display: flex; align-items: center; gap: 0.7rem; text-decoration: none; font: 600 1.5rem/1 'Cormorant Garamond', serif; letter-spacing: 0.1em; }
  .brand-mark { font-size: 2.4rem; color: #d6ba7f; border: 1px solid #95815b; padding: 0.1rem 0.35rem; }
  .brand small { display: block; font: 400 0.5rem/1.5 'Atkinson Hyperlegible', sans-serif; letter-spacing: 0.2em; margin-top: 0.3rem; color: #d6ba7f; }
  nav { display: flex; gap: 2rem; font-size: 0.85rem; }
  nav a { text-decoration: none; padding: 0.5rem 0; color: #b5b7ae; }
  nav .active { color: #f0e4c7; border-bottom: 1px solid #d6ba7f; }
  .edition { font-size: 0.6rem; letter-spacing: 0.14em; color: #a8ac9e; }
  .edition b { margin-left: 0.5rem; border: 1px solid #64654d; padding: 0.35rem 0.5rem; color: #d6ba7f; }
  .hero { position: relative; min-height: 420px; display: flex; align-items: center; isolation: isolate; overflow: hidden; border-bottom: 1px solid #8d805644; }
  .hero-art { position: absolute; right: 0; top: 0; height: 100%; width: 70%; object-fit: cover; object-position: center 45%; z-index: -2; opacity: 0.78; }
  .hero::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, #151b1b 15%, #151b1bef 32%, #151b1b33 75%), linear-gradient(0deg, #151b1b88, transparent 30%); z-index: -1; }
  .hero-copy { padding: 3.5rem 5% 3.8rem; }
  .eyebrow { font-size: 0.64rem; letter-spacing: 0.18em; font-weight: 700; color: #d6ba7f; text-transform: uppercase; margin: 0 0 1.3rem; }
  h1 { margin: 0; font: 500 clamp(3rem, 5.3vw, 6rem)/0.94 'Cormorant Garamond', serif; letter-spacing: -0.035em; }
  h1 em { font-weight: 500; color: #d9bf88; }
  .intro { color: #c0c3b7; font-size: 0.98rem; line-height: 1.6; margin: 1.5rem 0; }
  .explore { display: inline-flex; gap: 2.5rem; text-decoration: none; padding-bottom: 0.65rem; border-bottom: 1px solid #bba16b; color: #ecd6a7; font-size: 0.8rem; }
  .hero-caption { position: absolute; bottom: 2rem; right: 5%; display: grid; gap: 0.4rem; text-align: right; font-size: 0.64rem; letter-spacing: 0.08em; text-shadow: 0 1px 5px #000; }
  .hero-caption span:first-child { color: #e1c794; font-size: 0.72rem; }
  .collection { padding: 3.2rem 5% 0; scroll-margin-top: 1rem; }
  .collection-heading { display: flex; justify-content: space-between; align-items: end; gap: 1rem; margin-bottom: 2rem; }
  .collection-heading .eyebrow { margin-bottom: 0.6rem; }
  h2 { margin: 0; font: 500 2.8rem/1 'Cormorant Garamond', serif; }
  h2 span { display: inline-block; vertical-align: middle; margin-left: 0.7rem; border: 1px solid #736646; border-radius: 50%; padding: 0.4rem; font: 400 0.7rem/1 'Atkinson Hyperlegible', sans-serif; color: #cfb377; }
  .collection-heading > p { color: #a7afa6; margin: 0; line-height: 1.5; font-size: 0.85rem; }
  .type-tabs { display: flex; gap: 0.6rem 2rem; border-bottom: 1px solid #ffffff1a; flex-wrap: wrap; }
  .type-tabs button { border: 0; border-bottom: 2px solid transparent; background: none; color: #b2b8ad; padding: 0.9rem 0; font-size: 0.88rem; }
  .type-tabs button.chosen { color: #e8d3a2; border-bottom-color: #d6ba7f; }
  .type-tabs button span { margin-left: 0.4rem; opacity: 0.65; font-size: 0.7rem; }
  .toolbar { display: flex; flex-wrap: wrap; align-items: end; gap: 1rem; margin-top: 1.5rem; }
  .toolbar label > span:first-child { display: block; margin-bottom: 0.4rem; font-size: 0.68rem; color: #b3b9ad; letter-spacing: 0.04em; }
  .search { flex: 1; max-width: 24rem; }
  input[type='search'], select { width: 100%; min-height: 44px; color: #e8e7dd; border: 1px solid #ffffff29; background: #1b2322; border-radius: 3px; padding: 0.7rem 0.9rem; font-size: 0.85rem; }
  input::placeholder { color: #a4aea2; }
  .god-filter { width: 10rem; }
  .view-toggle { display: flex; align-items: center; min-height: 44px; gap: 0.5rem; white-space: nowrap; font-size: 0.8rem; }
  .view-toggle input { width: 1.1rem; height: 1.1rem; accent-color: #d6ba7f; }
  .print { min-height: 44px; background: none; border: 1px solid #ffffff29; padding: 0.7rem 0.9rem; border-radius: 3px; font-size: 0.8rem; }
  .collection-meta { display: flex; justify-content: space-between; gap: 1rem; align-items: center; margin: 1.1rem 0 1.6rem; color: #b1b9ac; font-size: 0.73rem; }
  .collection-meta p { margin: 0; }
  .collection-meta p span { color: #909d91; }
  .prototype { font-size: 0.57rem; letter-spacing: 0.1em; color: #c0ad86; }
  .card-grid { display: flex; flex-wrap: wrap; gap: 2.1rem 1.8rem; align-items: start; justify-content: center; }
  .card-item { width: min(100%, 300px); min-width: 0; }
  .card-item[data-format='event'] { width: min(100%, 420px); }
  .card-item[data-format='leader'] { width: min(100%, 572px); }
  .resource-legend { display: flex; flex-wrap: wrap; gap: 0.8rem 1.5rem; padding: 0.7rem 0; border-top: 1px solid #ffffff18; }
  .resource-legend > span { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; color: #d6c79e; --icon-size: 32px; }
  .copy-note { color: #a6b1a3; font-size: 0.72rem; line-height: 1.5; margin-bottom: 2rem; }
  .card-wrap { position: relative; transition: transform 160ms ease; }
  .card-wrap:hover { transform: translateY(-4px); }
  .inspect-card { position: absolute; inset: 0; width: 100%; border: 0; border-radius: 10px; background: transparent; }
  .inspect-card:focus-visible { outline-offset: 6px; }
  .card-caption { display: flex; justify-content: space-between; margin-top: 0.8rem; padding: 0 0.2rem; color: #c5c7b9; font-size: 0.67rem; }
  .card-caption b { color: #d6ba7f; font-weight: 400; margin-right: 0.25rem; }
  .separator { margin: 0 0.4rem; color: #6f7d71; }
  .empty { grid-column: 1 / -1; padding: 4rem 1rem; text-align: center; }
  .empty h3 { font: 500 2rem 'Cormorant Garamond', serif; margin: 0; }
  .empty button { background: #d6ba7f; color: #151b1b; padding: 0.7rem 1rem; border: 0; border-radius: 3px; }
  .devotion-note { display: flex; align-items: center; gap: 1.5rem; margin: 4rem 0; padding: 1.8rem 0; border-block: 1px solid #82754d66; }
  .devotion-note > span { font-size: 2rem; color: #d6ba7f; }
  .devotion-note h3 { font: 500 1.7rem 'Cormorant Garamond', serif; margin: 0 0 0.3rem; }
  .devotion-note p { color: #a8b3a7; font-size: 0.85rem; line-height: 1.5; margin: 0; max-width: 39rem; }
  .devotion-note a { font-size: 0.75rem; color: #dbc48e; margin-left: auto; flex-shrink: 0; }
  .site-footer { display: flex; align-items: center; gap: 1rem; justify-content: space-between; padding: 1.8rem 5%; border-top: 1px solid #ffffff1a; color: #adb6a8; font-size: 0.7rem; }
  .site-footer > span { font-family: 'Cormorant Garamond', serif; font-size: 1rem; letter-spacing: 0.06em; color: #d6ba7f; }
  .site-footer p { margin: 0; }
  .site-footer a { text-decoration: none; }
  .tabletop .hero { display: none; }
  .tabletop .card-item { width: min(100%, 420px); }
  .tabletop .card-item[data-format='event'] { width: min(100%, 588px); }
  .tabletop .card-item[data-format='leader'] { width: min(100%, 800px); }
  dialog { width: min(94vw, 510px); max-height: 95dvh; border: 1px solid #b49964; border-radius: 8px; background: #151b1b; padding: 1rem; color: #ece4d3; }
  dialog::backdrop { background: #050908dc; backdrop-filter: blur(5px); }
  dialog[data-format='event'] { width: min(96vw, 760px); }
  dialog[data-format='leader'] { width: min(96vw, 960px); }
  .inspector-controls { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; font-size: 0.8rem; }
  .inspector-controls label { display: flex; align-items: center; gap: 0.5rem; }
  .inspector-controls select { width: auto; }
  .inspector-controls button { padding: 0.7rem; background: #29342c; border: 1px solid #8f805d; border-radius: 3px; }
  .accessible-rules { margin-top: 1rem; border-top: 1px solid #8f805d; padding-top: 1rem; font-size: 1rem; line-height: 1.5; }
  .accessible-rules h3 { font: 600 1.6rem 'Cormorant Garamond', serif; margin: 0; }
  .accessible-rules p { margin-bottom: 0; }
  .close { display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 0.8rem; border: 0; background: none; padding: 0.35rem 0; font-size: 0.8rem; }
  .close span { font-size: 1.5rem; }
  .dialog-hint { font-size: 0.65rem; text-align: center; margin: 1rem 0 0; color: #b8c0b3; }
  @media (min-width: 1800px) { .tabletop { max-width: none; } }
  @media (max-width: 760px) {
    .site-header { gap: 1rem; padding-block: 1.2rem; } .edition { display: none; } nav { gap: 1rem; font-size: 0.75rem; }
    .brand { font-size: 1.2rem; gap: 0.45rem; } .brand-mark { font-size: 1.8rem; } .brand small { font-size: 0.4rem; }
    .hero { min-height: 400px; } .hero-art { width: 100%; opacity: 0.45; } .hero::after { background: linear-gradient(90deg, #151b1be6, #151b1b66), linear-gradient(0deg, #151b1b, transparent); }
    .hero-copy { padding-block: 3rem; } .hero .eyebrow { max-width: 15rem; line-height: 1.7; } .hero-caption { display: none; }
    .collection { padding-top: 2rem; } .collection-heading > p { display: none; } .type-tabs { gap: 0.2rem 1.15rem; } .type-tabs button { font-size: 0.8rem; }
    .toolbar { flex-wrap: wrap; gap: 0.8rem; } .search { flex-basis: 55%; max-width: none; } .god-filter { flex: 1; min-width: 100px; }
    .view-toggle { margin-left: 0; flex: 1; } .collection-meta { flex-wrap: wrap; gap: 0.6rem; } .prototype { font-size: 0.53rem; }
    .card-grid { gap: 2rem; } .devotion-note { flex-wrap: wrap; gap: 0.8rem; } .devotion-note > span { display: none; } .devotion-note a { margin-left: 0; }
    .site-footer { flex-wrap: wrap; gap: 0.75rem; } .site-footer p { display: none; }
  }
  @media print {
    .site-header, .hero, .type-tabs, .toolbar, .collection-meta, .collection-heading, .devotion-note, .site-footer, .card-caption, .skip-link, dialog, .resource-legend, .copy-note { display: none !important; }
    .shell, main, .collection { margin: 0; padding: 0; background: white; }
    .card-grid, .tabletop .card-grid { display: flex; width: 196mm; gap: 3mm; justify-content: start; }
    .card-item, .tabletop .card-item { width: 63mm; max-width: none; flex-shrink: 0; break-inside: avoid; }
    .card-item[data-format='event'], .tabletop .card-item[data-format='event'] { width: 88.2mm; }
    .card-item[data-format='leader'], .tabletop .card-item[data-format='leader'] { width: 120mm; }
    .card-wrap { transform: none !important; } .inspect-card { display: none; }
    @page { size: A4; margin: 7mm; }
  }
</style>
