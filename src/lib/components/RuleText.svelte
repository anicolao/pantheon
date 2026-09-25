<script lang="ts">
  import ResourceIcon from './ResourceIcon.svelte';
  import { ruleParts } from '$lib/game/presentation';
  let { text }: { text: string } = $props();
  const parts = $derived(ruleParts(text));
  const compact = $derived(parts.filter(part => part.kind === 'text').map(part => part.text).join('').length < 50);
  const bonusCount = $derived(parts.filter(part => part.kind === 'icon').length);
  const bonusesOnly = $derived(parts.every(part => part.kind === 'icon' || part.kind === 'arrow' || (part.kind === 'text' && /^[;.\s]*$/.test(part.text))));
</script>

<span class="rule-text" class:compact class:bonuses-only={bonusesOnly} class:many-bonuses={bonusesOnly && bonusCount > 2}>
  <span class="sr-only">{text}</span>
  <span class="visual-rule" aria-hidden="true">
    {#each parts as part}
      {#if part.kind === 'icon'}<ResourceIcon resource={part.resource} value={part.value} />{:else if part.kind === 'arrow'}<span class="effect-arrow" title="Only if the condition on the left is fulfilled">→</span>{:else if !bonusesOnly}{part.text}{/if}
    {/each}
  </span>
</span>

<style>
  .bonuses-only .visual-rule { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 2cqi; --icon-size: var(--bonus-icon-size, 14cqi); }
  .many-bonuses .visual-rule { flex-wrap: nowrap; gap: 1cqi; --icon-size: 8.75cqi; }
  .compact:not(.bonuses-only) .visual-rule { --icon-size: var(--compact-icon-size, 1.6em); }
  .effect-arrow { font: 700 1.5em/1 'STIX Two Math', 'Cambria Math', 'Times New Roman', serif; vertical-align: middle; padding-inline: .12em; }
  .visual-rule { --icon-size: var(--inline-icon-size, 1.9em); }
</style>
