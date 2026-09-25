<script lang="ts">
  import { base } from '$app/paths';
  import { resourceNames, type Resource } from '$lib/game/presentation';
  let { resource, value, label }: { resource: Resource; value?: string | number; label?: string } = $props();
  const description = $derived(label ?? `${value ?? ''} ${resourceNames[resource]}`.trim());
</script>

<span class="resource-icon" data-resource={resource} data-value={value} role="img" aria-label={description} title={description}>
  <img class="component-image" src={`${base}/assets/icons/${resource}.webp`} alt="" draggable="false" />
  {#if value !== undefined}<b class="resource-number">{value}</b>{/if}
</span>

<style>
  .resource-icon { position: relative; display: inline-block; width: var(--icon-size, 2em); height: var(--icon-size, 2em); vertical-align: middle; flex-shrink: 0; line-height: 1; }
  img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; z-index: 3; }
  b { position: absolute; z-index: 4; inset: 0; display: grid; place-items: center; padding-top: 5%; color: #fff9e6; font: 700 calc(var(--icon-size, 2em) * 0.38)/1 'Atkinson Hyperlegible', sans-serif; text-shadow: 0 1px 2px #000, 1px 0 1px #000, -1px 0 1px #000; }
  [data-resource='buys'] b { padding-top: 36%; }
</style>
