<script lang="ts">
  import { base } from '$app/paths';
</script>

<!-- Art designed for nine-slice scaling: intact corner ornaments and continuous rails. -->
<span class="resource-frame" aria-hidden="true" style:border-image-source={`url("${base}/assets/ui/resource-frame.png")`}>
  <span class="inset"></span>
</span>

<style>
  .resource-frame{position:absolute;inset:0;z-index:-1;pointer-events:none;container-type:size;--corner:clamp(22px,16cqw,60px);}
  .resource-frame::after{content:"";position:absolute;inset:0;border-image-source:inherit;border-image-slice:25%;border-image-width:var(--corner);border-image-repeat:round;}
  .inset{position:absolute;inset:calc(var(--corner)*.4);z-index:-1;background:radial-gradient(ellipse at 50% 15%,#1c3044ee,#071321f5);border-radius:calc(var(--corner)*.7);}
</style>
