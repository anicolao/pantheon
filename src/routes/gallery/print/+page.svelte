<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { base } from '$app/paths';
  import { dev } from '$app/environment';
  import PrintCard from '$lib/components/PrintCard.svelte';
  import { cards } from '$lib/game/cards';
  import type { PlayerCount } from '$lib/game/presentation';
  import { bleed, cropMarks, formats, paperSizes, printSheets, type Paper, type PrintQuantity, type PrintStyle } from '$lib/print/layout';

  let players = $state<PlayerCount>(2);
  let paper = $state<Paper>('a4');
  let style = $state<PrintStyle>('mono');
  let quantity = $state<PrintQuantity>('setup');
  let printSide = $state<'both' | 'front' | 'back'>('both');
  let filteredIds = $state<string[] | null>(null);
  let scope = $state('all');
  let preview = $state(0);
  let viewportWidth = $state(0);
  let ready = $state(false);
  let preparing = $state(false);
  let error = $state('');
  // Local test-printer calibration: backs land 1 mm right when manually duplexed.
  let backX = $state(dev ? -1 : 0);
  let backY = $state(0);
  let sheetsElement: HTMLDivElement;
  const selected = $derived(scope === 'filtered' && filteredIds ? cards.filter(card => filteredIds!.includes(card.id)) : cards);
  const allSheets = $derived(printSheets(selected, players, quantity, paper, { x: backX || 0, y: backY || 0 }));
  const sheets = $derived(allSheets.filter(sheet => printSide === 'both' || sheet.side === printSide));
  const dimensions = $derived(paperSizes[paper]);
  const pageIndex = $derived(Math.min(preview, Math.max(0, sheets.length - 1)));
  const count = $derived(allSheets.filter(sheet => sheet.side === 'front').reduce((sum, sheet) => sum + sheet.cards.length, 0));
  const scale = $derived(Math.min(1, viewportWidth / (dimensions.width * 96 / 25.4)));

  onMount(() => {
    const params = new URLSearchParams(location.search);
    const count = Number(params.get('players'));
    if (count === 2 || count === 3 || count === 4) players = count;
    if (params.has('cards')) { filteredIds = params.get('cards')!.split(','); scope = 'filtered'; }
    ready = true;
  });

  async function print() {
    preparing = true;
    error = '';
    try {
      await tick();
      await document.fonts.ready;
      // Repeated copies share artwork; decode each resource before opening print.
      const images = new Map<string, HTMLImageElement>();
      for (const image of sheetsElement.querySelectorAll('img')) images.set(image.src, image);
      await Promise.all([...images.values()].map(image => image.decode()));
      window.print();
    } catch {
      error = 'Some card artwork could not load. Check your connection and try printing again.';
    } finally {
      preparing = false;
    }
  }
</script>

<svelte:head><title>Print & play — Pantheon: Bloodlines</title></svelte:head>

