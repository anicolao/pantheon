<script lang="ts">
  import ResourceIcon from './ResourceIcon.svelte';
  import { ruleParts } from '$lib/game/presentation';
  let { text }: { text: string } = $props();
  const parts = $derived(ruleParts(text));
  const bonusesOnly = $derived(/^(?:\+\d+ (?:Cards?|Buys?|Actions?|Coins?)[;.\s]*)+$/.test(text));
</script>

<span class="rule-text" class:bonuses-only={bonusesOnly}>
  <span class="sr-only">{text}</span>
  <span class="visual-rule" aria-hidden="true">
    {#each parts as part}
      {#if part.kind === 'icon'}<ResourceIcon resource={part.resource} value={part.value} />{:else if !bonusesOnly}{part.text}{/if}
    {/each}
  </span>
</span>

<style>
  .bonuses-only .visual-rule { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 2cqi; --icon-size: 14cqi; }
  .visual-rule { --icon-size: 1.9em; }
</style>
