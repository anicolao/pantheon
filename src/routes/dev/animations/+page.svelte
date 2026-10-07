<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { base } from '$app/paths';
  import TabletopSession from '$lib/components/play/TabletopSession.svelte';
  import {freshTable,edges,seatUid,type Edge,type Tabletop} from '$lib/tabletop/table';
  import GameSession from '$lib/components/play/GameSession.svelte';
  import { replaySetup, type SetupEvent } from '$lib/game/setup';
  import type { GameCommand } from '$lib/backend/setup-repository';
  import { fixture, scenarios } from './scenarios';

  let surface=$state('game'), edge=$state<Edge>('south'), tableView=$state<TabletopSession>();
  let preparedTable=$state<Tabletop>(freshTable());
  let subject=$state('treasure'), players=$state<2|3|4>(2), observer=$state(false);
  let prepared=$state(fixture('treasure',2)), events=$state<SetupEvent[]>(untrack(()=>prepared.events));
  let generation=$state(0), error=$state(''), ready=$state(false), replayPending=$state(false);
  let mounted=$state(false);
  let toolsOpen=$state(true), speed=$state(1), activeAnimations=$state(0), flights=$state(0), reduced=$state(false);
  let triggered=$state(false), latest=$state('Scenario loaded');
  const game=$derived(replaySetup(events));
  const uid=$derived(observer ? game.players.find(player=>player.uid!==prepared.actor)!.uid : prepared.actor);
  const description=$derived(scenarios.find(item=>item.id===subject)!);

  function reset(replay=false) {
    try {
      const seats=Array.from({length:players},(_,i)=>edges[(edges.indexOf(edge)+i)%4]);
      const next=surface==='tabletop'?fixture(subject,players,seats.map(seatUid)):fixture(subject,players);
      if(surface==='tabletop'){
        const state=replaySetup(next.events),table=freshTable();
        preparedTable={...table,events:next.events,seats:table.seats.map(seat=>({...seat,mode:seats.includes(seat.edge)?'human':'empty',joined:seats.indexOf(seat.edge)+1,leader:(state.leaders[seatUid(seat.edge)]??seat.leader) as typeof seat.leader}))};
      }
      prepared=next;events=next.events;generation++;error='';ready=false;triggered=false;
      replayPending=replay;latest='Preparing table';
      const url=new URL(location.href);url.searchParams.set('surface',surface);url.searchParams.set('edge',edge);url.searchParams.set('scenario',subject);url.searchParams.set('players',String(players));url.searchParams.set('observer',String(observer));history.replaceState(null,'',url);
    } catch(cause) {error=String(cause);}
  }
  async function send(command:GameCommand, actor:string, expectedRevision?:number) {
    if(expectedRevision!==undefined && expectedRevision!==events.length)return;
    try {
      const sequence=events.length+1;
      const next:SetupEvent[]=[...events,{schemaVersion:1,reducerVersion:1,sequence,commandId:`lab-live-${sequence}`,actorUid:actor,name:game.players.find(player=>player.uid===actor)!.name,playerCount:players,...command}];
      replaySetup(next);events=next;error='';ready=false;latest=command.type;
      await tick();
    }catch(cause){error=cause instanceof Error?cause.message:String(cause);}
  }
  async function trigger() {
    if(!prepared.trigger||!ready)return;
    toolsOpen=false;triggered=true;
    if(surface==='tabletop'){ready=false;await tableView?.play(prepared.trigger);}else await send(prepared.trigger,prepared.actor);
  }
  function settled(revision:number) {
    if(revision!==events.length)return;
    ready=true;
    if(replayPending){replayPending=false;void trigger();}
  }
  onMount(()=>{
    const params=new URLSearchParams(location.search);
    if(params.get('surface')==='tabletop')surface='tabletop';
    if(edges.includes(params.get('edge') as Edge))edge=params.get('edge') as Edge;
    if(scenarios.some(item=>item.id===params.get('scenario')))subject=params.get('scenario')!;
    const n=Number(params.get('players'));if(n===2||n===3||n===4)players=n;
    observer=params.get('observer')==='true';reset();mounted=true;
    const media=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>reduced=media.matches;update();media.addEventListener('change',update);
    let frame=0;
    function inspect(){
      const animations=document.getAnimations().filter(animation=>animation.playState==='running'||animation.pending);
      activeAnimations=animations.length;flights=document.querySelectorAll('.public-flight').length;
      for(const animation of animations)if(animation.playbackRate!==speed)animation.updatePlaybackRate(speed);
      frame=requestAnimationFrame(inspect);
    }
    frame=requestAnimationFrame(inspect);
    return()=>{cancelAnimationFrame(frame);media.removeEventListener('change',update);};
  });
</script>

