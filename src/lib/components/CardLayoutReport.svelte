<script lang="ts">
  import type { CardFitIssue } from '$lib/layout/card-fit';
  let { root }: { root: HTMLElement | undefined } = $props();
  let checked = $state(0);
  let pending = $state(0);
  let failures = $state<{ name: string; issues: CardFitIssue[] }[]>([]);
  $effect(() => {
    if (!root) return;
    const grid = root;
    const update = () => {
      const faces = [...grid.querySelectorAll<HTMLElement>('.card')];
      pending = faces.filter(face => !face.dataset.layoutState || face.dataset.layoutState === 'pending').length;
      checked = faces.length - pending;
      failures = faces.filter(face => face.dataset.layoutState === 'overflow').map(face => ({
        name: face.querySelector('h3')?.textContent ?? face.dataset.cardId!,
        issues: JSON.parse(face.dataset.layoutIssues ?? '[]')
      }));
    };
    const observer = new MutationObserver(update);
    observer.observe(grid, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-layout-state', 'data-layout-issues'] });
    update();
    return () => observer.disconnect();
  });
</script>

<aside class:failed={failures.length > 0} aria-label="Card layout checks">
  <p role="status">Card layout: {checked} checked{#if pending} · {pending} pending{/if} · {failures.length ? `${failures.length} with overflow` : 'no overflow detected'}</p>
  {#if failures.length}<ul>{#each failures as failure}<li><strong>{failure.name}:</strong> {failure.issues.map(issue => `${issue.region}: ${issue.problem}`).join('; ')}</li>{/each}</ul>{/if}
</aside>

<style>
  aside { margin: 1rem 0; padding: .8rem 1rem; border: 1px solid #ffffff29; color: #bac8b6; font-size: .8rem; line-height: 1.5; }
  aside.failed { color: #ffd1b9; border-color: #b96940; }
  p { margin: 0; } ul { margin-bottom: 0; padding-left: 1.25rem; }
  @media print { aside { display: none; } }
</style>
