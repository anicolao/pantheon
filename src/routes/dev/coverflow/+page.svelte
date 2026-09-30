<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import CardFace from '$lib/components/CardFace.svelte';
  import { coverflowLayout } from '$lib/components/play/coverflow-layout';
  import { setupSupply } from '$lib/game/setup';
  import { definition } from '$lib/game/actions';

  const cards = setupSupply(2).map(pile => definition(pile.id)).sort((a,b) => (a.cost ?? 0)-(b.cost ?? 0) || a.id.localeCompare(b.id));
  let width = $state(1000), faces = $state(1), coins = $state(4), angle = $state(65), spacing = $state(80), duration = $state(520);
  const initialEdge = cards.findLastIndex(card => (card.cost ?? 0) <= 4);
  let target = $state(initialEdge);
  let position = $state(initialEdge), dragging = $state(false), demo = $state(false), reduced = $state(false);
  let message = $state('Click a stacked card to bring it forward. Click a face-up card to try a purchase.');
  const cardWidth = $derived(Math.min(230, Math.max(54, (width-32)/(faces+2.8))));
  const stride = $derived(cardWidth*1.055);
  const layout = $derived(coverflowLayout(cards.length,position,width,cardWidth,faces,angle,spacing));
  const affordable = $derived(cards.findLastIndex(card => (card.cost ?? 0) <= coins));
  const clamp = (value:number) => Math.max(0,Math.min(cards.length-1,value));
  function move(value:number) { demo=false;target=clamp(value); }
  function affordableEdge() { move(affordable);message=faces===1?'The most expensive affordable card moves to the center.':'The most expensive affordable card moves to the right face-up edge.'; }
  function pose(index:number) { return layout[index].transform; }
  function isFlat(index:number) { return index>=target-faces+1 && index<=target; }
  function select(index:number) {
    if(!isFlat(index)) { move(index);return; }
    message=(cards[index].cost ?? 0)<=coins ? `Preview purchase: ${cards[index].name}. No game is changed.` : `${cards[index].name} costs ${cards[index].cost} Coins; the preview wallet has ${coins}.`;
  }
  let pointerId:number|undefined, startX=0, startPosition=0, moved=false, lastWheel=0;
  function pointerDown(event:PointerEvent) {
    if(event.button!==0)return;
    demo=false;pointerId=event.pointerId;startX=event.clientX;startPosition=position;moved=false;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }
  function pointerMove(event:PointerEvent) {
    if(event.pointerId!==pointerId)return;
    const distance=event.clientX-startX;
    if(Math.abs(distance)>5)moved=true;
    if(moved){dragging=true;position=clamp(startPosition-distance/stride);target=position;}
  }
  function pointerUp(event:PointerEvent) {
    if(event.pointerId!==pointerId)return;
    pointerId=undefined;dragging=false;target=clamp(Math.round(position));
    // Pointer capture retargets clicks to the stage. Resolve a tap geometrically.
    if(!moved && event.type!=='pointercancel') {
      const button=document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLButtonElement>('[data-coverflow-index]');
      if(button)select(Number(button.dataset.coverflowIndex));
    }
  }
  function wheel(event:WheelEvent) {
    event.preventDefault();
    if(Math.abs(event.deltaX)+Math.abs(event.deltaY)<4 || performance.now()-lastWheel<110)return;
    lastWheel=performance.now();move(Math.round(target)+Math.sign(event.deltaX || event.deltaY));
  }
  function key(event:KeyboardEvent) {
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();move(event.key==='Home'?0:event.key==='End'?cards.length-1:Math.round(target)+(event.key==='ArrowRight'?1:-1));
  }
  onMount(()=>{
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const preference=()=>{reduced=media.matches;};preference();media.addEventListener('change',preference);
    let frame=0, previous=performance.now(), nextDemo=0, direction=1;
    function animate(now:number) {
      const elapsed=Math.min(50,now-previous);previous=now;
      if(demo && now>=nextDemo){if(target>=cards.length-1)direction=-1;else if(target<=0)direction=1;target=clamp(Math.round(target)+direction);nextDemo=now+duration+600;}
      if(!dragging) {
        const distance=target-position;
        position=reduced || Math.abs(distance)<.0005?target:position+distance*(1-Math.exp(-elapsed/(duration/5)));
      }
      frame=requestAnimationFrame(animate);
    }
    frame=requestAnimationFrame(animate);
    return()=>{cancelAnimationFrame(frame);media.removeEventListener('change',preference);};
  });
</script>

<svelte:head><title>Coverflow motion prototype · Pantheon</title></svelte:head>

