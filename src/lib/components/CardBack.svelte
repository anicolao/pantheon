<script lang="ts">
  import { base } from '$app/paths';
  import type { CardFormat } from '$lib/game/presentation';
  let { format }: { format: CardFormat } = $props();
  const names = { deck: 'Player deck', event: 'God event', leader: 'Bloodline leader' };
</script>

<div class="card-back" data-format={format} role="img" aria-label={`${names[format]} card back`}>
  <img src={`${base}/assets/backs/back-${format}.webp`} alt="" draggable="false" />
</div>

<style>
  .card-back { position: relative; width: 100%; aspect-ratio: 5 / 7; filter: drop-shadow(0 5px 9px #0006); }
  [data-format='event'] { aspect-ratio: 7 / 5; }
  [data-format='leader'] { aspect-ratio: 8 / 5; }
  img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; border-radius: 3%; }
</style>
