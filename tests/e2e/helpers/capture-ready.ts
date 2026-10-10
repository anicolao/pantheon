/** Runs in the browser: a paused checkpoint may retain only its own moving piles. */
export function captureReady({status,checkpoint=false}:{status?:string;checkpoint?:boolean}):boolean {
  if(status!==undefined){
    const scenes=document.querySelectorAll('[data-status]');
    if(!(scenes.length===1&&scenes[0].getAttribute('data-status')===status))return false;
  }
  const pausedFlights=checkpoint?[...document.querySelectorAll<HTMLElement>('.public-flight')].filter(flight=>
    flight.getAnimations({subtree:true}).some(animation=>animation.playState==='paused')
  ):[];
  return [...document.querySelectorAll('[aria-busy="true"]')].every(node=>{
    if(!checkpoint || !node.matches('.resource-icon[data-count-pending="true"]'))return false;
    const pile=node.closest<HTMLElement>('[data-public-zone][data-public-uid]');
    if(!pile || !['deck','discard'].includes(pile.dataset.publicZone!))return false;
    return pausedFlights.some(flight=>
      (flight.dataset.motionFromZone===pile.dataset.publicZone && flight.dataset.motionFromUid===pile.dataset.publicUid) ||
      (flight.dataset.motionToZone===pile.dataset.publicZone && flight.dataset.motionToUid===pile.dataset.publicUid)
    );
  });
}
