<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  onMount(() => { void goto(`${base}/play/?expansion=1`, { replaceState: true }); });
</script>
<svelte:head><title>Expansion · Pantheon</title></svelte:head>
<a href={`${base}/play/?expansion=1`}>Continue to the table</a>
