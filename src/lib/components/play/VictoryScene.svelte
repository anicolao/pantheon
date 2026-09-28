<script lang="ts">
  import DialogFrame from "$lib/components/DialogFrame.svelte";
  import { onMount, tick, untrack } from 'svelte';
  import { base } from '$app/paths';
  import type { SetupState } from '$lib/game/setup';
  import { standings, definition } from '$lib/game/actions';
  import CardFace from '../CardFace.svelte';
  import ResourceIcon from '../ResourceIcon.svelte';
  import GameButton from '../GameButton.svelte';
  let { game, uid, busy, status, error, again, retry, close, chronicle }: { game:SetupState; uid:string; busy:boolean; status:string; error:string; again:()=>void; retry:()=>void; close:()=>void; chronicle:()=>void }=$props();
  const scores=$derived(standings(game));
  const winners=$derived(scores.filter(row=>row.winner));
  const tiedScore=$derived(scores.filter(row=>row.score===scores[0].score).length>1);
  let selected=$state(untrack(()=>uid));
  const row=$derived(scores.find(row=>row.uid===selected)!);
  let dialog=$state<HTMLDialogElement>(),detail=$state<HTMLDialogElement>(),inspected=$state<string>();
  let opener:HTMLElement|null=null;
  $effect(()=>{if(dialog&&!dialog.open)dialog.showModal();});
  onMount(()=>{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)dialog?.animate([{opacity:0},{opacity:1}],{duration:450,easing:'ease-out'});});
  async function inspect(id:string){opener=document.activeElement as HTMLElement;inspected=id;await tick();detail!.showModal();}
