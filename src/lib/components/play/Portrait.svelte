<script lang="ts">
  import { base } from '$app/paths';
  let { leader, name, active = false }: { leader: string; name: string; active?: boolean } = $props();
</script>
<div class="portrait" class:active>
  <div class="window"><img src={`${base}/assets/cards/${leader}.webp`} alt="" draggable="false" /></div>
  <img class="frame" src={`${base}/assets/ui/gather-medallion.webp`} alt="" draggable="false" />
  <span class:long={name.length > 12}>{name}</span>
</div>
<style>
  .portrait{position:relative;aspect-ratio:1;width:100%;isolation:isolate;container-type:inline-size;}.window{position:absolute;inset:8% 11% 24%;border-radius:50%;overflow:hidden;}.window img{width:100%;height:100%;object-fit:cover;object-position:40% 15%;}.frame{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;}.active{filter:drop-shadow(0 0 9px #ffdc83);}
  span{position:absolute;top:77%;left:13%;width:74%;height:16%;display:grid;place-items:center;color:#332416;font:700 clamp(10px,13cqi,40px)/1 'Cormorant Garamond',serif;overflow-wrap:anywhere;text-align:center;}
  span.long{font-size:7cqi;}
</style>
