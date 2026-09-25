<script lang="ts">
  import { base } from '$app/paths';
  let { href, label, primary = false }: { href: string; label: string; primary?: boolean } = $props();
</script>

<a {href} class:primary>
  <img src={`${base}/assets/ui/sanctuary-button${primary ? '' : '-secondary'}.webp`} alt="" aria-hidden="true" draggable="false" />
  <span>{label}</span>
</a>

<style>
  a { position:relative; display:grid; place-items:center; width:100%; height:var(--menu-button-height); text-decoration:none; isolation:isolate; color:#f7e9c9; font:600 var(--menu-label-size)/1 'Cormorant Garamond',serif; text-shadow:0 2px 3px #000; -webkit-user-select:none; user-select:none; }
  img { position:absolute; width:100%; height:175%; inset: -37.5% 0; z-index:-1; pointer-events:none; }
  span { position:relative; padding:0 18%; text-align:center; }
  a:not(.primary) { width:86%; justify-self:center; height:max(44px,calc(var(--menu-button-height) * .85)); font-size:calc(var(--menu-label-size) * .8); }
  a:focus-visible { outline:3px solid #fff0b8; outline-offset:3px; border-radius:18px; }
  @media(hover:hover) { a:hover img { filter:brightness(1.22); } }
  a:active { transform:translateY(2px); }
</style>
