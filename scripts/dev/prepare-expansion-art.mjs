import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {basename} from 'node:path';
const sources=JSON.parse(await readFile(process.argv[2],'utf8'));
const records=[];
for(const source of sources){
 const folder=source.kind==='icon'?'icons':'cards';
 await mkdir(`static/assets/expansion/${folder}`,{recursive:true});
 const bytes=await readFile(source.path);
 const output=`static/assets/expansion/${folder}/${source.id}.webp`;
 const input=sharp(bytes);const meta=await input.metadata();
 if(source.kind==='icon'&&!meta.hasAlpha)throw Error(`Icon lacks alpha: ${source.id}`);
 await input.resize(source.kind==='icon'?512:1200,source.kind==='icon'?512:800,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp(source.kind==='icon'?{lossless:true}:{quality:92}).toFile(output);
 records.push({id:source.id,kind:source.kind,source:basename(source.path),sourceSHA256:createHash('sha256').update(bytes).digest('hex'),output,sha256:createHash('sha256').update(await readFile(output)).digest('hex'),width:source.kind==='icon'?512:1200,height:source.kind==='icon'?512:800,alpha:meta.hasAlpha});
}
await writeFile('docs/design/expansion-art-manifest.json',JSON.stringify({generator:'Built-in image_gen',processing:'Delivery resizing and WebP encoding only; source artwork is not composited or retouched.',assets:records},null,2)+'\n');
const cardRows=records.filter(r=>r.kind==='card');
for(let batch=0;batch<Math.ceil(cardRows.length/8);batch++){
 const page=cardRows.slice(batch*8,batch*8+8),tiles=[];
 for(const [i,row] of page.entries()){
  tiles.push({input:await sharp(row.output).resize(360,240).toBuffer(),left:i%2*360,top:Math.floor(i/2)*270});
  const svg=Buffer.from(`<svg width="360" height="30"><rect width="360" height="30" fill="#14232a"/><text x="12" y="21" fill="white" font-size="16">${row.id}</text></svg>`);
  tiles.push({input:svg,left:i%2*360,top:Math.floor(i/2)*270+240});
 }
 await sharp({create:{width:720,height:Math.ceil(page.length/2)*270,channels:4,background:'#14232a'}}).composite(tiles).png().toFile(`/tmp/expansion-art-review-${batch}.png`);
}
console.log(`Prepared ${records.length} assets.`);
