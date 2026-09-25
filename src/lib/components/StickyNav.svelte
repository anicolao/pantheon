<script lang="ts">
  import { onMount } from 'svelte';

  type Item = { id: string; label: string; count?: number; href?: string };
  let {
    items, label, selected = $bindable(''), disabled = false,
    height = $bindable(100), element = $bindable(), onselect
  }: {
    items: Item[];
    label: string;
    selected?: string;
    disabled?: boolean;
    height?: number;
    element?: HTMLDivElement;
    onselect?: (id: string) => void;
  } = $props();
  const links = $derived(items.every(item => item.href));

  onMount(() => {
    if (!links) return;
    let frame = 0;
    function update() {
      frame = 0;
      let current = items[0]?.id ?? '';
      for (const item of items) {
        const section = item.href?.startsWith('#') ? document.getElementById(item.href.slice(1)) : null;
        if (section && section.getBoundingClientRect().top <= height + 24) current = item.id;
      }
      // Near the end there may not be enough page left to align an anchor at
      // the top. Keep the requested visible section selected in that case.
      if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
        const target = items.find(item => item.href === window.location.hash);
        const section = target ? document.getElementById(target.id) : null;
        current = section && section.getBoundingClientRect().top >= height
          ? target!.id : items.at(-1)?.id ?? current;
      }
      selected = current;
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(update); }
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('hashchange', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('hashchange', schedule);
    };
  });
</script>

<div class="sticky-nav" bind:this={element} bind:clientHeight={height} role={links ? 'navigation' : 'group'} aria-label={label}>
  {#each items as item (item.id)}
    {#if item.href}
      <a href={item.href} class:chosen={selected === item.id} aria-current={selected === item.id ? 'location' : undefined}>{item.label}{#if item.count !== undefined}<span>{item.count}</span>{/if}</a>
    {:else}
      <button {disabled} class:chosen={selected === item.id} aria-pressed={selected === item.id} onclick={() => onselect?.(item.id)}>{item.label}{#if item.count !== undefined}<span>{item.count}</span>{/if}</button>
    {/if}
  {/each}
</div>

<style>
  .sticky-nav { position: sticky; top: 0; z-index: 10; display: flex; flex-wrap: wrap; gap: 0.6rem 2rem; background: #151b1b; border-bottom: 1px solid #ffffff1a; box-shadow: 0 6px 10px #151b1b99; }
  a, button { display: inline-flex; align-items: baseline; border: 0; border-bottom: 2px solid transparent; background: none; color: #b2b8ad; padding: 0.9rem 0; font: 400 0.88rem/1.2 'Atkinson Hyperlegible', sans-serif; text-decoration: none; }
  .chosen { color: #e8d3a2; border-bottom-color: #d6ba7f; }
  span { margin-left: 0.4rem; opacity: 0.65; font-size: 0.7rem; }
  @media (max-width: 760px) { .sticky-nav { gap: 0.2rem 1.15rem; } a, button { font-size: 0.8rem; } }
  @media print { .sticky-nav { display: none; } }
</style>
