<script lang="ts">
  import { base } from '$app/paths';
  import SanctuaryLink from '$lib/components/SanctuaryLink.svelte';
</script>
<svelte:head><title>Expansion playtest · Pantheon: Bloodlines</title><meta name="description" content="Play the four new houses online with friends or together on a tabletop."/></svelte:head>
<main>
  <h1>Four new houses</h1>
  <p>Echo · Theseus · Achilles · Perseus</p>
  <nav aria-label="Choose how to play the expansion">
    <section><SanctuaryLink href={`${base}/expansion/bots/`} label="Play trained bots" primary/><p>Choose your leader and opponents.<br/>Try the eight models from the league.</p></section>
    <section><SanctuaryLink href={`${base}/play/?expansion=1`} label="Play online"/><p>Each player uses their own screen.<br/>Create a room and share its invitation.</p></section>
    <section><SanctuaryLink href={`${base}/expansion/tabletop/`} label="Play tabletop"/><p>Everyone gathers around one screen.<br/>Tap your leader to take a seat.</p></section>
  </nav>
  <p>Eight leaders · Solo against bots, online with friends, or shared tabletop</p>
  <a href={`${base}/dev/expansion/`}>Explore the new cards</a>
</main>
<style>
  main{min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;background:radial-gradient(ellipse at top,#233d4b,#071321 75%);color:#f2dfb9;}
  h1{font:600 clamp(36px,7vw,72px)/1.1 'Cormorant Garamond',serif;margin:0;}
  p{line-height:1.5;}nav{display:flex;flex-wrap:wrap;justify-content:center;gap:32px;margin:24px 0;width:100%;}section{width:min(340px,100%);--menu-button-height:72px;--menu-label-size:32px;}a{min-height:44px;display:inline-flex;align-items:center;color:#f2dfb9;}
</style>
