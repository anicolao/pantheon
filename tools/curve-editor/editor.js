const defaults={points:[[209.3,918],[264.6,889.9],[337.2,897.3],[410.9,918],[480.7,937.6],[576.6,956.5],[680.1,962.6],[805.2,970],[1042.4,962.4],[1133.3,912.5]],fontSize:150,offset:50};
const names=['Start','1A','1B','Join 1','2A','2B','Join 2','3A','3B','End'];
const key='pantheon-invitation-curve-editor-v1';
const clone=value=>JSON.parse(JSON.stringify(value));
const valid=s=>s&&Array.isArray(s.points)&&s.points.length===10&&s.points.every(p=>Array.isArray(p)&&p.length===2&&p.every(n=>Number.isFinite(n)&&Math.abs(n)<10000))&&Number.isFinite(s.fontSize)&&s.fontSize>=60&&s.fontSize<=240&&Number.isFinite(s.offset)&&s.offset>=0&&s.offset<=100;
let state=clone(defaults),selected=0,drag=null,undo=[],redo=[];
try{const saved=JSON.parse(localStorage.getItem(key));if(valid(saved))state=saved;}catch{}
const $=id=>document.getElementById(id),stage=$('stage');
const round=n=>Math.round(n*10)/10;
const path=()=>`M ${state.points[0].join(' ')} C ${state.points.slice(1,4).flat().join(' ')} C ${state.points.slice(4,7).flat().join(' ')} C ${state.points.slice(7,10).flat().join(' ')}`;
const values=()=>JSON.stringify({path:path(),fontSize:state.fontSize,startOffset:`${state.offset}%`,points:Object.fromEntries(names.map((name,i)=>[name,{x:state.points[i][0],y:state.points[i][1]}]))},null,2);
function announce(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
function remember(){undo.push(clone(state));if(undo.length>100)undo.shift();redo=[];}
function paint(id){return `<image href="/art.webp" x="0" y="0" width="1305" height="1206" preserveAspectRatio="none"/><defs><path id="${id}" d="${path()}"/></defs><text class="ribbon-text" style="font-size:${state.fontSize}px" ${id==='editor-path'&&!$('lettering').checked?'visibility="hidden"':''}><textPath href="#${id}" startOffset="${state.offset}%" text-anchor="middle">Invite friends</textPath></text>`;}
function guides(){
 if(!$('guides').checked)return '';
 const arms=[[0,1],[2,3],[3,4],[5,6],[6,7],[8,9]].map(([a,b])=>`<line class="arm" x1="${state.points[a][0]}" y1="${state.points[a][1]}" x2="${state.points[b][0]}" y2="${state.points[b][1]}"/>`).join('');
 return `${arms}<path class="guide" d="${path()}"/>`+state.points.map(([x,y],i)=>`<g class="point ${i%3===0?'anchor':''} ${i===selected?'selected':''}" data-point="${i}" transform="translate(${x} ${y})" tabindex="0" role="button" aria-label="${names[i]} control point"><circle class="hit" r="19"/><circle class="dot" r="7"/><text x="12" y="-12">${names[i]}</text></g>`).join('');
}
function render(){
 stage.querySelector('#editor-path').setAttribute('d',path());
 stage.querySelector('text').style.fontSize=`${state.fontSize}px`;stage.querySelector('text').setAttribute('visibility',$('lettering').checked?'visible':'hidden');stage.querySelector('textPath').setAttribute('startOffset',`${state.offset}%`);
 $('guides-layer').innerHTML=guides();
 stage.setAttribute('viewBox',$('full-art').checked?'0 0 1305 1206':'100 690 1120 430');stage.classList.toggle('full',$('full-art').checked);
 for(const svg of $('previews').querySelectorAll('svg')){svg.querySelector('path').setAttribute('d',path());svg.querySelector('text').style.fontSize=`${state.fontSize}px`;svg.querySelector('textPath').setAttribute('startOffset',`${state.offset}%`);}
 for(let i=0;i<10;i++){
  document.querySelector(`[data-row="${i}"]`).classList.toggle('active',selected===i);
  for(let axis=0;axis<2;axis++){const input=$(`point-${i}-${axis}`);if(document.activeElement!==input)input.value=state.points[i][axis];}
 }
 for(const [id,value] of [['font-size',state.fontSize],['offset',state.offset],['path-output',path()]])if(document.activeElement!==$(id))$(id).value=value;
 $('all-values').value=values();$('undo').disabled=!undo.length;$('redo').disabled=!redo.length;
 try{localStorage.setItem(key,JSON.stringify(state));}catch{}
}
function move(index,x,y){
 const old=state.points[index],next=[round(x),round(y)],delta=next.map((n,a)=>n-old[a]);state.points[index]=next;
 if(index%3===0){for(const adjacent of [index-1,index+1])if(state.points[adjacent])state.points[adjacent]=state.points[adjacent].map((n,a)=>round(n+delta[a]));}
 else if($('smooth').checked){
  const join=index%3===2?index+1:index-1,other=join+(join-index);
  if(join>0&&join<9){const anchor=state.points[join],length=Math.hypot(...state.points[other].map((n,a)=>n-anchor[a])),vector=next.map((n,a)=>n-anchor[a]),size=Math.hypot(...vector);if(size)state.points[other]=anchor.map((n,a)=>round(n-vector[a]*length/size));}
 }
 render();
}
$('points').innerHTML=names.map((name,i)=>`<div class="point-row ${i%3===0?'anchor':''}" data-row="${i}"><button data-select="${i}" title="Select ${name}">${name}</button><input id="point-${i}-0" aria-label="${name} X" type="number" step="1"><input id="point-${i}-1" aria-label="${name} Y" type="number" step="1"></div>`).join('');
$('points').addEventListener('click',event=>{const button=event.target.closest('[data-select]');if(button){selected=Number(button.dataset.select);render();}});
for(let i=0;i<10;i++)for(let axis=0;axis<2;axis++)$(`point-${i}-${axis}`).addEventListener('input',event=>{const n=event.target.valueAsNumber;if(!Number.isFinite(n)||Math.abs(n)>=10000)return;remember();selected=i;const p=[...state.points[i]];p[axis]=n;move(i,...p);});
function position(event){return new DOMPoint(event.clientX,event.clientY).matrixTransform(stage.getScreenCTM().inverse());}
stage.addEventListener('pointerdown',event=>{const node=event.target.closest('[data-point]');if(!node)return;event.preventDefault();selected=Number(node.dataset.point);const p=position(event);drag={id:event.pointerId,index:selected,dx:state.points[selected][0]-p.x,dy:state.points[selected][1]-p.y};remember();stage.setPointerCapture(event.pointerId);stage.focus();render();});
stage.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;const p=position(event);move(drag.index,p.x+drag.dx,p.y+drag.dy);});
const stop=()=>{if(drag){drag=null;announce('Curve saved. Copy values when the lettering looks right.');}};
stage.addEventListener('pointerup',stop);stage.addEventListener('pointercancel',stop);stage.addEventListener('lostpointercapture',stop);
stage.addEventListener('keydown',event=>{const node=event.target.closest('[data-point]');if(node)selected=Number(node.dataset.point);const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];if(!delta)return;event.preventDefault();remember();const step=event.shiftKey?10:1;move(selected,...state.points[selected].map((n,a)=>n+delta[a]*step));stage.focus();});
for(const id of ['guides','lettering','full-art'])$(id).addEventListener('change',render);
for(const [id,key,min,max] of [['font-size','fontSize',60,240],['offset','offset',0,100]])$(id).addEventListener('input',event=>{const n=event.target.valueAsNumber;if(!Number.isFinite(n)||n<min||n>max)return;remember();state[key]=n;render();});
$('undo').onclick=()=>{if(!undo.length)return;redo.push(clone(state));state=undo.pop();render();announce('Undone.');};
$('redo').onclick=()=>{if(!redo.length)return;undo.push(clone(state));state=redo.pop();render();announce('Redone.');};
$('reset').onclick=()=>{remember();state=clone(defaults);render();announce('Restored the starting curve. Undo is available.');};
async function copy(text){try{await navigator.clipboard.writeText(text);announce('Copied. Paste these values into our conversation.');}catch{$('all-values').closest('details').open=true;$('all-values').focus();$('all-values').select();announce('Select and copy the values shown below.');}}
$('copy-values').onclick=()=>copy(values());$('copy-path').onclick=()=>copy(path());
$('apply-path').onclick=()=>{const text=$('path-output').value.trim(),tokens=text.match(/[MC]|[-+]?(?:\d*\.\d+|\d+\.?\d*)/g)||[];if(/[^MC\d\s,.+\-]/.test(text)||tokens.length!==24||tokens[0]!=='M'||tokens[3]!=='C'||tokens[10]!=='C'||tokens[17]!=='C'){announce('Use one M point followed by three cubic C segments (10 points total).',true);return;}const numbers=tokens.filter(t=>t!=='M'&&t!=='C').map(Number),next={...state,points:Array.from({length:10},(_,i)=>numbers.slice(i*2,i*2+2))};if(!valid(next)){announce('The path contains invalid coordinates.',true);return;}remember();state=next;render();announce('Pasted path applied and saved.');};
stage.innerHTML=paint('editor-path')+'<g id="guides-layer"></g>';
$('previews').innerHTML=[['Phone',133.62],['Desktop',216],['4K',420]].map(([name,width],i)=>`<div class="preview" style="width:${width}px"><svg viewBox="0 0 1305 1206" preserveAspectRatio="none" role="img" aria-label="${name} preview">${paint(`preview-${i}`)}</svg><p>${name} · ${round(width)} px wide</p></div>`).join('');
render();

function translate(dx,dy){
 if(!Number.isFinite(dx)||!Number.isFinite(dy)){announce('Enter a number for both shifts.',true);return false;}
 const next={...state,points:state.points.map(([x,y])=>[round(x+dx),round(y+dy)])};
 if(!valid(next)){announce('That shift would move points outside the supported coordinate range.',true);return false;}
 if(dx===0&&dy===0)return true;
 remember();state=next;render();announce(`Moved the whole curve by X ${dx}, Y ${dy}. Undo is available.`);return true;
}
$('translate-apply').onclick=()=>{if(translate($('translate-x').valueAsNumber,$('translate-y').valueAsNumber)){$('translate-x').value=0;$('translate-y').value=0;}};
for(const id of ['translate-x','translate-y'])$(id).addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();$('translate-apply').click();}});
for(const button of document.querySelectorAll('[data-nudge]'))button.onclick=event=>{const step=event.shiftKey?10:1;translate(...button.dataset.nudge.split(',').map(n=>Number(n)*step));};
