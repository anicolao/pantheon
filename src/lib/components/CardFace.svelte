<script lang="ts">
  import { auditCardFit } from '$lib/layout/card-fit';
  import { base } from '$app/paths';
  import { godSymbols, type CardDefinition } from '$lib/game/types';
  import { cardFormat, cardSerial, copyCount, type PlayerCount } from '$lib/game/presentation';
  import ResourceIcon from './ResourceIcon.svelte';
  import RuleText from './RuleText.svelte';

  let { card, players = 2, copy = 1 }: { card: CardDefinition; players?: PlayerCount; copy?: number } = $props();
  const format = $derived(cardFormat(card));
  const total = $derived(copyCount(card, players));
  const serial = $derived(cardSerial(card, copy));
</script>

<article use:auditCardFit class="card" data-card-id={card.id} data-format={format} data-god={card.god} data-type={card.type} data-serial={serial} aria-label={`${card.name}, ${card.god} ${card.type}, copy ${copy} of ${total}`}>
  <!-- Layer 0: illustration. Layer 1: separate colored substrates behind tag windows. -->
  <img class="illustration" data-layer="illustration" src={`${base}/assets/cards/${card.art}.webp`} alt={card.artDescription} draggable="false" />
  <div class="tag-substrate god-substrate" aria-hidden="true"></div>
  <div class="tag-substrate type-substrate" aria-hidden="true"></div>
  <!-- Layer 2: opaque sculpted chassis, with genuine alpha windows. -->
  <img class="frame" data-layer="frame" src={`${base}/assets/frames/frame-${format}.webp`} alt="" aria-hidden="true" draggable="false" />
  <!-- Layers 3–4: component art, then live values and metadata. -->
  <header class="card-title" data-fit="title"><h3>{card.name}</h3></header>
  {#if card.cost !== null}
    <div class="cost" data-fit="cost"><ResourceIcon resource="coins" value={card.cost} label={`${card.cost} Coins${card.type === 'Event' ? ' and 1 Worship to worship' : card.uniqueStartingCard ? '; starting card, not for sale' : ' to buy'}`} /></div>
  {/if}
  <div class="tag-label god-label" data-fit="god"><span aria-hidden="true">{godSymbols[card.god]}</span> {card.god}</div>
  <div class="tag-label type-label" data-fit="type">{card.type}</div>
  <div class="rules" class:long={Math.max(card.effect.length, card.favored?.length ?? 0) > 120} data-fit="rules">
    {#if card.type === 'Event'}
      <div><h4>Standard</h4><RuleText text={card.effect} /></div>
      <div class="favored"><h4>Favored · 2+ Devotion</h4><RuleText text={card.favored!} /></div>
    {:else if card.type === 'Leader'}
      <div><h4>Bloodline · once per turn</h4><RuleText text={card.effect} /></div>
    {:else if card.type === 'Territory'}
      <div class="victory-value"><ResourceIcon resource="victory" value={card.vp} /></div>
    {:else}
      <RuleText text={card.effect} />
    {/if}
  </div>
  <footer data-fit="footer">
    {#if card.uniqueStartingCard}<span class="starting-only">Starting card</span>{/if}
    <span class="serial">{serial}</span>
    {#if card.type === 'Event'}<span class="worship-cost"><ResourceIcon resource="worship" value="1" /> <span>Worship</span></span>{/if}
    <span class="copy-count" aria-label={`Copy ${copy} of ${total}; includes starting decks`}>{copy}/{total}</span>
  </footer>
</article>

<style>
  .card { --god: #73552d; --type: #704c33; position: relative; container-type: inline-size; isolation: isolate; width: 100%; aspect-ratio: 5 / 7; color: #302a20; text-align: left; filter: drop-shadow(0 6px 10px #0006); }
  [data-god='Athena'] { --god: #424c72; } [data-god='Poseidon'] { --god: #225a65; } [data-god='Demeter'] { --god: #52672e; } [data-god='Ares'] { --god: #893e35; }
  [data-type='Treasure'] { --type: #725819; } [data-type='Territory'] { --type: #2e5c48; } [data-type='Event'] { --type: #574169; } [data-type='Leader'] { --type: #6d3048; }
  .illustration { position: absolute; z-index: 0; left: 8%; top: 15%; width: 84%; height: 39%; object-fit: cover; object-position: center 15%; }
  .tag-substrate { position: absolute; z-index: 1; top: 53%; height: 9%; }
  .god-substrate { left: 9%; width: 40%; background: var(--god); }
  .type-substrate { left: 51%; width: 41%; background: var(--type); }
  .frame { position: absolute; z-index: 2; inset: 0; width: 100%; height: 100%; pointer-events: none; }
  .card-title { position: absolute; z-index: 4; top: 7%; left: 12%; width: 53%; height: 6.6%; display: flex; align-items: center; }
  h3 { margin: 0; width: 100%; font: 700 5.4cqi/0.96 'Cormorant Garamond', serif; text-wrap: balance; }
  .cost { position: absolute; z-index: 3; top: 6.2%; right: 11%; --icon-size: 10.8cqi; --icon-number-scale: 0.76; }
  .tag-label { position: absolute; z-index: 4; top: 57.65%; height: 5.1%; transform: translateY(-50%); display: flex; align-items: center; justify-content: center; gap: 1cqi; font-size: 3.25cqi; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #fff2d5; }
  .god-label { left: 11%; width: 36%; } .type-label { left: 54%; width: 34%; }
  .god-label > span { font-size: 1.5em; line-height: 1; }
  .rules { position: absolute; z-index: 4; left: 12%; top: 64%; width: 76%; height: 25%; display: flex; flex-direction: column; justify-content: center; gap: 2cqi; font-size: 3.8cqi; line-height: 1.23; }
  .rules.long { font-size: 3.35cqi; --inline-icon-size: 1.3em; }
  h4 { margin: 0 0 0.8cqi; color: var(--god); font: 700 2.3cqi/1.15 'Atkinson Hyperlegible', sans-serif; text-transform: uppercase; letter-spacing: 0.04em; }
  .victory-value { text-align: center; --icon-size: 16cqi; }
  .favored { border-top: 1px solid #a68d5d88; padding-top: 1.5cqi; }
  footer { position: absolute; z-index: 4; left: 15%; top: 91%; width: 70%; height: 3.6%; display: flex; align-items: center; justify-content: space-between; gap: 1cqi; font-size: 2.5cqi; color: #f5e6c3; letter-spacing: 0.03em; }
  .copy-count { font-weight: 700; }
  .worship-cost { display: inline-flex; align-items: center; gap: 0.5cqi; --icon-size: 1.6cqi; }
  [data-format='event'] { aspect-ratio: 7 / 5; }
  [data-format='leader'] { aspect-ratio: 8 / 5; }
  [data-format='event'] .illustration, [data-format='leader'] .illustration { left: 8%; top: 23%; width: 40%; height: 56%; object-position: 23% center; }
  [data-format='leader'] .illustration { top: 18%; height: 60%; }
  [data-format='event'] .card-title { top: 13%; left: 11%; width: 71%; height: 7%; }
  [data-format='leader'] .card-title { top: 8%; left: 19%; width: 62%; height: 7%; }
  [data-format='event'] h3 { font-size: 3.8cqi; }
  [data-format='leader'] h3 { font-size: 3.5cqi; }
  [data-format='event'] .cost { top: 15.2%; left: 91.4%; right: auto; display: flex; transform: translate(-50%, -50%); --icon-size: 5.2cqi; --icon-number-scale: 1.34; }
  [data-format='event'] .tag-substrate { top: 80%; height: 11%; }
  [data-format='leader'] .tag-substrate { top: 80%; height: 10%; }
  [data-format='event'] .god-substrate { left: 8.25%; width: 18.5%; }
  [data-format='leader'] .god-substrate { left: 10.5%; width: 17%; }
  [data-format='event'] .type-substrate { left: 28%; width: 18.5%; }
  [data-format='leader'] .type-substrate { left: 29%; width: 17%; }
  [data-format='event'] .tag-label, [data-format='leader'] .tag-label { height: 5%; font-size: 2.3cqi; }
  [data-format='event'] .tag-label { top: 85.47%; }
  [data-format='leader'] .tag-label { top: 85.02%; }
  [data-format='event'] .god-label { left: 10%; width: 15%; }
  [data-format='leader'] .god-label { left: 12%; width: 14%; }
  [data-format='event'] .type-label, [data-format='leader'] .type-label { left: 31%; width: 14%; }
  [data-format='event'] .rules { --bonus-icon-size: 5cqi; --compact-icon-size: 1.2em; left: 51%; top: 24%; width: 39%; height: 57%; font-size: 2.4cqi; gap: 1.2cqi; --inline-icon-size: 1.25em; }
  [data-format='leader'] .rules { left: 51%; top: 23%; width: 39%; height: 54%; font-size: 2.65cqi; gap: 2cqi; }
  [data-format='event'] .god-label, [data-format='leader'] .god-label { font-size: 2.05cqi; }
  [data-format='event'] .god-label > span, [data-format='leader'] .god-label > span { font-size: 1.15em; }
  [data-format='event'] .rules.long { font-size: 2.25cqi; --inline-icon-size: 1.1em; }
  [data-format='event'] h4, [data-format='leader'] h4 { font-size: 1.85cqi; }
  [data-format='event'] footer, [data-format='leader'] footer { left: 51%; top: 85%; width: 39%; height: 5%; font-size: 1.8cqi; }
  @media print { .card { filter: none; print-color-adjust: exact; } }
</style>
