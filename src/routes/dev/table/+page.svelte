<script lang="ts">
  import { untrack } from 'svelte';
  import { base } from '$app/paths';
  import GameSession from '$lib/components/play/GameSession.svelte';
  import { replaySetup, leaderIds, type SetupEvent } from '$lib/game/setup';
  import { activePlayer } from '$lib/game/actions';
  import type { GameCommand } from '$lib/backend/setup-repository';

  // A local game using the real reducer and UI; no Firebase or second device needed.
  function opening(count: 2 | 3 | 4): SetupEvent[] {
    const names = ['Ariadne', 'Theseus', 'Iris', 'Leon'];
    const events: SetupEvent[] = names.slice(0,count).map((name,index)=>({
      schemaVersion:1, sequence:index+1, actorUid:`preview-${index}`, name,
      playerCount:count, type:index===0?'game/created':'player/joined'
    }));
    events.push({...events[0],sequence:count+1,type:'draft/started',seed:'table-layout-preview',reducerVersion:1,commandId:'preview-begin'});
    const draft=replaySetup(events);
    draft.draftOrder.forEach((uid,index)=>{
      const player=draft.players.find(player=>player.uid===uid)!;
      events.push({schemaVersion:1,sequence:events.length+1,actorUid:uid,name:player.name,
        playerCount:count,type:'leader/chosen',leaderId:leaderIds[index],reducerVersion:1,commandId:`preview-leader-${index}`});
    });
    return events;
  }
  let players=$state<2|3|4>(2), events=$state(opening(2)), error=$state(''), generation=$state(0);
  const game=$derived(replaySetup(events));
  let uid=$state(untrack(()=>activePlayer(game)));
  function reset(){events=opening(players);uid=activePlayer(game);error='';generation++;}
  const nextViewer=$derived(activePlayer(game)!==uid?activePlayer(game):game.players[(game.players.findIndex(player=>player.uid===uid)+1)%game.players.length].uid);
  function viewAs(next:string){uid=next;error='';generation++;}
  async function command(command:GameCommand, expectedRevision?:number){
    if(expectedRevision!==undefined&&expectedRevision!==events.length)return;
    const player=game.players.find(player=>player.uid===uid)!;
    const event:SetupEvent={schemaVersion:1,sequence:events.length+1,actorUid:uid,name:player.name,
      playerCount:players,reducerVersion:1,commandId:`preview-command-${events.length+1}`,...command};
    try{const next=[...events,event];replaySetup(next);events=next;error='';}
    catch(cause){error=cause instanceof Error?cause.message:String(cause);}
  }
</script>

<svelte:head><title>Table layout preview · Pantheon</title></svelte:head>
{#key generation}
  <GameSession {game} {uid} roomId="DEMO" status="synced" busy={false} {error} {command} retry={()=>{error='';}} again={reset}/>
{/key}
<details class="preview-tools" aria-label="Demo controls">
  <summary>Demo · switch player</summary>
  <div class="view-tools">
    <label>Viewing <select bind:value={uid} onchange={()=>viewAs(uid)}>{#each game.players as player}<option value={player.uid}>{player.name}</option>{/each}</select></label>
    <button class="switch-player" onclick={()=>viewAs(nextViewer)}>Switch to {game.players.find(player=>player.uid===nextViewer)?.name} →</button>
  </div>
  <details>
    <summary>Preview settings</summary>
    <label>Players <select bind:value={players} onchange={reset}><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option></select></label>
    <button onclick={reset}>Reset table</button><a href={base+'/dev/choices/'}>Preview card choices</a>
    <p>Your viewpoint stays fixed through cleanup and redeal. Switch players whenever you’re ready.</p>
  </details>
</details>

<style>
  .preview-tools{position:fixed;left:8px;bottom:calc(9svh + 8px);z-index:10000;color:#f4dfb2;background:#071321ed;border:1px solid #a88746;border-radius:8px;padding:4px 8px;font-size:11px;max-width:calc(100vw - 16px);}
  .preview-tools>summary{margin:0;}
  .view-tools{display:flex;align-items:center;flex-wrap:wrap;gap:8px;}.switch-player{border-color:#e9c578;background:#274450;}summary{cursor:pointer;margin-top:5px;}label{display:flex;gap:10px;align-items:center;margin:4px 0;}
  select,button{color:inherit;background:#173043;border:1px solid #a88746;border-radius:4px;padding:6px;}p{line-height:1.4;margin-bottom:0;}
</style>