<main style={`--card-width:${cardWidth}px;--stage-height:${cardWidth*1.65}px;background-image:linear-gradient(#06101bd9,#06101bb8),url('${base}/assets/ui/table-desktop.webp')`}>
  <header><span class="eyebrow">Pantheon · motion prototype</span><h1>One center card. Open stacks on both sides.</h1><p>Drag slowly to watch the stack unfold. Swipe, scroll, or use the arrow keys.</p></header>
  <div class="toolbar">
    <label>Coins <input type="range" min="0" max="8" step="1" bind:value={coins} oninput={()=>{requestAnimationFrame(affordableEdge);}}/><output>{coins}</output></label>
    <button onclick={affordableEdge}>Show affordable edge</button>
    <button class:playing={demo} onclick={()=>{demo=!demo;}}>{demo?'Stop demo':'Play demo'}</button>
  </div>
  <section class="stage" bind:clientWidth={width} aria-label="Supply coverflow prototype" onwheel={wheel} onpointerdown={pointerDown} onpointermove={pointerMove} onpointerup={pointerUp} onpointercancel={pointerUp} style:cursor={dragging?'grabbing':'grab'}>
    {#each cards as card,index (card.id)}
      <button onkeydown={key} class="card-position" class:unaffordable={(card.cost ?? 0)>coins} class:flat={isFlat(index)} data-coverflow-index={index} aria-label={`${isFlat(index)?'Preview buying':'Bring forward'} ${card.name}, ${card.cost} Coins`} style:transform={pose(index)} style:z-index={1000-Math.round(Math.abs(index-(position-(faces-1)/2))*20)} onclick={event=>{if(event.detail===0)select(index);}}>
        <div class="face"><CardFace {card}/></div>
        <span class="caption" style:opacity={Math.max(0,1-Math.max(0,(position-faces+1)-index,index-position))}>{card.name} · {card.cost} Coins</span>
      </button>
    {/each}
  </section>
  <nav aria-label="Browse supply">
    <button aria-label="Cheaper cards" disabled={target<=0} onclick={()=>move(Math.round(target)-1)}>←</button>
    <span>{cards[Math.round(target)].name}<small>{faces===1?'Centered card':'Right face-up edge'} · {Math.round(target)+1} / {cards.length}</small></span>
    <button aria-label="More expensive cards" disabled={target>=cards.length-1} onclick={()=>move(Math.round(target)+1)}>→</button>
  </nav>
  <p class="message" role="status">{message}</p>
  <fieldset><legend>Try the motion</legend>
    <label>Face-up cards <select bind:value={faces}><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option></select></label>
    <label>Nearest card angle <input type="range" min="50" max="90" bind:value={angle}/><output>{angle}°</output></label>
    <label>Center spacing <input type="range" min="50" max="110" step="1" bind:value={spacing}/><output>{spacing}%</output></label>
    <label>Glide <input type="range" min="200" max="1100" step="50" bind:value={duration}/><output>{duration} ms</output></label>
  </fieldset>
  {#if reduced}<p class="note">Your reduced-motion preference is enabled; movement snaps to its destination.</p>{/if}
  <p class="note">All {cards.length} cards remain mounted. Only their position and angle change. This prototype does not buy cards in a game.</p>
</main>

<style>
  main{min-height:100svh;padding:28px 0 24px;color:#f6e7c3;background-size:cover;background-position:center;background-attachment:fixed;overflow:hidden;}
  header{text-align:center;padding:0 20px;}h1{font:600 clamp(27px,3.4vw,48px)/1.12 'Cormorant Garamond',serif;margin:10px 0;}p{line-height:1.5;}header p{color:#c7c9c5;margin:10px 0 22px;}.eyebrow{text-transform:uppercase;letter-spacing:.2em;font-size:11px;color:#dfbc77;}
  button,select{border:1px solid #a78a50;background:#0c2131;color:#f7e5b8;border-radius:9px;padding:9px 14px;min-height:44px;}button:hover{background:#17394c;}button:disabled{opacity:.35;cursor:default;}.toolbar{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:12px;padding:0 16px;}label{display:flex;align-items:center;gap:10px;}input{accent-color:#e9bb65;max-width:130px;}output{font-variant-numeric:tabular-nums;min-width:30px;}.playing{border-color:#f6d28a;background:#27442f;}
  .stage{position:relative;width:100%;height:var(--stage-height);margin-top:28px;perspective:1400px;touch-action:pan-y;user-select:none;outline-offset:-4px;}
  .card-position{position:absolute;left:calc(50% - var(--card-width)/2);top:8px;width:var(--card-width);height:calc(var(--card-width)*1.4);border:0;padding:0;background:none;border-radius:0;transform-origin:center center;will-change:transform;backface-visibility:hidden;}
  .card-position:hover{background:none;}.face{pointer-events:none;width:100%;filter:drop-shadow(0 7px 8px #0009);}.unaffordable .face{filter:saturate(.68) brightness(.82) drop-shadow(0 7px 8px #0009);}.card-position.flat:hover .face{filter:brightness(1.1) drop-shadow(0 0 8px #dba94780);}.card-position:focus-visible{outline:2px solid #fce2a3;outline-offset:3px;}
  .caption{position:absolute;top:calc(100% + 9px);left:-10%;width:120%;font-size:clamp(10px,1vw,14px);white-space:nowrap;pointer-events:none;text-shadow:0 2px 5px #000;}
  nav{display:flex;justify-content:center;align-items:center;gap:22px;margin:18px 12px 0;}nav button{font-size:24px;width:52px;}nav span{min-width:190px;text-align:center;font:600 25px 'Cormorant Garamond',serif;}nav small{display:block;margin-top:4px;font:12px 'Atkinson Hyperlegible',sans-serif;color:#c1c6c7;}
  .message{text-align:center;min-height:44px;max-width:700px;margin:18px auto;padding:0 20px;font-size:14px;}
  fieldset{display:flex;justify-content:center;flex-wrap:wrap;gap:18px 30px;border:1px solid #9b814747;border-radius:12px;max-width:850px;margin:24px auto 0;padding:18px;background:#06111bbd;}legend{padding:0 10px;color:#daba7b;}fieldset label{font-size:13px;}.note{font-size:12px;color:#aab7be;text-align:center;padding:0 18px;margin:15px auto 0;max-width:800px;}
  @media(max-width:600px){main{padding-top:20px;}.toolbar{gap:8px;}.toolbar button{font-size:12px;}.stage{margin-top:36px;margin-bottom:30px;perspective:900px;}header p{font-size:13px;}fieldset{margin:20px 14px 0;gap:14px;}nav span{min-width:170px;font-size:22px;}.message{font-size:13px;}}
</style>
