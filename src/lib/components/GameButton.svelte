<script lang="ts">
  import { base } from '$app/paths';
  let { children, onclick, disabled = false, primary = false, type = 'button' }: {
    children: import('svelte').Snippet; onclick?: () => void; disabled?: boolean; primary?: boolean; type?: 'button' | 'submit';
  } = $props();
</script>
<button {type} {onclick} {disabled} class:primary>
  <img src={`${base}/assets/ui/sanctuary-button${primary ? '' : '-secondary'}.webp`} alt="" aria-hidden="true" draggable="false" />
  <span>{@render children()}</span>
</button>
<style>
  button { position:relative; isolation:isolate; display:grid; place-items:center; width:100%; height:var(--control-height,64px); border:0; padding:0; background:none; color:#fae9c8; font:600 var(--control-font,28px)/1 'Cormorant Garamond',serif; text-shadow:0 2px 3px #000; }
  img { position:absolute; inset:-37.5% 0; width:100%; height:175%; z-index:-1; pointer-events:none; }
  span { padding:0 15%; }
  button:disabled { opacity:.55; cursor:default; }
  button:focus-visible { outline:3px solid #fff0b8; outline-offset:3px; border-radius:18px; }
  @media(hover:hover) { button:not(:disabled):hover img { filter:brightness(1.2); } }
  button:not(:disabled):active { transform:translateY(2px); }
</style>
