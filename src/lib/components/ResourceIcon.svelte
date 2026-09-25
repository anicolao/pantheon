<script lang="ts">
  import { base } from '$app/paths';
  import { iconNames, type IconKind } from '$lib/game/presentation';
  let { resource, value, label }: { resource: IconKind; value?: string | number; label?: string } = $props();
  const description = $derived(label ?? (
    resource === 'trash' && value !== undefined ? `Trash up to ${value} cards from your hand` :
    resource === 'gain' && value === 'Σ' ? 'Gain a card costing up to the total cost of cards trashed by this effect, to your discard pile unless topdeck is shown' :
    resource === 'gain' && String(value).startsWith('+') ? `Gain a card costing up to ${String(value).slice(1)} more than the trashed card, to your discard pile unless topdeck is shown` :
    resource === 'gain' && value !== undefined ? `Gain a card costing up to ${value}, to your discard pile unless topdeck is shown` :
    `${value ?? ''} ${iconNames[resource]}`.trim()
  ));
  const hasPlus = $derived(String(value ?? '').startsWith('+'));
</script>

<span class="resource-icon" data-resource={resource} data-value={value} role="img" aria-label={description} title={description}>
  <img class="component-image" src={resource === 'cards' ? `${base}/assets/backs/back-deck.webp` : `${base}/assets/icons/${resource === 'discard' ? 'discard-v2' : resource}.webp`} alt="" draggable="false" />
  {#if value !== undefined}<b class="resource-number">{#if hasPlus}<span class="math-plus">+</span>{String(value).slice(1)}{:else}{value}{/if}</b>{/if}
</span>

<style>
  .resource-icon { --scaled-icon-size: calc(var(--icon-size, 2em) * 2); position: relative; display: inline-block; width: var(--scaled-icon-size); height: var(--scaled-icon-size); vertical-align: middle; flex-shrink: 0; line-height: 1; }
  img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; z-index: 3; }
  [data-resource='cards'] img { left: calc(100% / 7); width: calc(100% * 5 / 7); object-fit: fill; border-radius: 3%; }
  b { position: absolute; z-index: 4; left: 50%; top: 52.5%; transform: translate(-50%, -50%); color: #fff9e6; font: 700 calc(var(--icon-size, 2em) * var(--icon-number-scale, 0.57))/1 'Atkinson Hyperlegible', sans-serif; white-space: nowrap; text-shadow: 0 1px 2px #000, 1px 0 1px #000, -1px 0 1px #000; }
  [data-resource='trash'] b { left: 48%; top: 45%; }
  [data-resource='discard'] b { left: 48%; top: 45%; }
  [data-resource='topdeck'] b { left: 53%; top: 57%; }
  [data-resource='gain'] b { left: 55%; top: 42%; }
  [data-resource='worship'] b { top: 68%; }
  [data-resource='buys'] b { top: 68%; }
  .math-plus { position: relative; top: -0.08em; font-family: 'STIX Two Math', 'Cambria Math', 'Times New Roman', serif; }
  [data-resource='victory'] b { top: 44%; }
  [data-resource='coins'] b { top: 50%; }
  [data-resource='coins'][data-value^='+'] b { left: 47%; }
  [data-resource='actions'] b { left: 52%; top: 48%; }
  @media print {
    /* Blurred text shadows become PDF masks that macOS can render as black boxes.
       A vector outline keeps the numbers legible without those transparency masks. */
    b { text-shadow: none; -webkit-text-stroke: 0.035em #000; paint-order: stroke fill; }
  }
</style>
