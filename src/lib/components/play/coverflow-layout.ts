/** Shared geometry for the motion prototype and the live table. */
export function coverflowLayout(count:number, position:number, width:number, cardWidth:number, faces=1, angle=65, spacing=80, perspective=1400) {
  const stride=cardWidth*1.055, leadOffset=cardWidth*spacing/100;
  const span=Math.max(0,Math.min(cardWidth*2.1,width/2-16-(faces-1)*stride/2-leadOffset-cardWidth*.5*Math.cos(angle*Math.PI/180)));
  const stackOffset=(distance:number)=>{
    const maximum=Math.max(1,count-2),depth=Math.min(maximum,Math.max(0,distance));
    return span*(.5*(1-Math.exp(-depth/1.8))/(1-Math.exp(-maximum/1.8))+.5*depth/maximum);
  };
  const stackAngle=(distance:number,extent:number)=>{
    const ramp=Math.min(1,Math.max(0,distance-1)/Math.max(1,extent-1));
    return (angle+(90-angle)*ramp)*Math.min(1,distance);
  };
  const middle=position-(faces-1)/2;
  const cards=Array.from({length:count},(_,index)=>{
    const relative=index-(position-faces+1),left=-(faces-1)*stride/2,right=-left;
    let x=left+relative*stride,rotation=0,depth=0;
    if(relative<0){const fold=Math.min(1,-relative);x=left-leadOffset*fold-stackOffset(-relative-1);rotation=stackAngle(-relative,position-faces+1);depth=-cardWidth*.24*fold;}
    else if(relative>faces-1){const distance=relative-faces+1,fold=Math.min(1,distance);x=right+leadOffset*fold+stackOffset(distance-1);rotation=-stackAngle(distance,count-1-position);depth=-cardWidth*.24*fold;}
    const radians=rotation*Math.PI/180;
    const projected=[-cardWidth/2,cardWidth/2].map(corner=>(x+corner*Math.cos(radians))*perspective/(perspective-depth+corner*Math.sin(radians))+width/2);
    return {index,transform:`translate3d(${x}px,0,${depth}px) rotateY(${rotation}deg)`,left:Math.min(...projected),right:Math.max(...projected),z:1000-Math.round(Math.abs(index-middle)*20)};
  });
  // Hit strips follow the exposed portion of each card, like the hand fan.
  // They never overlap; the transformed faces remain purely visual.
  return cards.map(card=>{
    const closer=cards.filter(other=>other.z>card.z);
    const left=card.index>middle?Math.max(card.left,...closer.filter(other=>other.index<card.index).map(other=>other.right)):card.left;
    const right=card.index<middle?Math.min(card.right,...closer.filter(other=>other.index>card.index).map(other=>other.left)):card.right;
    return {...card,hitLeft:Math.max(0,left),hitWidth:Math.max(0,right-left)};
  });
}