<main style:--page-width={`${dimensions.width}mm`} style:--page-height={`${dimensions.height}mm`}>
  <header class="controls">
    <a href={`${base}/gallery/`}>← Card gallery</a>
    <h1>Print & play</h1>
    <p class="intro">A tabletop-ready set, with matching fronts and backs.</p>
    <div class="options">
      <label>Artwork<select aria-label="Artwork" bind:value={style} disabled={!ready || preparing}><option value="mono">Black & white · low ink</option><option value="colour">Full colour · game artwork</option></select></label>
      <label>Paper<select aria-label="Paper" bind:value={paper} disabled={!ready || preparing}><option value="a4">A4 · 210 × 297 mm</option><option value="letter">US Letter · 8½ × 11 in</option></select></label>
      <label>Players<select aria-label="Players" bind:value={players} disabled={!ready || preparing}><option value={2}>2 players</option><option value={3}>3 players</option><option value={4}>4 players</option></select></label>
      <label>Copies<select aria-label="Copies" bind:value={quantity} disabled={!ready || preparing}><option value="setup">Complete setup quantities</option><option value="catalog">One of each card</option></select></label>
      {#if filteredIds}<label>Cards<select aria-label="Cards" bind:value={scope} disabled={!ready || preparing}><option value="filtered">Gallery selection ({filteredIds.length} types)</option><option value="all">All cards</option></select></label>{/if}
    </div>
    <div class="side-options">
      <label><input type="checkbox" checked={printSide === 'front'} onchange={event => { printSide = event.currentTarget.checked ? 'front' : 'both'; preview = 0; }} disabled={!ready || preparing} />One-sided — fronts only</label>
      <label><input type="checkbox" checked={printSide === 'back'} onchange={event => { printSide = event.currentTarget.checked ? 'back' : 'both'; preview = 0; }} disabled={!ready || preparing} />One-sided — backs only</label>
    </div>
    <details class="registration">
      <summary>Adjust double-sided alignment</summary>
      <p>Use the same paper size here and in the print dialog, at 100% scale. Print one front/back pair first and compare its crop marks against a light.</p>
      <p>Directions below are as you look at the <b>back</b> of the sheet. If its marks are 2 mm too far right, set horizontal to −2 mm. If they are 1 mm too low, set vertical to −1 mm. These adjustments move only the backs, including their crop marks.</p>
      <div class="options">
        <label>Back horizontal offset (mm)<input aria-label="Back horizontal offset (mm)" type="number" min="-5" max="5" step="0.1" bind:value={backX} disabled={!ready || preparing} /><span>Positive = right · negative = left</span></label>
        <label>Back vertical offset (mm)<input aria-label="Back vertical offset (mm)" type="number" min="-5" max="5" step="0.1" bind:value={backY} disabled={!ready || preparing} /><span>Positive = down · negative = up</span></label>
      </div>
      <button onclick={() => { backX = 0; backY = 0; }} disabled={preparing}>Reset alignment</button>
    </details>
    <p class="sizes">Deck: <b>63 × 88 mm</b>. Events: <b>120 × 86 mm</b>. Leaders: <b>120 × 75 mm</b>. Setup quantities include starting decks and all supply piles; set aside unused leaders, Temples and kingdom piles when setting up a game.</p>
    <div class="instructions">
      <h2>Print at actual size</h2>
      <ol>
        <li>Choose <b>Print / save PDF</b>, then your printer or <b>Save as PDF</b>.</li>
        <li>Use <b>{dimensions.label}, portrait, 100% / actual size</b>. Disable “fit to page”, browser headers and footers; enable background graphics.</li>
        {#if printSide === 'both'}
          <li>Print double-sided, <b>flip on the long edge</b>. Pages alternate fronts and backs. Test pages 1–2 first: hold them to the light to check your printer’s alignment.</li>
        {:else}
          <li>Print <b>one-sided</b> in the print dialog. This job contains {printSide === 'front' ? 'fronts' : 'backs'} only, in sheet-number order. For manual duplex, test one sheet first to establish the correct flip and stack order before printing the matching side.</li>
        {/if}
        <li>Cut along the crop marks and through the centres of the white corner diamonds. Each diamond is 2 mm across; compare fronts and backs against a light before cutting. Shared cuts separate adjacent cards. Black borders and 1 mm outer bleed allow for small cutting errors.</li>
      </ol>
      <p>Printer feed alignment varies. Keep scaling off when printing a saved PDF too. Crop marks need a printable area within 4 mm of the paper edge. Manual duplex: print one front/back page pair first to establish your printer’s feed direction.</p>
    </div>
    <div class="print-actions"><button class="primary" onclick={print} disabled={!ready || preparing || !count}>{preparing ? 'Preparing artwork…' : 'Print / save PDF'}</button><span role="status">{count} cards · {allSheets.length / 2} sheets · {sheets.length} PDF pages</span></div>
    {#if error}<p role="alert">{error}</p>{/if}
    {#if sheets.length}<nav aria-label="Print preview pages"><button disabled={pageIndex === 0} onclick={() => preview = pageIndex - 1}>← Previous</button><span>Page {pageIndex + 1} of {sheets.length} · {sheets[pageIndex]?.side === 'back' ? 'Backs' : 'Fronts'}</span><button disabled={pageIndex >= sheets.length - 1} onclick={() => preview = pageIndex + 1}>Next →</button></nav>{:else}<p>No cards selected. Choose all cards above or return to the gallery.</p>{/if}
  </header>
  <div class="preview" bind:clientWidth={viewportWidth} style:width={`${dimensions.width}mm`} style:height={`${dimensions.height * 96 / 25.4 * scale}px`}>
    <div class="sheets" bind:this={sheetsElement} data-paper={paper} data-style={style} style:--page-width={`${dimensions.width}mm`} style:--page-height={`${dimensions.height}mm`} style:--preview-scale={scale}>
      {#each sheets as sheet, index}
        <section class="print-sheet" class:current={index === pageIndex} data-side={sheet.side} data-sheet={sheet.sheet} data-format={sheet.format} aria-label={`Sheet ${sheet.sheet}, ${sheet.side}s`}>
          {#each sheet.cards as item}
            <div class="print-bleed" aria-hidden="true" style:left={`${item.x - bleed}mm`} style:top={`${item.y - bleed}mm`} style:width={`${formats[sheet.format].width + 2 * bleed}mm`} style:height={`${formats[sheet.format].height + 2 * bleed}mm`}></div>
            <div class="print-card" data-card-id={item.card.id} data-copy={item.copy} style:left={`${item.x}mm`} style:top={`${item.y}mm`} style:width={`${formats[sheet.format].width}mm`} style:height={`${formats[sheet.format].height}mm`}>
              <PrintCard card={item.card} copy={item.copy} {players} {style} side={sheet.side} />
            </div>
          {/each}
          <svg class="crop-marks" viewBox={`0 0 ${dimensions.width} ${dimensions.height}`} aria-label="Crop marks" role="img">
            {#each cropMarks(sheet) as mark}<line {...mark} />{/each}
            {#each sheet.cards as item}
              {@const w = formats[sheet.format].width}
              {@const h = formats[sheet.format].height}
              {#each [[item.x, item.y], [item.x + w, item.y], [item.x, item.y + h], [item.x + w, item.y + h]] as [x, y]}
                <path class="registration-diamond" d={`M ${x} ${y - 1} l 1 1 l -1 1 l -1 -1 Z`} />
              {/each}
            {/each}
          </svg>
          <p class="sheet-label">PANTHEON · {formats[sheet.format].label} · Sheet {sheet.sheet} · {sheet.side === 'front' ? 'FRONTS' : 'BACKS'} · 100% · Long-edge duplex</p>
        </section>
      {/each}
    </div>
  </div>
</main>

<style>
  main { max-width: 1100px; margin: auto; padding: 2rem clamp(1rem, 4vw, 3rem) 4rem; }
  h1 { font: 600 3rem/1 'Cormorant Garamond', serif; margin: 1.4rem 0 0.6rem; color: #e6c983; }
  .intro { margin-top: 0; color: #c5cabc; }
  .options { display: flex; flex-wrap: wrap; gap: 1rem; margin: 1.5rem 0; }
  label { flex: 1 1 180px; font-size: 0.8rem; display: grid; gap: 0.4rem; }
  select, button, input { min-height: 44px; border: 1px solid #8f805d; border-radius: 4px; padding: 0.6rem; background: #202c28; color: #ede9de; }
  input { width: 100%; box-sizing: border-box; }
  .side-options { display: flex; flex-wrap: wrap; gap: 1rem; }
  .side-options label { display: flex; align-items: center; flex: 0 1 auto; gap: 0.5rem; min-height: 44px; }
  .side-options input { width: 1.2rem; height: 1.2rem; min-height: 0; margin: 0; }
  .registration { margin-block: 1rem; font-size: 0.9rem; line-height: 1.5; }
  .registration summary { cursor: pointer; }
  select { width: 100%; }
  button:disabled { opacity: 0.5; cursor: default; }
  .sizes, .instructions { font-size: 0.9rem; line-height: 1.5; }
  .instructions { padding: 1rem 1.2rem; border: 1px solid #8f805d66; border-radius: 6px; }
  h2 { font-size: 1rem; margin: 0; color: #e6c983; }
  ol { margin: 0.5rem 0; padding-left: 1.2rem; }
  li + li { margin-top: 0.5rem; }
  .instructions p { margin-bottom: 0; color: #b7bfb1; font-size: 0.8rem; }
  .print-actions, nav { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; margin: 1.5rem 0; }
  .print-actions span { font-size: 0.9rem; }
  .primary { background: #e6c983; color: #151b1b; font-weight: 700; padding-inline: 1.2rem; }
  nav { justify-content: space-between; font-size: 0.8rem; }
  .preview { max-width: 100%; margin: auto; }
  .sheets { width: var(--page-width); height: var(--page-height); zoom: var(--preview-scale); }
  .print-sheet { display: none; position: relative; width: var(--page-width); height: var(--page-height); background: white; color: black; isolation: isolate; overflow: hidden; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .print-sheet.current { display: block; }
  .print-bleed, .print-card { position: absolute; background: black; }
  .print-bleed { z-index: -1; }
  /* Bound rotated artwork to its physical card. Unbounded transformed image
     overflow makes Chromium silently shrink the whole colour PDF to fit. */
  .print-card { contain: paint; overflow: hidden; }
  .crop-marks { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; fill: none; stroke: black; stroke-width: 0.15; }
  .registration-diamond { fill: white; stroke: none; }
  .sheet-label { position: absolute; bottom: 1.2mm; left: 0; width: 100%; margin: 0; font: 5pt/1 sans-serif; text-align: center; }
  @media print {
    @page a4 { size: A4 portrait; margin: 0; }
    @page letter { size: letter portrait; margin: 0; }
    :global(html), :global(body) { margin: 0 !important; padding: 0 !important; background: white !important; color-scheme: light; }
    main, .preview, .sheets { margin: 0; padding: 0; max-width: none; height: auto !important; width: var(--page-width); zoom: 1; }
    .controls { display: none; }
    [data-paper='a4'] .print-sheet { page: a4; }
    [data-paper='letter'] .print-sheet { page: letter; }
    .print-sheet { display: block; break-after: page; break-inside: avoid; }
    .print-sheet:last-child { break-after: auto; }
  }
</style>
