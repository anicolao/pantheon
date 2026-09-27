/** Runs inside the page: audit components, text lines and every clipping ancestor. */
export function assertScreenFit(options: {document?:boolean} = {}) {
  const modal = [...document.querySelectorAll<HTMLElement>('dialog:modal')].at(-1);
  const roots = options.document ? [document.body] : [...document.querySelectorAll<HTMLElement>('[data-e2e-layout]')].filter(root => root.checkVisibility() && (!modal || modal.contains(root)));
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
    if (outside(rect,viewport,true,!options.document)) throw new Error(`${text?'Text':'Component'} clipped by viewport: ${label(element)}`);
    for(let ancestor:HTMLElement|null=text?element:element.parentElement;ancestor;ancestor=ancestor.parentElement){
      const css=style(ancestor), x=/^(hidden|clip|auto|scroll)$/.test(css.overflowX), y=/^(hidden|clip|auto|scroll)$/.test(css.overflowY);
      if(!x&&!y)continue;
      const box=ancestor.getBoundingClientRect(),sx=ancestor.offsetWidth?box.width/ancestor.offsetWidth:1,sy=ancestor.offsetHeight?box.height/ancestor.offsetHeight:1;
      const clip={left:box.left+ancestor.clientLeft*sx,top:box.top+ancestor.clientTop*sy,right:box.left+(ancestor.clientLeft+ancestor.clientWidth)*sx,bottom:box.top+(ancestor.clientTop+ancestor.clientHeight)*sy};
      if(outside(rect,clip,x,y))throw new Error(`${text?'Text':'Component'} clipped by ${label(ancestor)}: ${label(element)}`);
    }
  };
  if(document.documentElement.scrollWidth>innerWidth||(!options.document&&(document.documentElement.scrollHeight>innerHeight||scrollX||scrollY)))throw new Error('Game screen must fit without page scrolling');
  const controls:HTMLElement[]=[];
  for(const element of elements){
    if(element.closest('.sr-only,#svelte-announcer,[hidden],[aria-hidden="true"]')||!element.checkVisibility()||element.matches('img[alt=""],.skip-link:not(:focus)'))continue;
    inspect(element,element.getBoundingClientRect());
    if(element.dataset.layoutState==='overflow')throw new Error(`Card content overflow: ${element.dataset.layoutIssues}`);
    for(const node of element.childNodes){
      if(node.nodeType!==Node.TEXT_NODE||!node.textContent?.trim())continue;
      const range=document.createRange();range.selectNodeContents(node);
      for(const rect of range.getClientRects())inspect(element,rect,true);
    }
    if(element.matches('button,input,select,a')&&element.getBoundingClientRect().width)controls.push(element);
  }
  // A pinned document navigation deliberately covers scrolled content. Compare
  // the remaining on-screen hit regions; game views still compare whole controls.
  const pinned=options.document?[...document.querySelectorAll<HTMLElement>('.sticky-nav')].filter(node=>node.checkVisibility()&&/^(sticky|fixed)$/.test(style(node).position)).map(node=>node.getBoundingClientRect()).filter(rect=>rect.top<=0&&rect.bottom>0):[];
  const hitRegion=(element:HTMLElement)=>{
    const rect=element.getBoundingClientRect();
    if(!options.document)return rect;
    const top=Math.max(0,rect.top,...(element.closest('.sticky-nav')?[]:pinned.map(header=>header.bottom)));
    return {left:Math.max(0,rect.left),right:Math.min(innerWidth,rect.right),top,bottom:Math.min(innerHeight,rect.bottom)};
  };
  for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){
    const a=hitRegion(controls[i]),b=hitRegion(controls[j]);
    if(Math.min(a.right,b.right)>Math.max(a.left,b.left)&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top))throw new Error(`Controls overlap: ${label(controls[i])} / ${label(controls[j])}`);
  }
}
