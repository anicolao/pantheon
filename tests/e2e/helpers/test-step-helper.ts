import { expect, test, type Page, type TestInfo, type CDPSession } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { assertScreenFit } from './screen-fit';
import { identicalPixels } from './exact-pixels';
import { renderStoryImages } from './story-images';

export const OPERATION_BUDGET = 2_000;
type Verification = { spec: string; check: () => Promise<unknown> };
type View = { page?: Page; player?: string; status?: string; document?: boolean };
type Story = { slug: string; title: string; steps: string[]; ids: Set<string> };
const stories = new WeakMap<TestInfo, Story>();
const cameras = new WeakMap<Page, CDPSession>();
function storyFor(info: TestInfo): Story {
  let story=stories.get(info);
  if(!story){story={slug:info.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),title:info.title,steps:[],ids:new Set()};stories.set(info,story);}
  return story;
}
/** One ordered narrative per test, including all player viewpoints. */
export class TestStepHelper {
  constructor(private page:Page,private info:TestInfo,private title:string,private settledStatus='synced'){}
  async step(id:string,description:string,verifications:Verification[],view:View={}){
    const page=view.page??this.page,story=storyFor(this.info);
    if(story.ids.has(id))throw new Error(`Duplicate story step: ${id}`);
    story.ids.add(id);
    await test.step(description,async()=>{
      for(const verification of verifications)await test.step(verification.spec,verification.check,{timeout:OPERATION_BUDGET});
      const stem=`${String(story.steps.length).padStart(3,'0')}-${id}`;
      await test.step('Ready, unclipped, and photographed within 2,000 ms',async()=>{
        const start=performance.now(),remaining=()=>Math.max(1,OPERATION_BUDGET-Math.ceil(performance.now()-start));
        // Locator assertions back off to one-second polling. Observe readiness promptly
        // so a settled scene does not spend its capture budget waiting for the next poll.
        if(!view.document){
          const ready=await page.waitForFunction(status=>{
            const scenes=document.querySelectorAll('[data-status]');
            return scenes.length===1&&scenes[0].getAttribute('data-status')===status&&(status!=='synced'||!document.querySelector('[aria-busy="true"]'));
          },view.status??this.settledStatus,{polling:20,timeout:remaining()});
          await ready.dispose();
        }
        const acknowledged=performance.now();
        await page.bringToFront();
        await page.mouse.move(0,0);
        const foreground=performance.now();
        const transitioned=await page.waitForFunction(()=>{
          const transitions=(window as Window&{__pantheonTransitions?:Map<Element,string>}).__pantheonTransitions;
          if(!transitions)throw new Error('Capture context must observe transition lifetimes before navigation');
          for(const node of transitions.keys())if(!node.isConnected)transitions.delete(node);
          return transitions.size===0;
        },undefined,{polling:20,timeout:remaining()});
        await transitioned.dispose();
        const assetTimings=await page.evaluate(async()=>{
          const start=performance.now();
          await document.fonts.ready;
          const fonts=performance.now();
          const top=[...document.querySelectorAll<HTMLDialogElement>('dialog:modal')].at(-1),box=top?.getBoundingClientRect();
          // These opaque scenes cover the whole table; underlying artwork is not visible.
          const root=top&&top.matches('.choice-scene,.supply-scene,.worship-scene')&&box!.left<=0&&box!.top<=0&&box!.right>=innerWidth&&box!.bottom>=innerHeight?top:document;
          const images=[...root.querySelectorAll<HTMLImageElement>('img')].filter(image=>image.checkVisibility()),backgrounds=new Set<string>();
          const elements=[...(root instanceof HTMLElement?[root]:[]),...root.querySelectorAll<HTMLElement>('[data-e2e-layout], [data-e2e-layout] *')];
          for(const element of elements){
            if(!element.checkVisibility())continue;
            for(const match of getComputedStyle(element).backgroundImage.matchAll(/url\(["']?(.*?)["']?\)/g))backgrounds.add(match[1]);
          }
          const discovered=performance.now();
          const owner=window as Window&{__pantheonDecodedArtwork?:Map<string,Promise<void>>};
          const decoded=owner.__pantheonDecodedArtwork??=new Map<string,Promise<void>>();
          const decode=(image:HTMLImageElement)=>{
            const src=image.currentSrc||image.src;
            // A new or failed load must complete itself; loaded copies share the immutable resource.
            if(!image.complete||!image.naturalWidth||!decoded.has(src))decoded.set(src,image.decode());
            return decoded.get(src)!;
          };
          await Promise.all([...images.map(decode),...[...backgrounds].map(src=>{
            if(decoded.has(src))return decoded.get(src)!;
            const image=new Image();image.src=src;return decode(image);
          })]);
          const artwork=performance.now();
          let animations:Animation[];
          while((animations=document.getAnimations().filter(animation=>animation.playState!=='finished')).length){
            await Promise.all(animations.map(animation=>animation.finished.catch(()=>undefined)));
          }
          // Capture flushes the complete compositor frame; another rAF would render it twice.
          return {fonts:Math.round(fonts-start),discovery:Math.round(discovered-fonts),decode:Math.round(artwork-discovered),animations:Math.round(performance.now()-artwork)};
        });
        const ready=performance.now();
        await page.evaluate(assertScreenFit,{document:view.document});
        const prepared=performance.now();
        // One capture after semantic readiness; no screenshot polling or animation fast-forward.
        let camera=cameras.get(page);
        if(!camera){camera=await page.context().newCDPSession(page);cameras.set(page,camera);}
        let capture:Buffer;
        const result=await camera.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false,optimizeForSpeed:true});capture=Buffer.from(result.data,'base64');
        const photographed=performance.now();
        const name=[story.slug,`${stem}-${this.info.project.name}-${process.platform}.png`],baseline=this.info.snapshotPath(...name);
        if(['all','changed'].includes(this.info.config.updateSnapshots)){
          // Explicit generation is never verification; review and compare in a separate run.
          mkdirSync(dirname(baseline),{recursive:true});writeFileSync(baseline,capture);
        }else{
          const same=existsSync(baseline)&&await identicalPixels(capture,readFileSync(baseline));
          if(!same){
            // Keep Playwright's expected/actual/diff report on failures.
            expect(capture).toMatchSnapshot(name,{maxDiffPixels:0,threshold:0});
            expect(same,'Every decoded RGBA byte must equal the reviewed baseline').toBe(true);
          }
        }
        expect(performance.now()-start,`Capture exceeded 2,000 ms: preparation ${Math.round(prepared-start)} (ack ${Math.round(acknowledged-start)}, foreground ${Math.round(foreground-acknowledged)}, assets/animations ${Math.round(ready-foreground)} ${JSON.stringify(assetTimings)}, layout ${Math.round(prepared-ready)}), image ${Math.round(photographed-prepared)}, comparison ${Math.round(performance.now()-photographed)}`).toBeLessThanOrEqual(OPERATION_BUDGET);
      },{timeout:OPERATION_BUDGET});
      const views=renderStoryImages(story.slug,stem,description);
      story.steps.push(`## ${description}\n\n${view.player?`Viewpoint: **${view.player}**.\n\n`:''}${views}\n\n${verifications.map(item=>`- [x] ${item.spec}`).join('\n')}`);
    });
  }
  generateDocs(){/* Shared fixture writes once, after the complete test passes. */}
}
export function finishStory(info:TestInfo){
  const story=stories.get(info);
  if(!story||info.status!=='passed'||info.project.name!=='desktop'||process.platform!=='darwin')return;
  const folder=join(dirname(info.file),'stories',story.slug);mkdirSync(folder,{recursive:true});
  const setup=info.annotations.filter(item=>item.type==='setup').map(item=>item.description).join('\n\n');
  writeFileSync(join(folder,'README.md'),`# ${story.title}\n\n${setup?setup+'\n\n':''}${story.steps.join('\n\n')}\n`);
}
