import {chromium} from '@playwright/test';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {join,resolve,extname} from 'node:path';
const root=resolve('build'),browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
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
await page.waitForFunction(()=>JSON.parse(localStorage.getItem('pantheon-practice-v1')??'null')?.commands.some((c:any)=>c.type==='turn/ended'),{},{timeout:30000});
await page.getByRole('button',{name:'Pause opponent',exact:true}).click();
const saved=await page.evaluate(()=>localStorage.getItem('pantheon-practice-v1'));
mkdirSync('practice-validation',{recursive:true});
await page.screenshot({path:'practice-validation/desktop.png',fullPage:true});
await page.reload();
await page.getByRole('button',{name:'Continue saved game'}).click();
if(await page.evaluate(()=>localStorage.getItem('pantheon-practice-v1'))!==saved)throw Error('Restore changed saved history');
await page.setViewportSize({width:393,height:852});
await page.screenshot({path:'practice-validation/phone.png',fullPage:true});
if(errors.length)throw Error(errors.join('\n'));
await browser.close();console.log('Browser practice: bot turn, pause, save/restore, desktop and phone passed.');
