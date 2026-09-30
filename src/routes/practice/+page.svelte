<script lang="ts">
 import {onMount} from 'svelte';
 import {base} from '$app/paths';
 import GameSession from '$lib/components/play/GameSession.svelte';
 import {PracticeSession,type RecordGame} from '$lib/bots/session';
 import {botLabels,type BotKind} from '$lib/bots/policy';
 import {activePlayer,type ActionCommand} from '$lib/game/actions';
 import {leaderIds,leaderLinks,type SetupState} from '$lib/game/setup';
 import type {GameCommand} from '$lib/backend/setup-repository';
 let kind=$state<BotKind>('classic-engine'),humanLeader=$state('thaleia'),botLeader=$state('nereon'),humanFirst=$state(true);
 let game=$state<SetupState|null>(null),thinking=$state(false),paused=$state(false),error=$state(''),saved=$state(false);
 let session:PracticeSession|null=null,worker:Worker|undefined,timer:ReturnType<typeof setTimeout>|undefined,request=0,alive=false;
 const key='pantheon-practice-v1';
 function persist(){if(session)try{localStorage.setItem(key,JSON.stringify(session.save()));saved=true;}catch{error='Your browser could not save this game. Keep this tab open to continue.';}}
 function display(){if(session)game=structuredClone(session.game);}
 function stop(){request++;worker?.terminate();worker=undefined;clearTimeout(timer);thinking=false;}
 function schedule(){
  if(!alive||!session||paused||error||session.game.turn.phase==='finished'||activePlayer(session.game)!=='bot')return;
  thinking=true;
  timer=setTimeout(()=>{
   if(!session||paused||!alive)return;
   worker??=new Worker(new URL('../../lib/bots/worker.ts',import.meta.url),{type:'module'});
   worker.onmessage=event=>{
    if(event.data.id!==request||!session||!alive)return;
    thinking=false;
    if(event.data.error){error=event.data.error;return;}
    try{
     session.tracker.memories.bot=event.data.memory;
     session.apply(event.data.command);persist();display();schedule();
    }catch(e){error=e instanceof Error?e.message:String(e);}
   };
   worker.onerror=()=>{thinking=false;error='The opponent stopped unexpectedly. Retry its turn or reload your saved game.';};
   const view=session.tracker.view(session.game);
   worker.postMessage({id:++request,view,memory:structuredClone(session.tracker.memories.bot),kind:session.config.bot});
  },180);
 }
 function start(){
  stop();error='';
  try{
   if(humanLeader===botLeader)throw Error('Choose different leaders.');
   session=new PracticeSession({seed:crypto.randomUUID(),humanLeader,botLeader,humanFirst,bot:kind});
   paused=false;persist();display();schedule();
  }catch(e){error=e instanceof Error?e.message:String(e);}
 }
 function resume(){
  stop();error='';
  try{session=PracticeSession.restore(JSON.parse(localStorage.getItem(key)??'null') as RecordGame);paused=false;display();schedule();}
  catch{session=null;game=null;error='This saved game could not be restored. You can start a new game.';}
 }
 async function command(c:GameCommand){
  if(!session||activePlayer(session.game)!=='human')return;
  try{session.apply(c as ActionCommand);error='';persist();display();schedule();}
  catch(e){error=e instanceof Error?e.message:String(e);}
 }
 function retry(){stop();error='';schedule();}
 function togglePause(){paused=!paused;if(paused)stop();else schedule();}
 function again(){stop();session=null;game=null;error='';}
 function download(){
  if(!session)return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(session.save(),null,2)],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='pantheon-practice.json';link.click();URL.revokeObjectURL(url);
 }
 onMount(()=>{alive=true;try{saved=!!localStorage.getItem(key);}catch{}return ()=>{alive=false;stop();};});
</script>
<svelte:head><title>Practice against a bot · Pantheon</title></svelte:head>
{#if game}
 <GameSession {game} uid="human" roomId="" status="synced" busy={false} {error} {command} {retry} {again}/>
 <aside class="controls" aria-label="Practice controls">
  <span aria-live="polite">{thinking?'Opponent is thinking…':paused?'Opponent paused':'Local practice · equal turns'}</span>
  <button onclick={togglePause}>{paused?'Resume opponent':'Pause opponent'}</button>
  <button onclick={download}>Save replay</button><button onclick={again}>New game</button>
 </aside>
 {#if error}<div class="practice-error" role="alert">{error} <button onclick={retry}>Retry opponent</button></div>{/if}
{:else}
 <main class="setup">
  <a href={base+'/'}>‹ Sanctuary</a><h1>Practice against a bot</h1>
  <p>Play locally with all leader powers and worship. Both players finish the same number of turns; tied scores share victory. Your progress is saved in this browser.</p>
  <form onsubmit={e=>{e.preventDefault();start();}}>
   <label>Opponent strategy<select bind:value={kind}>{#each Object.entries(botLabels) as [id,label]}<option value={id}>{label}</option>{/each}</select></label>
   <label>Your leader<select bind:value={humanLeader}>{#each leaderIds as id}<option value={id}>{leaderLinks(id).leader.name}</option>{/each}</select></label>
   <label>Opponent leader<select bind:value={botLeader}>{#each leaderIds as id}<option value={id}>{leaderLinks(id).leader.name}</option>{/each}</select></label>
   <label>Turn order<select bind:value={humanFirst}><option value={true}>You play first</option><option value={false}>Opponent plays first</option></select></label>
   {#if humanLeader===botLeader}<p role="status">Choose different leaders.</p>{/if}
   <button type="submit" disabled={humanLeader===botLeader}>Start practice game</button>
   {#if saved}<button type="button" onclick={resume}>Continue saved game</button>{/if}
  </form>
  {#if error}<p role="alert">{error}</p>{/if}
 </main>
{/if}
<style>
 .setup{max-width:640px;margin:0 auto;padding:36px 24px 80px;color:#f8e8c8;min-height:100vh;box-sizing:border-box}
 h1{font:600 42px 'Cormorant Garamond',serif;margin:24px 0 12px}p{line-height:1.6}
 form{display:grid;gap:20px;margin-top:24px}label{display:grid;gap:8px}
 select,button{font:inherit;border:1px solid #c9ab6e;border-radius:8px;padding:12px;background:#222b30;color:#f8e8c8}
 button{cursor:pointer}button:disabled{opacity:.5;cursor:default}a{color:#f8e8c8}
 .controls{position:fixed;bottom:8px;right:12px;z-index:25;display:flex;gap:8px;align-items:center;padding:6px 10px;border-radius:8px;background:#111e}
 .controls button{padding:6px 8px;font-size:12px}.controls span{font-size:12px}
 .practice-error{position:fixed;top:0;left:0;right:0;z-index:100;background:#562a25;color:white;padding:16px}
 @media(max-width:600px){.controls{left:8px;right:8px;flex-wrap:wrap}.controls span{flex:1 0 100%}}
</style>
