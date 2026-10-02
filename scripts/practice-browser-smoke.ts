import {chromium} from '@playwright/test';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {join,resolve,extname} from 'node:path';
const base=process.env.PUBLIC_BASE_PATH??'';
const root=resolve('build'),browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
page.setDefaultTimeout(2000);page.setDefaultNavigationTimeout(2000);
page.on('requestfailed',r=>console.error('Request failed',r.url(),r.failure()?.errorText));
const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
const server=Bun.serve({hostname:'127.0.0.1',port:0,fetch(request){
 let path=decodeURIComponent(new URL(request.url).pathname);
 if(base){if(!path.startsWith(base+'/'))return new Response('Outside base',{status:404});path=path.slice(base.length);}
 if(path.endsWith('/'))path+='index.html';
 const file=join(root,path);
 if(!file.startsWith(root+'/')||!existsSync(file))return new Response('Missing '+path,{status:404});
 return new Response(Bun.file(file));
}});
page.on('console',m=>{if(m.type()==='error')console.error(m.text());});
// This legacy entry now redirects to the only gameplay UI: the shared table.
const {expect}=await import('@playwright/test');
try {
for(const count of [2,3,4]){
 await page.goto(server.url.origin+base+'/practice/');
 await expect(page).toHaveURL(new RegExp('/play/'));
 await page.getByLabel(count+' players',{exact:true}).check();
 await page.getByLabel('Your name',{exact:true}).fill('Bot host '+count);
 await page.getByRole('button',{name:'Create table',exact:true}).click();
 await expect(page.getByTestId('player-seat')).toHaveCount(1);
 const room=new URL(page.url()).searchParams.get('room')!;
 await page.getByRole('button',{name:'Invite friends',exact:true}).click();
 for(let i=1;i<count;i++){
  await page.getByLabel('Bot strategy').selectOption(['engine','classic-engine','money'][i-1]);
  await page.getByRole('button',{name:'Invite bot',exact:true}).click();
  await expect(page.getByTestId('player-seat')).toHaveCount(i+1);
 }
 mkdirSync('practice-validation',{recursive:true});
 if(count===2)await page.screenshot({path:'practice-validation/invite-bot.png',fullPage:true,timeout:2000});
 await page.getByRole('button',{name:'Close',exact:true}).click();
 if(count===4){
  await page.getByRole('button',{name:/Table details/}).click();
  await page.getByLabel('Your seat',{exact:true}).selectOption('engine');
  await page.getByRole('button',{name:'Close',exact:true}).click();
 }
 await page.getByRole('button',{name:'Begin',exact:true}).click();
 if(count!==4){
  await page.locator('.choose button').click();
  await page.getByRole('button',{name:'Play all Treasures',exact:true}).click();
  await page.getByRole('button',{name:'End turn',exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'End turn',exact:true}).click();
 }
 // Emulator-only administrative observation verifies actual persisted bot moves.
 const read=async()=>{
  const r=await fetch('http://127.0.0.1:8193/v1/projects/demo-pantheon/databases/(default)/documents/games/'+room+'/events?pageSize=1000',{headers:{Authorization:'Bearer owner'}});
  if(!r.ok)throw Error('Could not inspect emulator events: '+r.status);
  return (await r.json() as any).documents.map((d:any)=>d.fields);
 };
 await expect.poll(async()=>{const es=await read();return es.some((e:any)=>e.type.stringValue==='turn/ended'&&e.actorUid.stringValue.startsWith('bot-'));},{timeout:2000}).toBe(true);
 const previous=(await read()).length;
 await page.reload();
 await expect(page.locator('.session')).toBeVisible();
 if(count===4)await expect.poll(async()=>(await read()).length,{timeout:2000}).toBeGreaterThan(previous);
 await expect(page.getByRole('button',{name:'Retry bot',exact:true})).toHaveCount(0);
 if(count===3){
  await page.screenshot({path:'practice-validation/desktop.png',fullPage:true,timeout:2000});
  await page.setViewportSize({width:393,height:852});
  await page.screenshot({path:'practice-validation/phone.png',fullPage:true,timeout:2000});
  await page.setViewportSize({width:1440,height:1000});
 }
 console.log('Shared bot table passed: '+count+' seats, room '+room);
}
if(errors.length)throw Error(errors.join('\n'));
} finally {await browser.close();server.stop(true);}
console.log('Browser bots: shared 2/3/4-player tables, all three policies, draft, persisted moves, host reload, desktop and phone passed.');
