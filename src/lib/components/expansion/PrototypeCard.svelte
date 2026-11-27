<script lang="ts">
 import CardFace from '../CardFace.svelte';
 import PrototypeRules from './PrototypeRules.svelte';
 import {houses} from '$lib/expansion/cards';
 import type {CardFaceDefinition} from '$lib/game/types';
 let {card}:{card:CardFaceDefinition}=$props();
 const house=$derived(houses.find(h=>h.god===card.god));
</script>
<CardFace {card} symbol={house?.symbol} accent={house?.color}>
 {#snippet rules(text:string)}<PrototypeRules {text}/>{/snippet}
</CardFace>
