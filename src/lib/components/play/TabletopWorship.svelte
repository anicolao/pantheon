<script lang="ts">
  import { onMount } from 'svelte';
  import type { SetupState } from '$lib/game/setup';
  import { definition, devotionCards, worshipReason } from '$lib/game/actions';
  import WorshipFace from './WorshipFace.svelte';
  import { motionDuration, MOTION_EASING } from './motion';
  let {game,uid,cardId,rotation,source,ready,busy,submit,close,onOpened,selectedCount,resolve,covered=false}:{game:SetupState;uid:string;cardId:string;rotation:number;source?:HTMLElement;ready:boolean;busy:boolean;submit:()=>void;close:()=>void;onOpened:()=>void;selectedCount:number;resolve:()=>void;covered?:boolean}=$props();
  let node:HTMLElement, returning=$state(false);
  const devotion=$derived(devotionCards(game,uid,cardId).length);
  function origin(){
    if(!source)return 'none';
    const from=source.getBoundingClientRect(),to=node.getBoundingClientRect(),angle=rotation*Math.PI/180;
    const dx=from.x+from.width/2-to.x-to.width/2,dy=from.y+from.height/2-to.y-to.height/2;
    return `translate(${dx*Math.cos(angle)+dy*Math.sin(angle)}px,${-dx*Math.sin(angle)+dy*Math.cos(angle)}px) scale(${source.offsetWidth/node.offsetWidth})`;
  }
  export async function returnToPile(){
    if(returning)return;returning=true;
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)await node.animate([{transform:'none'},{transform:origin()}],{duration:motionDuration(240),easing:MOTION_EASING,fill:'forwards'}).finished.catch(()=>{});
    close();
  }
  onMount(()=>{
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){onOpened();return;}
    const animation=node.animate([{transform:origin()},{transform:'none'}],{duration:motionDuration(240),easing:MOTION_EASING});
    void animation.finished.then(onOpened).catch(()=>{});return()=>animation.cancel();
  });
</script>
<section style:visibility={covered?'hidden':undefined} class="temple-zoom" bind:this={node} aria-label={`${definition(cardId).god} worship`}>
  <WorshipFace {game} {uid} {cardId}/>
  <div class="worship-controls">
    <p>{devotion >= 2 ? 'Favored' : 'Standard'} · {devotion} Devotion</p>
    {#if game.turn.choice}<p>Choose from {game.turn.choice.kind==='gain'?'the offer':'your hand'}.</p>
      {#if game.turn.choice.kind!=='gain'}<button disabled={!ready||busy||selectedCount<game.turn.choice.min} onclick={resolve}>{game.turn.choice.kind==='trash'?'Done trashing':'Discard selected'} ({selectedCount})</button>
      {:else if game.turn.choice.min===0}<button disabled={!ready||busy} onclick={resolve}>Gain none</button>{/if}
    {:else}<button disabled={!ready||busy||returning||!!worshipReason(game,uid,cardId)} onclick={submit}>Worship {definition(cardId).god}</button>{/if}
  </div>
  {#if !game.turn.choice}<button class="return-temple" aria-label="Return temple" disabled={busy||returning} onclick={()=>returnToPile()}>×</button>{/if}
</section>
<style>
  .temple-zoom{position:absolute;width:min(42cqmin,94%);left:50%;bottom:0;translate:-50% 0;z-index:9;filter:drop-shadow(0 1cqmin 2cqmin #000a);}
  .worship-controls{position:absolute;left:5%;bottom:14%;width:40%;box-sizing:border-box;padding:1cqmin;background:#091b25f5;border:1px solid #c9a663;border-radius:1cqmin;color:#ffe9bc;text-align:center;}
  p{font-size:1.5cqmin;margin:0 0 .6cqmin;}button{font:inherit;font-size:1.5cqmin;min-height:3.6cqmin;background:linear-gradient(#f0d89a,#a5803f);color:#15212a;border:1px solid #c9a663;border-radius:.6cqmin;padding:.5cqmin 1cqmin;cursor:pointer;}button:disabled{filter:brightness(.6);cursor:default;}.return-temple{position:absolute;right:2%;top:2%;font-size:2cqmin;}
</style>
