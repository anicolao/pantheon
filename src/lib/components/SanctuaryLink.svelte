<script lang="ts">
  import { base } from '$app/paths';
  let { href, label, primary = false }: { href: string; label: string; primary?: boolean } = $props();
</script>

<a {href} class:primary>
  <img src={`${base}/assets/ui/sanctuary-button${primary ? '' : '-secondary'}.png`} alt="" aria-hidden="true" draggable="false" />
  <span>{label}</span>
</a>

<style>
  a { will-change:opacity; position:relative; display:grid; place-items:center; width:100%; height:round(nearest,var(--menu-button-height),2px); text-decoration:none; isolation:isolate; color:#f7e9c9; font:600 round(nearest,var(--menu-label-size),2px)/1 'Cormorant Garamond',serif; text-shadow:0 2px 3px #000; -webkit-user-select:none; user-select:none; }
  img { will-change:filter; position:absolute; width:100%; height:175%; inset: -37.5% 0; z-index:-1; pointer-events:none; }
  span { width:100%; box-sizing:border-box; position:relative; padding:0 18%; text-align:center; }
  a:not(.primary) { width:round(nearest,86%,2px); justify-self:center; height:round(nearest,max(44px,calc(var(--menu-button-height) * .85)),2px); font-size:round(nearest,calc(var(--menu-label-size) * .8),2px); }
  a:focus-visible { outline:3px solid #fff0b8; outline-offset:3px; border-radius:18px; }
  @media(hover:hover) { a:hover img { filter:brightness(1.22); } }
  a:active img { filter:brightness(.9); }
</style>
