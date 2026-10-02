import type { CardInstance } from '$lib/game/setup';

export type Pose = { node: HTMLElement; x: number; y: number; width: number; angle: number; stack: number; transform: string; key?: string; zone?: string; uid?: string; card?: string; face?: CardInstance; pile?: string };
export type Layout = { poses: Pose[]; width: number };

export function measureLayout(): Layout {
    const poses=[...document.querySelectorAll<HTMLElement>('[data-motion-key], [data-public-zone], [data-motion-pile]')]
      .filter(node=>node.checkVisibility({visibilityProperty:true})&&node.getBoundingClientRect().width>0)
      .map(node=>{
        const face=node.querySelector<HTMLElement>('.hand-face, .outcome-card')??node;
        const box=face.getBoundingClientRect(),transform=getComputedStyle(face).transform;
        const matrix=new DOMMatrixReadOnly(transform==='none'?undefined:transform);
        return {node,x:box.left+box.width/2,y:box.top+box.height/2,width:face.offsetWidth,angle:Math.atan2(matrix.b,matrix.a)*180/Math.PI,transform,
          face:node.dataset.motionFace&&node.dataset.motionCard?{id:node.dataset.motionCard,cardId:node.dataset.motionFace,copy:Number(node.dataset.motionCopy??1)}:undefined,
          stack:Number.parseInt(getComputedStyle(node).zIndex)||0,
          key:node.dataset.motionKey,zone:node.dataset.motionZone??node.dataset.publicZone,
          uid:node.dataset.motionUid??node.dataset.publicUid,card:node.dataset.motionCard,pile:node.dataset.motionPile??node.dataset.publicCard};
      });
    return {poses,width:document.querySelector<HTMLElement>('.table-card-measure')?.getBoundingClientRect().width||100};
  }
