<script lang="ts">
  import { iconNames, type IconKind } from '$lib/game/presentation';
  let { resource, value }: { resource: IconKind; value?: string | number } = $props();
</script>

<span class="print-icon" role="img" aria-label={`${value ?? ''} ${iconNames[resource]}`.trim()} title={iconNames[resource]}>
  {#if value !== undefined}<b>{value}</b>{/if}
  <svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    {#if resource === 'coins'}<circle cx="16" cy="16" r="12"/><circle cx="16" cy="16" r="8"/><path d="m16 10 4 6-4 6-4-6Z"/>
    {:else if resource === 'cards'}<path d="M8 24H4V4h15v4M12 28H8V8h15v4"/><rect x="12" y="12" width="15" height="18" rx="1"/>
    {:else if resource === 'actions'}<path d="m18 2-13 17h10l-2 11L27 12H17Z"/>
    {:else if resource === 'buys'}<path d="M5 12h22l-3 16H8ZM10 12l6-9 6 9M12 17v6m8-6v6"/>
    {:else if resource === 'worship'}<path d="M3 12 16 4l13 8ZM5 28h22M7 15v10m9-10v10m9-10v10M3 31h26"/>
    {:else if resource === 'victory'}<path d="M13 29C1 24 2 10 9 4M19 29C31 24 30 10 23 4M6 11l5-2M4 17l6-2M6 23l6-2M26 11l-5-2M28 17l-6-2M26 23l-6-2m-10 4 8 4"/><path d="m16 7 2 5 6 1-4 4 1 6-5-3-5 3 1-6-4-4 6-1Z"/>
    {:else if resource === 'trash'}<path d="M5 8h22M12 8V4h8v4M8 8l2 21h12l2-21M13 13v11m6-11v11"/>
    {:else if resource === 'discard'}<path d="M3 23v6h26v-6M16 3v16m-5-5 5 5 5-5"/><path d="M5 23h22"/>
    {:else if resource === 'gain'}<rect x="4" y="5" width="17" height="24" rx="1"/><path d="M11 12h18m-6-6 6 6-6 6"/>
    {:else if resource === 'topdeck'}<path d="M4 23h24v6H4ZM4 19h24M16 16V3m-5 5 5-5 5 5"/>{/if}
  </svg>
</span>

<style>
  .print-icon { display: inline-flex; align-items: center; gap: 0.12em; vertical-align: middle; white-space: nowrap; color: inherit; line-height: 1; }
  svg { width: 1.45em; height: 1.45em; flex: none; }
  b { font-size: 1.12em; }
</style>
