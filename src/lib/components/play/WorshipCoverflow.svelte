<script lang="ts">
  import { onDestroy, tick, untrack } from 'svelte';
  import type { SetupState } from '$lib/game/setup';
  import { definition, worshipReason } from '$lib/game/actions';
  import WorshipFace from './WorshipFace.svelte';
  import { motionDuration, MOTION_EASING } from './motion';
  let { game, uid, events, hidden, disabled=false, open }: { game:SetupState;uid:string;events:string[];hidden?:string;disabled?:boolean;open:(id:string)=>void }=$props();
  let focused=$state(0),width=$state(300),height=$state(500);
  const lastAvailable=$derived(events.findLastIndex(id=>!worshipReason(game,uid,id)));
  $effect(()=>{
    if(disabled)return;
    const next=lastAvailable;
    if(next>=0)untrack(()=>center(next));
    else focused=Math.max(0,Math.min(events.length-1,untrack(()=>focused)));
  });
  const current=$derived(Math.min(focused,events.length-1));
  const cardHeight=$derived(width/1.4);
  const perspective=$derived(width*3);
  const layout=$derived.by(()=>{
    const count=events.length,padding=4,room=Math.max(0,height-padding*2);
    // Spend the available height on readable card faces before adding gaps.
    const allFlat=room>=count*cardHeight;
    // Only neighboring tilted cards share an edge. Keep the face-up card
    // fully exposed, with a small gap on either side.
    const sparePerCard=Math.max(0,(room-cardHeight)/Math.max(1,count-1));
    const overlap=Math.min(10,cardHeight*.035,sparePerCard*.2,Math.max(0,count*cardHeight-room)/(2*Math.max(1,count-1)));
    const gaps=Array.from({length:Math.max(0,count-1)},(_,index)=>allFlat
      ?(room-count*cardHeight)/Math.max(1,count-1)
      :index===current||index+1===current?Math.min(6,cardHeight*.025,sparePerCard*.15):-overlap);
    const foldedHeight=allFlat?cardHeight:Math.max(2,(room-cardHeight-gaps.reduce((sum,gap)=>sum+gap,0))/Math.max(1,count-1));
    let nextTop=padding;
    return events.map((_,index)=>{
      const targetHeight=index===current?cardHeight:foldedHeight;
      const top=nextTop,bottom=top+targetHeight;
      nextTop=bottom+(gaps[index]??0);
      const direction=-Math.sign(index-current),half=cardHeight/2;
      const projected=(angle:number)=>{
        const radians=direction*angle*Math.PI/180;
        const depth=cardHeight*.52*Math.sin(Math.abs(radians));
        const cosine=Math.cos(radians),sine=Math.sin(radians);
        // Solve the translation from the desired top edge, then fit the bottom
        // edge too. Perspective must not consume the space reclaimed by tilting.
        const y=(top-height/2)*(perspective+depth+half*sine)/perspective+half*cosine;
        const end=height/2+(y+half*cosine)*perspective/(perspective+depth-half*sine);
        return {y,depth,end};
      };
      let angle=0;
      if(direction && !allFlat){
        let low=0,high=89.9;
        for(let step=0;step<24;step++){
          const middle=(low+high)/2;
          if(projected(middle).end>bottom)low=middle;else high=middle;
        }
        angle=(low+high)/2;
      }
      const {y,depth,end}=projected(angle);
      return {transform:`translate3d(0,${y}px,${-depth}px) rotateX(${direction*angle}deg)`,top,bottom:end,z:100-Math.abs(index-current)};
    });
  });
  function hit(index:number){const card=layout[index],closer=layout.filter(other=>other.z>card.z);const top=index>current?Math.max(card.top,...closer.map(other=>other.bottom)):card.top;const bottom=index<current?Math.min(card.bottom,...closer.map(other=>other.top)):card.bottom;return {top:Math.max(0,top),height:Math.max(0,Math.min(height,bottom)-Math.max(0,top)-.5)};}
  let moving=$state(false),timer:ReturnType<typeof setTimeout>;
  onDestroy(()=>clearTimeout(timer));
  function center(index:number){if(disabled)return;const next=Math.max(0,Math.min(events.length-1,index));if(next===current)return;focused=next;clearTimeout(timer);moving=!matchMedia('(prefers-reduced-motion: reduce)').matches;if(moving)timer=setTimeout(()=>moving=false,motionDuration(350));}
  let lastWheel=0,startY:number|undefined,dragged=false;
  function wheel(event:WheelEvent){event.preventDefault();if(Math.abs(event.deltaY)<4||performance.now()-lastWheel<180)return;lastWheel=performance.now();center(current+Math.sign(event.deltaY));}
  function down(event:PointerEvent){if(event.button!==0)return;startY=event.clientY;dragged=false;}
  function up(event:PointerEvent){if(startY===undefined)return;const delta=event.clientY-startY;startY=undefined;if(Math.abs(delta)>24){dragged=true;center(current-Math.sign(delta));}}
  function key(event:KeyboardEvent){if(['ArrowUp','ArrowDown','Home','End'].includes(event.key)){event.preventDefault();const host=(event.currentTarget as HTMLElement).parentElement;center(event.key==='Home'?0:event.key==='End'?events.length-1:current+(event.key==='ArrowDown'?1:-1));const next=current;void tick().then(()=>host?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus());}}
</script>
<section class="worship-coverflow" aria-label="Shared god events" bind:clientWidth={width} bind:clientHeight={height} style:--perspective={`${perspective}px`} style:--card-height={`${cardHeight}px`} style:--duration={`${motionDuration(350)}ms`} style:--easing={MOTION_EASING} onwheel={wheel} onpointerdown={down} onpointermove={event=>{if(startY!==undefined&&Math.abs(event.clientY-startY)>10)dragged=true;}} onpointerup={up} onpointercancel={()=>{startY=undefined;dragged=true;}}>
  {#each events as id,index (id)}
    <div class="face" data-public-zone="altar" data-public-card={id} data-god-event={id} aria-hidden="true" style:visibility={hidden===id?'hidden':undefined} style:transform={layout[index].transform} style:z-index={layout[index].z}><WorshipFace {game} {uid} cardId={id} dimUnavailable/></div>
    <button data-face-up={index===current} style:visibility={hidden===id?'hidden':undefined} {disabled} style:top={`${hit(index).top}px`} style:height={`${hit(index).height}px`} aria-label={`${index===current?'Inspect':'Center'} ${definition(id).name}`} aria-describedby="worship-coverflow-help" onkeydown={key} onclick={()=>{if(dragged)return;if(index===current){if(!moving)open(id);}else center(index);}}></button>
  {/each}
  <span id="worship-coverflow-help" class="sr-only">Tap a tilted card to bring it forward, then tap it again to worship. Swipe, scroll, or use the up and down arrow keys to browse.</span>
</section>
<style>
  .worship-coverflow{position:relative;width:100%;height:100%;min-height:0;perspective:var(--perspective);touch-action:none;isolation:isolate;}
  .face{position:absolute;left:0;top:calc(50% - var(--card-height)/2);width:100%;pointer-events:none;backface-visibility:hidden;transition:transform var(--duration) var(--easing);}
  button{position:absolute;left:0;width:100%;padding:0;border:0;background:none;cursor:pointer;z-index:200;}
  button:focus-visible{outline:2px solid #ffe1a0;outline-offset:3px;border-radius:5%;}
  button:disabled{cursor:default;}
  .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
  @media(prefers-reduced-motion:reduce){.face{transition:none;}}
</style>
