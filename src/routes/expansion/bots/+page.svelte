<script lang="ts">
 import {onMount} from 'svelte';
 import {base} from '$app/paths';
 import GameSession from '$lib/components/play/GameSession.svelte';
 import GameButton from '$lib/components/GameButton.svelte';
 import CardFace from '$lib/components/CardFace.svelte';
 import {allLeaderIds,replaySetup} from '$lib/game/setup';
 import {activePlayer,definition} from '$lib/game/actions';
 import {expansionTable} from '$lib/bots/expansion-session';
 import {append,restoreTable,seatUid,type Tabletop} from '$lib/tabletop/table';
 import type {GameCommand} from '$lib/backend/setup-repository';
 import type {BotProposal} from '$lib/bots/table';
 const storage='pantheon-expansion-bots-v1',uid=seatUid('south');
 let table=$state<Tabletop|null>(null),count=$state(2),leaders=$state<string[]>(['echo','melia','nereon','theseus']);
 let humanFirst=$state(true),seed=$state(''),error=$state(''),mounted=$state(false);
 let worker:Worker|undefined,request=0,requestedRevision=-1,presented=-1;
 const game=$derived(table?replaySetup(table.events):null);
 function save(){if(table)localStorage.setItem(storage,JSON.stringify(table));}
 function stop(){worker?.terminate();worker=undefined;request++;requestedRevision=-1;presented=-1;}
 function drive(revision:number){
  presented=revision;
  if(!game||!table||revision!==table.events.length||game.turn.phase==='finished'||!game.players.find(p=>p.uid===activePlayer(game))?.botKind||requestedRevision===revision||error)return;
  if(!worker){
   worker=new Worker(new URL('../../../lib/bots/table-worker.ts',import.meta.url),{type:'module'});
   worker.onmessage=(event:MessageEvent<{id:number;proposal?:BotProposal;error?:string}>)=>{
    if(event.data.id!==request)return;
    if(event.data.error){error=event.data.error;return;}
    const p=event.data.proposal;if(!p||!table||p.revision!==table.events.length)return;
    try{table=append(table,p.actorUid,p.command);save();}catch(e){error=e instanceof Error?e.message:String(e);}
   };
   worker.onerror=()=>{error='The bot stopped. Retry to continue.';};
  }
  requestedRevision=revision;worker.postMessage({id:++request,events:$state.snapshot(table.events),hostUid:game.players[0].uid});
 }
 async function command(command:GameCommand,revision?:number){
  if(!table||!game||(revision!==undefined&&revision!==table.events.length))return;
  try{table=append(table,uid,command);save();}catch(e){error=e instanceof Error?e.message:String(e);}
 }
 function start(){
  try{stop();error='';table=expansionTable(leaders.slice(0,count),humanFirst,seed.trim()||crypto.randomUUID());save();}catch(e){error=e instanceof Error?e.message:String(e);}
 }
 function retry(){const revision=presented;stop();error='';drive(revision);}
 function newGame(){if(game&&game.turn.phase!=='finished'&&!confirm('Leave this game and choose new leaders?'))return;stop();table=null;error='';localStorage.removeItem(storage);}
 function download(){if(!table)return;const url=URL.createObjectURL(new Blob([JSON.stringify({study:'eight-house-league-2026-11-27',table:$state.snapshot(table)},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='pantheon-bot-playtest.json';a.click();URL.revokeObjectURL(url);}
 onMount(()=>{mounted=true;try{const saved=localStorage.getItem(storage);if(saved)table=restoreTable(saved);}catch{error='The saved game could not be restored. Start a new game.';}return stop;});
</script>
<svelte:head><title>Play the trained bots · Pantheon</title></svelte:head>
{#if game&&table}
 {#key table.seed}<GameSession {game} {uid} roomId="Bot playtest" status="synced" busy={false} {error} {command} {retry} again={newGame} onSettled={drive} onReady={drive}/>{/key}
 <nav class="session-tools" aria-label="Playtest tools"><button onclick={download}>Save replay</button><button onclick={newGame}>New game</button></nav>
{:else}
 <main>
  <h1>Play the trained bots</h1><p>Choose any of the eight leaders. These are the exact models from the 28,000-game study.</p>
  <div class="options"><label>Players<select bind:value={count}><option value={2}>2 players</option><option value={3}>3 players</option><option value={4}>4 players</option></select></label>
  <label>First turn<select bind:value={humanFirst}><option value={true}>You</option><option value={false}>Bot 1</option></select></label></div>
  <div class="seats">{#each Array.from({length:count}) as _,i}<section><label>{i===0?'Your leader':`Bot ${i}`}<select aria-label={i===0?'Your leader':`Bot ${i} leader`} bind:value={leaders[i]}>{#each allLeaderIds as leader}<option value={leader}>{definition(leader).name.split(',')[0]}</option>{/each}</select></label><div class="card"><CardFace card={definition(leaders[i])} players={count as 2|3|4}/></div></section>{/each}</div>
  <label>Game seed (optional)<input bind:value={seed} maxlength="64" placeholder="New random game"/></label>
  {#if error}<p role="alert">{error}</p>{/if}
  <GameButton primary disabled={!mounted||new Set(leaders.slice(0,count)).size!==count} onclick={start}>Play</GameButton>
  {#if new Set(leaders.slice(0,count)).size!==count}<p>Each player needs a different leader.</p>{/if}
  <p>Saved automatically on this device. Use Save replay during a game to share feedback.<br/>The study measured two-player games; three- and four-player play is experimental.</p>
  <a href={`${base}/expansion/tabletop/`}>Play on a shared tabletop</a><a href={`${base}/expansion/`}>Back to expansion</a>
 </main>
{/if}
<style>
 main{min-height:100svh;background:radial-gradient(ellipse at top,#243e49,#071321 80%);color:#f2dfb9;display:flex;flex-direction:column;align-items:center;gap:16px;padding:28px 20px;text-align:center}h1{font:600 clamp(30px,6vw,56px)/1.1 'Cormorant Garamond',serif;margin:0}p{max-width:65ch;line-height:1.5;margin:0}.options,.seats{display:flex;flex-wrap:wrap;justify-content:center;gap:20px}label{display:flex;flex-direction:column;gap:6px}select,input{font:inherit;min-height:44px;background:#102837;color:#f2dfb9;border:1px solid #ad8c50;border-radius:6px;padding:8px}section{width:clamp(140px,20vw,230px);display:grid;gap:12px}.card{width:100%}a{color:#f2dfb9;min-height:44px;display:flex;align-items:center}.session-tools{position:fixed;bottom:4px;right:4px;z-index:60;display:flex;gap:6px}.session-tools button{font:inherit;font-size:12px;background:#102837;color:#f2dfb9;border:1px solid #ad8c50;border-radius:5px;min-height:36px;padding:4px 9px}
</style>
