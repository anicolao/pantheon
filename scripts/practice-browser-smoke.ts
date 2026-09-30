import {chromium} from '@playwright/test';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {join,resolve,extname} from 'node:path';
const root=resolve('build'),browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
page.setDefaultTimeout(2000);page.setDefaultNavigationTimeout(2000);
const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('http://practice.test/**',async route=>{
 let path=decodeURIComponent(new URL(route.request().url()).pathname);
 if(path.endsWith('/'))path+='index.html';
 const file=join(root,path);
 if(!file.startsWith(root+'/')||!existsSync(file)){await route.fulfill({status:404,body:'Missing '+path});return;}
 const mime:Record<string,string>={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff'};
 await route.fulfill({status:200,contentType:mime[extname(file)]??'application/octet-stream',body:readFileSync(file)});
});
await page.goto('http://practice.test/practice/');
await page.getByLabel('Turn order').selectOption('false');
await page.getByRole('button',{name:'Start practice game'}).click();
let observed=0,ended=false;
for(let step=0;step<30;step++){
 await page.waitForFunction(n=>(JSON.parse(localStorage.getItem('pantheon-practice-v1')??'null')?.commands.length??0)>n,observed,{timeout:2000});
 const commands=await page.evaluate(()=>JSON.parse(localStorage.getItem('pantheon-practice-v1')!).commands);
 observed=commands.length;if(commands.some((c:any)=>c.type==='turn/ended')){ended=true;break;}
}
if(!ended)throw Error('Opponent failed to finish its opening turn');
await page.getByRole('button',{name:'Pause opponent',exact:true}).click();
const saved=await page.evaluate(()=>localStorage.getItem('pantheon-practice-v1'));
mkdirSync('practice-validation',{recursive:true});
await page.screenshot({path:'practice-validation/desktop.png',fullPage:true,timeout:2000});
await page.reload();
await page.getByRole('button',{name:'Continue saved game'}).click();
if(await page.evaluate(()=>localStorage.getItem('pantheon-practice-v1'))!==saved)throw Error('Restore changed saved history');
await page.setViewportSize({width:393,height:852});
await page.screenshot({path:'practice-validation/phone.png',fullPage:true,timeout:2000});
if(errors.length)throw Error(errors.join('\n'));
await browser.close();console.log('Browser practice: bot turn, pause, save/restore, desktop and phone passed.');