</script>
<dialog class="victory-scene" bind:this={dialog} aria-labelledby="victory-title" oncancel={event=>{event.preventDefault();close();}}>
  <picture class="environment" aria-hidden="true"><source media="(max-aspect-ratio:3/4)" srcset={`${base}/assets/ui/victory-mobile.webp`}/><img src={`${base}/assets/ui/victory-desktop.webp`} alt=""/></picture>
  <div class="victory-content" data-e2e-layout={inspected?undefined:true}>
    <header><h1 id="victory-title" class:long={winners.length===1&&winners[0].name.length>14}>{winners.length===1?`${winners[0].name} wins`:'Shared victory'}</h1><p>{winners.length>1?'Equal glory. Equal turns.':tiedScore?'Fewer turns wins.':'Glory endures.'}</p></header>
    <section class="standings" class:many={scores.length>2} aria-label="Final scores" style:--players={scores.length}>
      {#each scores as score}
        <button class="standing" class:winner={score.winner} aria-label={`Show ${score.name}'s score: ${score.score} VP, ${score.turns} turns${score.winner?', victor':''}`} aria-pressed={selected===score.uid} onclick={()=>selected=score.uid}>
          <div class="portrait"><img class="hero" src={`${base}/assets/cards/${game.leaders[score.uid]}.webp`} alt=""/><img class="frame" src={`${base}/assets/ui/victory-portrait-frame.webp`} alt=""/><span class="name" class:long={score.name.length>14}>{score.name}</span><span class="points"><ResourceIcon resource="victory" value={score.score}/></span></div>
          <span class="turns">{score.winner?'Victor · ':''}{score.turns} turns</span>
        </button>
      {/each}
    </section>
    <section class="breakdown" aria-label={`${row.name}'s Territory score`}>
      <h2>{row.name}’s victory points</h2>
      <div class="territories">{#each row.territories as territory}<div class="territory"><button aria-label={`Inspect ${definition(territory.id).name}`} onclick={()=>inspect(territory.id)}><CardFace card={definition(territory.id)} players={game.playerCount}/></button><p aria-label={`${territory.count} ${definition(territory.id).name}, ${territory.count*definition(territory.id).vp!} VP`}>{territory.count} × {definition(territory.id).vp} = <strong>{territory.count*definition(territory.id).vp!}</strong></p></div>{/each}</div>
      <p class="total">Total <strong>{row.score} VP</strong></p>
    </section>
    <p class="end-reason">{game.supply.acropolis===0?'Acropolis pile depleted':`${Object.values(game.supply).filter(count=>count===0).length} supply piles depleted`}</p>
    <footer><div><GameButton primary disabled={busy||status!=='synced'} onclick={again}>{busy?'Gathering…':'Play again'}</GameButton></div><div><GameButton onclick={chronicle}>View chronicle</GameButton></div><button class="table-return" onclick={close}>Return to table</button></footer>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    {#if status!=='synced'}<div class="reconnect"><p>Connection lost. Your result is kept.</p><GameButton onclick={retry}>Try again</GameButton></div>{/if}
  </div>
</dialog>
<dialog class="detail framed-dialog" bind:this={detail} aria-label="Territory details" data-e2e-layout={inspected?true:undefined} onclose={()=>{inspected=undefined;opener?.focus();}}><DialogFrame />{#if inspected}<h2>{definition(inspected).name}</h2><div class="card"><CardFace card={definition(inspected)} players={game.playerCount}/></div><button onclick={()=>detail!.close()}>Return to scores</button>{/if}</dialog>
<style>
  .victory-scene{position:fixed;inset:0;width:100vw;height:100svh;max-width:none;max-height:none;padding:0;margin:0;border:0;overflow:clip;background:#091525;color:#ffe5ad;isolation:isolate;}.environment{position:absolute;inset:0;z-index:-1;}.environment img{width:100%;height:100%;object-fit:cover;}.victory-content{width:100%;height:100%;position:relative;}button{cursor:pointer;color:inherit;}button:focus-visible{outline:3px solid #ffdc84;outline-offset:4px;}header{position:absolute;top:3%;left:8%;width:84%;text-align:center;text-shadow:0 3px 6px #000;}h1{font:600 clamp(32px,6svh,120px)/1.05 'Cormorant Garamond',serif;margin:0;}h1.long{font-size:clamp(30px,4.5svh,90px);}header p{font:600 clamp(16px,2.2svh,42px) 'Cormorant Garamond',serif;margin:8px 0;letter-spacing:.14em;}
  .standings{position:absolute;top:17%;left:8%;width:84%;height:33%;display:flex;justify-content:center;align-items:center;gap:4%;}.standing{width:min(40%,46svh);background:none;border:0;padding:0;filter:drop-shadow(0 3px 7px #000);}.standings.many .standing{width:calc(90% / var(--players));}.portrait{position:relative;aspect-ratio:3/2;}.hero{position:absolute;left:10%;top:11%;width:80%;height:66%;object-fit:cover;object-position:50% 25%;}.frame{position:absolute;inset:0;width:100%;height:100%;}.name{position:absolute;left:15%;width:70%;top:79%;height:10%;display:grid;place-items:center;color:#36230d;font:700 clamp(18px,2.4svh,50px)/1 'Cormorant Garamond',serif;}.name.long{font-size:clamp(14px,1.8svh,36px);}.points{position:absolute;right:3%;top:9%;--icon-size:clamp(30px,4svh,88px);--icon-number-scale:.8;}.turns{display:block;margin-top:2px;font:600 clamp(14px,2svh,38px) 'Cormorant Garamond',serif;background:#091525dc;border-radius:8px;padding:4px;}.winner .frame{filter:drop-shadow(0 0 8px #f6c56c);}.standing[aria-pressed=true] .turns{border-bottom:2px solid #ffdf85;}
  .breakdown{position:absolute;top:54%;left:24%;width:58%;height:31%;padding:12px 20px;background:#081725eb;border:2px solid #ba965b;box-shadow:inset 0 0 0 4px #253447,0 4px 18px #000a;text-align:center;}.breakdown h2{font:600 clamp(18px,2.4svh,48px)/1 'Cormorant Garamond',serif;margin:0 0 8px;}.territories{display:flex;justify-content:center;gap:7%;}.territory{width:min(22%,14svh);}.territory button{display:block;width:100%;padding:0;border:0;background:none;}.territory p{margin:5px 0;font:600 clamp(14px,2svh,38px)/1 'Cormorant Garamond',serif;}.total{margin:6px 0 0;font:600 clamp(18px,2.4svh,48px)/1 'Cormorant Garamond',serif;}.total strong{margin-left:10px;}.end-reason{position:absolute;left:4%;width:17%;top:61%;margin:0;background:#081725e8;border-block:1px solid #ba965b;padding:16px;text-align:center;font:600 clamp(20px,3svh,56px)/1.2 'Cormorant Garamond',serif;}
  footer{position:absolute;left:17%;width:73%;bottom:3%;display:flex;align-items:center;justify-content:center;gap:3%;--control-height:clamp(48px,7svh,144px);--control-font:clamp(22px,3svh,60px);}footer>div{width:34%;}.table-return{background:#091525cc;border:1px solid #b79655;border-radius:8px;min-height:44px;padding:8px 14px;font:600 clamp(16px,2svh,40px) 'Cormorant Garamond',serif;}.error{position:absolute;bottom:12%;left:10%;width:80%;padding:8px;background:#512718;text-align:center;}.reconnect{position:absolute;inset:0;display:grid;align-content:center;justify-items:center;gap:20px;background:#081725ed;z-index:5;}.reconnect p{font-size:clamp(20px,3svh,50px);}.reconnect :global(button){width:min(70vw,420px);}
  .detail{background:#081725;color:#ffe5ad;border:2px solid #ba965b;border-radius:16px;text-align:center;max-height:96svh;padding:20px;}.detail::backdrop{background:#020811cc;}.detail h2{margin:0 0 16px;font:600 28px 'Cormorant Garamond',serif;}.detail .card{width:min(65vw,40svh);margin:auto;}.detail>button{min-height:44px;padding:8px 20px;margin-top:16px;background:#173447;border:1px solid #ba965b;border-radius:8px;}
  @media(max-aspect-ratio:3/4){header{top:2%;left:4%;width:92%;}h1{font-size:34px;}h1.long{font-size:27px;}header p{font-size:15px;letter-spacing:.05em;margin:4px 0;}.standings{top:12%;left:4%;width:92%;height:38%;flex-direction:column;gap:4px;}.standing{width:min(60vw,25svh);}.name{font-size:17px;}.name.long{font-size:12px;}.turns{font-size:13px;padding:2px;}.points{--icon-size:25px;}.standings.many{display:grid;grid-template-columns:1fr 1fr;gap:8px;align-content:center;justify-items:center;}.standings.many .standing{width:100%;}.standings.many .name{font-size:15px;}.standings.many .name.long{font-size:10px;}.standings.many .points{--icon-size:20px;}.breakdown{top:52%;left:5%;width:90%;height:27%;padding:10px 8px;}.breakdown h2{font-size:20px;}.territories{gap:5%;}.territory{width:min(27%,10svh);}.territory p{font-size:16px;margin:5px 0;}.total{font-size:21px;margin-top:6px;}.end-reason{left:5%;width:90%;top:80%;padding:4px;font-size:16px;}footer{left:10%;width:80%;bottom:.5%;flex-wrap:wrap;gap:2px;--control-height:44px;--control-font:22px;}footer>div{width:100%;}.table-return{min-height:44px;font-size:15px;padding:4px 12px;border:0;background:#091525bd;}.error{bottom:17%;font-size:13px;}}
</style>