<svelte:head><title>Animation lab · Pantheon</title></svelte:head>
{#key generation}
  {#if surface==='tabletop'}
    <TabletopSession bind:this={tableView} initialTable={preparedTable} persist={false} motionRate={speed} onState={table=>{events=table.events;}} onReady={(revision,available)=>{if(available)settled(revision);else ready=false;}}/>
  {:else}
  <GameSession motionRate={speed} {game} {uid} roomId="MOTION" status="synced" busy={false} {error} command={(command,revision)=>send(command,uid,revision)} retry={()=>{error='';}} again={()=>reset()} onSettled={settled}/>
  {/if}
{/key}
<aside class="lab-tools" aria-label="Animation lab">
  <div class="quick-controls">
    <button onclick={()=>toolsOpen=!toolsOpen} aria-expanded={toolsOpen}>Animation lab {toolsOpen?'▴':'▾'}</button>
    {#if prepared.trigger}<button class="primary" disabled={!ready} onclick={()=>triggered?reset(true):trigger()}>{triggered?'Replay':'Trigger'}</button>{/if}
    <button onclick={()=>reset()}>Reset</button>
    <span class="status" role="status">{flights ? `${flights} flying` : activeAnimations ? `${activeAnimations} moving` : ready ? 'Ready' : 'Preparing'}</span>
  </div>
  {#if toolsOpen}
    <div class="settings">
      <div class="row"><label>Surface<select aria-label="Animation surface" bind:value={surface} onchange={()=>reset()}><option value="game">Main game</option><option value="tabletop">Tabletop</option></select></label>
      {#if surface==='tabletop'}<label>Acting edge<select aria-label="Acting edge" bind:value={edge} onchange={()=>reset()}>{#each edges as side}<option value={side}>{side}</option>{/each}</select></label>{/if}</div>
      <label>Scenario<select disabled={!mounted} aria-label="Animation scenario" bind:value={subject} onchange={()=>reset()}>{#each scenarios as item}<option value={item.id}>{surface==='tabletop'&&['cleanup','shuffle'].includes(item.id)?item.id==='cleanup'?'Cleanup and rotate':'Cleanup with exhausted deck':item.name}</option>{/each}</select></label>
      <div class="row">
        <label>Players<select disabled={!mounted} aria-label="Players" bind:value={players} onchange={()=>reset()}><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option></select></label>
        {#if surface==='game'}<label>View<select disabled={!mounted} aria-label="View" bind:value={observer} onchange={()=>reset()}><option value={false}>Acting player</option><option value={true}>Observer</option></select></label>{/if}
        <label>Playback speed<select disabled={!mounted} aria-label="Playback speed" bind:value={speed}><option value={0.25}>¼×</option><option value={0.5}>½×</option><option value={1}>Current game speed</option><option value={2}>2×</option></select></label>
      </div>
      <p>{surface==='tabletop' && ['cleanup','shuffle'].includes(subject)?'Discard the old hand and played cards, keep the new hand concealed, then rotate to the next player. There is no cleanup redeal animation.':description.hint}</p>
      <p class="note">Same game components, seeded deals and legal commands. Click Trigger once, or use the table normally. Replay resets first. Playback speed affects flights, transitions and the market glide. Automatic market recentering waits for the card animations to complete.</p>
      {#if reduced}<p class="warning">Your system requests reduced motion. Disable that preference to review animations.</p>{/if}
      <p class="note">Last command: {latest} · revision {events.length} · viewing {game.players.find(player=>player.uid===uid)?.name}</p>
      {#if error}<p role="alert">{error}</p>{/if}
      <nav><a href={`${base}/dev/table/`}>Free play</a><a href={`${base}/dev/coverflow/`}>Supply geometry</a><a href={`${base}/dev/choices/`}>Choice preview</a></nav>
    </div>
  {/if}
</aside>
<style>
 .lab-tools{position:fixed;left:50%;top:6px;transform:translateX(-50%);z-index:10000;width:max-content;max-width:calc(100vw - 12px);border:1px solid #a98e56;border-radius:10px;background:#081523f5;color:#f5e3bd;font:12px/1.4 'Atkinson Hyperlegible',sans-serif;box-shadow:0 4px 20px #0008;}
 .quick-controls{display:flex;align-items:center;gap:6px;padding:6px;flex-wrap:wrap;}.status{min-width:58px;font-size:11px;}.settings{width:480px;max-width:calc(100vw - 30px);padding:0 10px 10px;max-height:65svh;overflow:auto;box-sizing:border-box;}
 label{display:grid;gap:4px;margin:7px 0;}select,button{min-height:34px;background:#173043;color:inherit;border:1px solid #a98e5677;border-radius:5px;padding:5px 8px;font:inherit;}select{width:100%;min-width:0;}button{cursor:pointer;}button:disabled{opacity:.45;cursor:default;}.primary{background:#ddbd79;color:#122335;font-weight:700;}.row{display:flex;gap:10px;}.row label{flex:1;min-width:0;}.note{font-size:11px;color:#bdc4c4;}.warning,[role=alert]{color:#ffb77a;}nav{display:flex;gap:16px;}a{color:#e8ca8c;}
 @media(max-aspect-ratio:3/4){.lab-tools{top:76px;}}
</style>
