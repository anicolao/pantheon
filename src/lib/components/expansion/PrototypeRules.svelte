<script lang="ts">
 import ResourceIcon from '../ResourceIcon.svelte';
 import EffectIcon from './EffectIcon.svelte';
 import {ruleParts,type RulePart} from '$lib/game/presentation';
 let {text}:{text:string}=$props();
 type Part=RulePart|{kind:'effect';effect:string;value:number;positive:boolean};
 const parts=$derived.by(()=>{
  const display=text.replace(/After you resolve the first (\w+) Action you play this turn, /g,'1st $1 Action → ');
  const result:Part[]=[];
  for(const part of display.split(/(\+\d+ Echo|Deploy \d+|Bind \d+|Seek \d+)/g)){
   const match=part.match(/^(?:\+(\d+) (Echo)|(Deploy|Bind|Seek) (\d+))$/);
   if(match)result.push({kind:'effect',effect:match[2]??match[3],value:Number(match[1]??match[4]),positive:!!match[2]});
   else result.push(...ruleParts(part));
  }
  return result;
 });
 const onlyIcons=$derived(parts.every(p=>p.kind==='icon'||p.kind==='effect'||p.kind==='text'&&/^[;.\s]*$/.test(p.text)));
 const short=$derived(parts.filter(p=>p.kind==='text').map(p=>p.text).join('').length<50);
 const count=$derived(parts.filter(p=>p.kind==='icon'||p.kind==='effect').length);
</script>
<span class="rules-content" class:only-icons={onlyIcons} class:compact={short} class:many={onlyIcons&&count>2}>
 <span class="sr-only">{text}</span><span class="visual" aria-hidden="true">
 {#each parts as part}{#if part.kind==='effect'}<EffectIcon effect={part.effect} value={part.value} positive={part.positive}/>{:else if part.kind==='icon'}<ResourceIcon resource={part.resource} value={part.value}/>{:else if part.kind==='arrow'}<span class="arrow">→</span>{:else if !onlyIcons}{part.text}{/if}{/each}
 </span>
</span>
<style>
.visual{--icon-size:var(--inline-icon-size,1.9em);--effect-icon-size:var(--icon-size)}.compact:not(.only-icons) .visual{--icon-size:var(--compact-icon-size,1.6em)}.only-icons .visual{display:flex;align-items:center;justify-content:center;gap:2cqi;--icon-size:var(--bonus-icon-size,14cqi)}.only-icons.many .visual{gap:1cqi;--icon-size:8.75cqi}.arrow{font:700 1.5em/1 'STIX Two Math','Cambria Math',serif;vertical-align:middle;padding-inline:.12em}
</style>
