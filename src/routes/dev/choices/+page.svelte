<script lang="ts">
 import {onMount} from 'svelte';
 let mounted=$state(false);onMount(()=>{mounted=true;});
 import GameSession from '$lib/components/play/GameSession.svelte';
 import {replaySetup,type SetupEvent} from '$lib/game/setup';
 import type {GameCommand} from '$lib/backend/setup-repository';
 import {choiceScenarios} from './scenarios';
 import {definition} from '$lib/game/actions';
 import {base} from '$app/paths';
 const fixtures=choiceScenarios();
 let generation=$state(0);
 function reset(){events=fixtures[subject];error='';generation++;}
 let subject=$state<keyof typeof fixtures>('harvest-feast');
 let events=$state(fixtures['harvest-feast'] as SetupEvent[]),error=$state('');
 const game=$derived(replaySetup(events));
 async function command(command:GameCommand){const sequence=events.length+1;try{const next=[...events,{schemaVersion:1,reducerVersion:1,commandId:'ui-'+sequence,sequence,actorUid:'a',name:'Ariadne',playerCount:2,...command}] as SetupEvent[];replaySetup(next);events=next;error='';}catch(cause){error=String(cause);}}
</script>
{#key generation}<GameSession {game} uid="a" roomId="LOCAL" status="synced" busy={false} {error} {command} retry={()=>{}} again={()=>{}}/>{/key}
<svelte:head><title>Card choice preview · Pantheon</title></svelte:head>
<details class="preview-tools">
 <summary>Choice preview</summary>
 <label>Scenario <select disabled={!mounted} aria-label="Scenario" bind:value={subject} onchange={reset}>{#each Object.keys(fixtures) as key}<option value={key}>{key==='bronze-recruit'?'Doreios’s blessing':definition(key).name}</option>{/each}</select></label>
 <button onclick={reset}>Reset scenario</button>
 <a href={base+'/dev/table/'}>Table preview</a>
 <p>Play the named Action from your hand to try its choice. Doreios’s scenario starts with Bronze Recruit.</p>
</details>
<style>.preview-tools{position:fixed;bottom:4px;left:4px;z-index:10000;max-width:260px;padding:5px 8px;border:1px solid #b08d4e;border-radius:6px;background:#071321f5;color:#ffe4b5;font-size:12px;}label{display:block;margin:8px 0;}button,a{margin-right:8px;color:inherit;}button,select{background:#122b3c;color:#ffe4b5;border:1px solid #b08d4e;border-radius:4px;padding:5px;}p{margin:8px 0;}</style>
