/** Runs inside the page: audit components, text lines and every clipping ancestor. */
export function assertScreenFit(options: {document?:boolean} = {}) {
  const modal = [...document.querySelectorAll<HTMLElement>('dialog:modal')].at(-1);
  // Native modality makes the document behind a popup inert. Audit its active
  // surface, including vertical viewport fit, even on a scrolling document page.
  const roots = options.document ? [modal ?? document.body] : [...document.querySelectorAll<HTMLElement>('[data-e2e-layout]')].filter(root => root.checkVisibility({visibilityProperty:true}) && (!modal || modal.contains(root)));
  if (!roots.length) throw new Error('No visible layout root to audit');
  const elements = [...new Set(roots.flatMap(root => [root, ...root.querySelectorAll<HTMLElement>('*')]))];
  const styles = new Map<Element, CSSStyleDeclaration>();
  const style = (element: Element) => { if (!styles.has(element)) styles.set(element, getComputedStyle(element)); return styles.get(element)!; };
  const label = (element: Element) => `${element.tagName.toLowerCase()}.${element.className} (${element.getAttribute('aria-label') ?? element.textContent?.trim().slice(0,60) ?? ''})`;
  const viewport = {left:0, top:0, right:innerWidth, bottom:innerHeight};
  const outside = (rect:DOMRect, box:{left:number;top:number;right:number;bottom:number}, x=true,y=true) =>
    (x && (rect.left<box.left || rect.right>box.right)) || (y && (rect.top<box.top || rect.bottom>box.bottom));
  const inspect = (element:HTMLElement, rect:DOMRect, text=false) => {
    if (!rect.width || !rect.height) return;
    if (outside(rect,viewport,true,!options.document || !!modal)) throw new Error(`${text?'Text':'Component'} clipped by viewport: ${label(element)}`);
    for(let ancestor:HTMLElement|null=text?element:element.parentElement;ancestor;ancestor=ancestor.parentElement){
      const css=style(ancestor), x=/^(hidden|clip|auto|scroll)$/.test(css.overflowX), y=/^(hidden|clip|auto|scroll)$/.test(css.overflowY);
      if(!x&&!y)continue;
      const box=ancestor.getBoundingClientRect();
      // Only transforms scale borders; rounded offset dimensions must not.
      let matrix=new DOMMatrix();
      for(let parent:HTMLElement|null=ancestor;parent;parent=parent.parentElement){
        const transform=style(parent).transform;
        if(transform!=='none')matrix=new DOMMatrix(transform).multiply(matrix);
      }
      const sx=Math.hypot(matrix.a,matrix.b),sy=Math.hypot(matrix.c,matrix.d);
      // clientWidth/clientHeight round fractional CSS pixels. Use the actual
      // border edges so a fitting fractional-width child isn't called clipped.
      const left=parseFloat(css.borderLeftWidth)||0,right=parseFloat(css.borderRightWidth)||0,top=parseFloat(css.borderTopWidth)||0,bottom=parseFloat(css.borderBottomWidth)||0;
      const scrollbarX=Math.max(0,ancestor.offsetWidth-ancestor.clientWidth-left-right),scrollbarY=Math.max(0,ancestor.offsetHeight-ancestor.clientHeight-top-bottom);
      const clip={left:box.left+left*sx,top:box.top+top*sy,right:box.right-(right+scrollbarX)*sx,bottom:box.bottom-(bottom+scrollbarY)*sy};
      if(outside(rect,clip,x,y))throw new Error(`${text?'Text':'Component'} clipped by ${label(ancestor)}: ${label(element)}`);
    }
  };
  if(document.documentElement.scrollWidth>innerWidth||(!options.document&&(document.documentElement.scrollHeight>innerHeight||scrollX||scrollY)))throw new Error('Game screen must fit without page scrolling');
  const controls:HTMLElement[]=[];
  for(const element of elements){
    if(element.closest('.sr-only,#svelte-announcer,[hidden],[aria-hidden="true"]')||!element.checkVisibility({visibilityProperty:true})||element.matches('img[alt=""],.skip-link:not(:focus)'))continue;
    inspect(element,element.getBoundingClientRect());
    if(element.dataset.layoutState==='overflow')throw new Error(`Card content overflow (${element.dataset.cardId}, width ${element.getBoundingClientRect().width}): ${element.dataset.layoutIssues}`);
    for(const node of element.childNodes){
      if(node.nodeType!==Node.TEXT_NODE||!node.textContent?.trim())continue;
      const range=document.createRange();range.selectNodeContents(node);
      for(const rect of range.getClientRects())inspect(element,rect,true);
    }
    if(element.matches('button,input,select,a')&&!element.closest('[inert]')&&element.getBoundingClientRect().width)controls.push(element);
  }
  // A pinned document navigation deliberately covers scrolled content. Compare
  // the remaining on-screen hit regions; game views still compare whole controls.
  const pinned=options.document?[...document.querySelectorAll<HTMLElement>('.sticky-nav')].filter(node=>node.checkVisibility({visibilityProperty:true})&&/^(sticky|fixed)$/.test(style(node).position)).map(node=>node.getBoundingClientRect()).filter(rect=>rect.top<=0&&rect.bottom>0):[];
  const hitRegion=(element:HTMLElement)=>{
    const rect=element.getBoundingClientRect();
    if(!options.document || modal)return rect;
    const top=Math.max(0,rect.top,...(element.closest('.sticky-nav')?[]:pinned.map(header=>header.bottom)));
    return {left:Math.max(0,rect.left),right:Math.min(innerWidth,rect.right),top,bottom:Math.min(innerHeight,rect.bottom)};
  };
  for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){
    const a=hitRegion(controls[i]),b=hitRegion(controls[j]);
    if(Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top))throw new Error(`Controls overlap: ${label(controls[i])} / ${label(controls[j])}`);
  }
}
