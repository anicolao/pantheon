/** Shared geometry for the motion prototype and the live table. */
export function coverflowLayout(count:number, position:number, width:number, cardWidth:number, faces=1, angle=65, spacing=80, perspective=1400) {
  const stride=cardWidth*1.055, half=cardWidth/2, flatEdge=(faces-1)*stride/2;
  const radians=angle*Math.PI/180;
  // Perspective pulls a folded card toward the viewport center. With several
  // flat cards, a fixed world-space offset therefore eats the inner gap.
  // Solve for the folded face's projected INNER edge, keeping the single-card
  // spacing on screen regardless of the width of the face-up group.
  const innerScale=(perspective+cardWidth*.24+half*Math.sin(radians))/perspective;
  const gap=Math.max(cardWidth*.045,(cardWidth*spacing/100-half*Math.cos(radians))/innerScale-half);
  const leadOffset=(flatEdge+half+gap)*innerScale+half*Math.cos(radians)-flatEdge;
  // Spread each side across its available viewport half. Account for perspective
  // at the outermost (90-degree) face so its visible edge keeps an 8px gutter.
  const edge=(width/2-8)*(perspective-cardWidth*.26)/perspective;
  const span=Math.max(0,edge-flatEdge-leadOffset);
  const foldedOffset=(distance:number,extent:number)=>{
    const maximum=Math.max(1,extent-1),depth=Math.min(maximum,Math.max(0,distance-1));
    // Restore the open, graduated fan. Only limit individual steps when a wide
    // viewport would stretch them excessively; never push the stack outward.
    const offset=(value:number)=>span*(.5*(1-Math.exp(-value/1.8))/(1-Math.exp(-maximum/1.8))+.5*value/maximum);
    let spread=0;
    for(let step=0;step<depth;step++){
      const next=Math.min(step+1,depth);
      spread+=Math.min(offset(next)-offset(step),cardWidth*.6*(next-step));
    }
    return leadOffset*Math.min(1,distance)+spread;
  };
  const stackAngle=(distance:number,extent:number)=>{
    const ramp=Math.min(1,Math.max(0,distance-1)/Math.max(1,extent-1));
    return (angle+(90-angle)*ramp)*Math.min(1,distance);
  };
  const middle=position-(faces-1)/2;
  const cards=Array.from({length:count},(_,index)=>{
    const relative=index-(position-faces+1),left=-(faces-1)*stride/2,right=-left;
    let x=left+relative*stride,rotation=0,depth=0;
    if(relative<0){const fold=Math.min(1,-relative);x=left-foldedOffset(-relative,position-faces+1);rotation=stackAngle(-relative,position-faces+1);depth=-cardWidth*.24*fold;}
    else if(relative>faces-1){const distance=relative-faces+1,fold=Math.min(1,distance);x=right+foldedOffset(distance,count-1-position);rotation=-stackAngle(distance,count-1-position);depth=-cardWidth*.24*fold;}
    const radians=rotation*Math.PI/180;
    const projected=[-cardWidth/2,cardWidth/2].map(corner=>(x+corner*Math.cos(radians))*perspective/(perspective-depth+corner*Math.sin(radians))+width/2);
    return {index,transform:`translate3d(${x}px,0,${depth}px) rotateY(${rotation}deg)`,left:Math.min(...projected),right:Math.max(...projected),z:1000-Math.round(Math.abs(index-middle)*20)};
  });
  // Hit strips follow the exposed portion of each card, like the hand fan.
  // Leave a small gap between strips so independent CSS layout rounding cannot
  // turn touching edges into overlapping controls. Faces remain purely visual.
  return cards.map(card=>{
    const closer=cards.filter(other=>other.z>card.z);
    const left=card.index>middle?Math.max(card.left,...closer.filter(other=>other.index<card.index).map(other=>other.right)):card.left;
    const right=card.index<middle?Math.min(card.right,...closer.filter(other=>other.index>card.index).map(other=>other.left)):card.right;
    return {...card,hitLeft:Math.max(0,left),hitWidth:Math.max(0,(right-left)-Math.min(.5,(right-left)/4))};
  });
}
