<script lang="ts">
  import {onMount} from 'svelte';
  import {goto} from '$app/navigation';
  import {base} from '$app/paths';
  onMount(()=>{void goto(base+'/play/',{replaceState:true});});
</script>
<svelte:head><title>Play with bots — Pantheon</title></svelte:head>
<p><a href={base+'/play/'}>Open the table</a> and use Invite friends to add a bot.</p>
