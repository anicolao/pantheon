<script lang="ts">
  import PrintIcon from './PrintIcon.svelte';
  import type { IconKind } from '$lib/game/presentation';
  let { text }: { text: string } = $props();
  // Substitute only resource names and operation verbs. Keep every qualifier,
  // optional choice, limit and destination exactly as written in the rules.
  const resources: Record<string, IconKind> = { card: 'cards', cards: 'cards', buy: 'buys', buys: 'buys', action: 'actions', actions: 'actions', coin: 'coins', coins: 'coins', worship: 'worship', vp: 'victory', trash: 'trash', discard: 'discard', gain: 'gain', topdeck: 'topdeck' };
  const parts = $derived.by(() => {
    const result: ({ text: string } | { resource: IconKind; value?: string })[] = [];
    const expression = /(?<value>\+?\d+) (?<resource>Cards?|Buys?|Actions?|Coins?|Worship|VP)\b|\b(?<verb>trash|discard|gain|topdeck)\b/gi;
    let cursor = 0;
    for (const match of text.matchAll(expression)) {
      if (match.index > cursor) result.push({ text: text.slice(cursor, match.index) });
      result.push({ resource: resources[(match.groups!.resource ?? match.groups!.verb).toLowerCase()], value: match.groups!.value });
      cursor = match.index + match[0].length;
    }
    if (cursor < text.length) result.push({ text: text.slice(cursor) });
    return result;
  });
</script>
<span aria-label={text}>{#each parts as part}{#if 'text' in part}{part.text}{:else}<PrintIcon resource={part.resource} value={part.value} />{/if}{/each}</span>
