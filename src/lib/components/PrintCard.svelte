<script lang="ts">
  import CardFace from './CardFace.svelte';
  import CardBack from './CardBack.svelte';
  import { cardFormat, cardSerial, copyCount, type PlayerCount } from '$lib/game/presentation';
  import type { CardDefinition } from '$lib/game/types';
  import { artworkSize, formats, type PrintStyle } from '$lib/print/layout';

  let { card, copy, players, side, style }: {
    card: CardDefinition; copy: number; players: PlayerCount; side: 'front' | 'back'; style: PrintStyle;
  } = $props();
  const format = $derived(cardFormat(card));
  const art = $derived(artworkSize(format));
</script>

<!-- Centre with physical offsets, not translateY: Chromium paginates the
     untransformed text box and can otherwise split a bottom-row card's footer. -->
<div class="artwork" data-format={format} style:width={`${art.width}mm`} style:height={`${art.height}mm`}
  style:left={`${(formats[format].width - art.width) / 2}mm`}
  style:top={`${(formats[format].height - art.height) / 2}mm`} style:--rotation={`${art.rotation}deg`}>
  {#if style === 'colour'}
    {#if side === 'front'}<CardFace {card} {players} {copy} />{:else}<CardBack {format} />{/if}
  {:else if side === 'back'}
    <div class="simple-back"><strong>PANTHEON</strong><span>BLOODLINES</span><hr /><b>{formats[format].label}</b></div>
  {:else}
    <article class="simple-front" aria-label={`${card.name}, copy ${copy}`}>
      <header><h2>{card.name}</h2>{#if card.cost !== null}<b class="cost">{card.cost} Coins{card.type === 'Event' ? ' + 1 Worship' : ''}</b>{/if}</header>
      <p class="type">{card.god} · {card.type}{card.uniqueStartingCard ? ' · Starting card' : ''}</p>
      <div class="rules">
        {#if card.type === 'Leader'}<h3>Bloodline · once per turn</h3>{/if}
        {#if card.type === 'Event'}<h3>Standard</h3>{/if}
        <p>{card.effect}</p>
        {#if card.favored}<h3>Favored · 2+ Devotion</h3><p>{card.favored}</p>{/if}
      </div>
      <footer><span>{cardSerial(card, copy)}</span><span>{copy}/{copyCount(card, players)}</span></footer>
    </article>
  {/if}
</div>

<style>
  .artwork { position: absolute; transform: rotate(var(--rotation)); transform-origin: center; color: black; break-inside: avoid; }
  .artwork :global(.card), .artwork :global(.card-back) { filter: none; }
  .simple-front, .simple-back { width: 100%; height: 100%; background: white; color: black; padding: 3mm; font: 9pt/1.22 'Atkinson Hyperlegible', sans-serif; }
  .simple-front { display: flex; flex-direction: column; }
  h2 { font: 700 14pt/1.05 'Cormorant Garamond', serif; margin: 0 0 2mm; }
  .cost { font-size: 9pt; }
  .type { border-block: 0.3mm solid black; padding: 1.5mm 0; margin: 2mm 0; font-size: 8pt; }
  .rules { margin-block: auto; }
  .rules p { margin: 1mm 0 2mm; }
  h3 { font-size: 8pt; margin: 1mm 0; }
  footer { display: flex; justify-content: space-between; border-top: 0.2mm solid black; padding-top: 1.5mm; margin-top: 2mm; font-size: 6pt; }
  .simple-back { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2mm; text-align: center; }
  .simple-back strong { font: 700 17pt 'Cormorant Garamond', serif; }
  .simple-back span { font-size: 8pt; letter-spacing: 0.4mm; }
  .simple-back hr { width: 20mm; border: 0; border-top: 0.3mm solid black; }
  .simple-back b { font-size: 9pt; }
  [data-format='event'] .simple-front { font-size: 8pt; }
  [data-format='event'] h2 { font-size: 12pt; margin-bottom: 1mm; }
  [data-format='event'] .type { margin-block: 1mm; padding-block: 1mm; }
  [data-format='event'] footer { margin-top: 1mm; padding-top: 1mm; }
</style>
