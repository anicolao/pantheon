<script lang="ts">
 import {base} from '$app/paths';
 let {effect='Echo',value=1,positive=false}:{effect?:string;value?:number;positive?:boolean}=$props();
 const placement:Record<string,{x:number;y:number}>={Echo:{x:62,y:49},Seek:{x:44,y:38},Deploy:{x:49,y:49},Bind:{x:49,y:34}};
 const position=$derived(placement[effect]??{x:50,y:50});
</script>
<span class="effect-icon resource-icon" data-effect={effect.toLowerCase()} role="img" aria-label={`${positive?'+':''}${value} ${effect}`} title={`${effect}: ${value}`}>
 <img src={`${base}/assets/expansion/icons/${effect.toLowerCase()}.webp`} alt="" draggable="false"/>
 <b style:left={`${position.x}%`} style:top={`${position.y}%`}>{#if positive}<span>+</span>{/if}{value}</b>
</span>
<style>
.effect-icon{position:relative;display:inline-block;width:calc(var(--effect-icon-size,1.4em)*2);height:calc(var(--effect-icon-size,1.4em)*2);vertical-align:middle;flex-shrink:0;line-height:1}img{width:100%;height:100%;object-fit:contain}b{position:absolute;transform:translate(-50%,-50%);font:700 calc(var(--effect-icon-size,1.4em)*.78)/1 'Atkinson Hyperlegible',sans-serif;color:#fff6d8;white-space:nowrap;text-shadow:0 2px 3px #000,1px 0 2px #000,-1px 0 2px #000}b span{font-family:'STIX Two Math','Cambria Math',serif;position:relative;top:-.04em}
</style>
