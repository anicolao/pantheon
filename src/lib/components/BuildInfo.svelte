<script lang="ts">
  // Baked into this JS bundle: this identifies the loaded app, not a newer
  // deployment returned by a separate status request while this tab stays open.
  const commit: string = import.meta.env.VITE_BUILD_COMMIT ?? '';
  const source: string = import.meta.env.VITE_BUILD_SOURCE ?? commit;
  const run: string = import.meta.env.VITE_BUILD_RUN_URL ?? '';
</script>

{#if commit}
  <span class="build-info" data-build-commit={commit} data-build-source={source}>
    <a href={run || `https://github.com/anicolao/pantheon/commit/${commit}`} target="_blank" rel="noreferrer" title={`PR head: ${commit}`}>Build {commit.slice(0, 8)}</a>
  </span>
{/if}

<style>
  .build-info{display:block;font:11px/1.4 'Atkinson Hyperlegible',sans-serif;letter-spacing:0;white-space:nowrap;}
  a{color:#ecd5a1;text-decoration:underline;text-underline-offset:2px;}
</style>
