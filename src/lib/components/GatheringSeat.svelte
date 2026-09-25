<script lang="ts">
  import { base } from '$app/paths';
  let { name, index, own = false, host = false, entering = false, disabled = false, value = $bindable(''), invalid = false }: {
    name?: string; index: number; own?: boolean; host?: boolean; entering?: boolean; disabled?: boolean; value?: string; invalid?: boolean;
  } = $props();
  const portraits = ['thaleia', 'nereon', 'melia', 'doreios'];
</script>
<article class="seat" class:empty={!name && !entering} data-testid={name ? 'player-seat' : undefined}>
  {#if name || entering}
    <div class="portrait"><img src={`${base}/assets/cards/${portraits[index % 4]}.webp`} alt="" draggable="false" /></div>
    <img class="frame" src={`${base}/assets/ui/gather-medallion.webp`} alt="" aria-hidden="true" draggable="false" />
    <div class="plate">
      {#if entering}
        <label class="sr-only" for="player-name">Your name</label>
        <input placeholder="Your name" id="player-name" aria-invalid={invalid} aria-describedby={invalid ? 'name-error' : undefined} bind:value maxlength="24" autocomplete="nickname" {disabled} />
      {:else}
        <h2 class:long={name!.length > 16}>{name}</h2>
      {/if}
    </div>
    {#if name}<p class="seat-meta">{own ? 'You' : 'At the table'}{host ? ' · Host' : ''}</p>{/if}
  {:else}
    <img class="empty-ring" src={`${base}/assets/ui/gather-seat.webp`} alt="" aria-hidden="true" draggable="false" />
    <p class="waiting">Waiting for a player</p>
  {/if}
</article>
<style>
  .seat { container-type:inline-size; position:relative; width:100%; aspect-ratio:1; isolation:isolate; font-family:'Cormorant Garamond',serif; }
  .portrait { position:absolute; inset:8% 11% 24%; border-radius:50%; overflow:hidden; }
  .portrait img { width:100%; height:100%; object-fit:cover; object-position:50% 15%; }
  .frame { position:absolute; inset:0; width:100%; height:100%; z-index:1; pointer-events:none; }
  .plate { position:absolute; top:76%; left:13%; width:74%; height:17%; z-index:2; display:flex; flex-direction:column; justify-content:center; align-items:center; color:#30251b; }
  h2 { margin:0; font-size:clamp(16px,2.4svh,48px); line-height:1; overflow-wrap:anywhere; text-align:center; max-width:100%; }
  h2.long { font-size:clamp(10px,5.6cqi,32px); }
  .seat-meta { position:absolute; top:96%; left:16%; width:68%; text-align:center; padding:3px 2px; color:#f2e2bb; background:#0f3734; border:1px solid #a48848; border-radius:0 0 8px 8px; }
  p { margin:2px 0 0; font-family:'Atkinson Hyperlegible',sans-serif; font-size:clamp(10px,1.1svh,22px); }
  label { font-size:clamp(13px,1.6svh,28px); line-height:1; }
  input { min-height:44px; width:100%; min-width:0; padding:0 5px; border:0;  border-radius:2px; color:#30251b; background:transparent; text-align:center; font:600 clamp(18px,2.5svh,44px)/1 'Cormorant Garamond',serif; }
  .empty-ring { position:absolute; width:100%; height:78%; top:12%; object-fit:contain; }
  .waiting { position:absolute; top:45%; left:20%; width:60%; text-align:center; font-family:'Cormorant Garamond',serif; font-size:clamp(16px,2.2svh,42px); color:#ead5a6; text-shadow:0 2px 4px #000; }
  @media(max-aspect-ratio:3/4) { .plate { top:76%; height:18%; } h2 { font-size:clamp(14px,4.2vw,28px); } p{font-size:10px;} label{font-size:13px;} input{font-size:18px;} .waiting{font-size:18px;} }
</style>
