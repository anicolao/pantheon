<script lang="ts">
  import { base } from '$app/paths';
  let { points }: { points: number } = $props();
</script>

<span class="vp-counter" role="img" aria-label={`${points} victory points`} data-vp-score={points}>
  <img src={`${base}/assets/ui/avatar-vp-wreath.png`} alt="" draggable="false" />
  <span class="value" style:--digits={String(points).length} aria-hidden="true">{points}</span>
</span>

<style>
  .vp-counter{position:relative;display:block;width:100%;aspect-ratio:1;container-type:inline-size;pointer-events:none;}
  img{display:block;width:100%;height:100%;}
  .value{position:absolute;inset:0;display:grid;place-items:center;padding-bottom:4%;color:#fff7d6;font:700 min(45cqi,calc(98cqi / var(--digits)))/1 'Atkinson Hyperlegible',sans-serif;font-variant-numeric:tabular-nums;text-shadow:0 1px 2px #000b;}
</style>
