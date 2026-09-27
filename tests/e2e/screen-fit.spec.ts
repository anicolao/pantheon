import {test,expect} from './helpers/fixtures';
import {assertScreenFit} from './helpers/screen-fit';

test('capture audit rejects clipped components and text on every viewport',async({page})=>{
  await page.setContent('<main data-e2e-layout style="margin:32px;width:300px;height:200px"><div id="clip" style="position:relative;width:150px;height:100px;overflow:hidden"><button id="target" style="position:absolute;left:5px;top:5px;width:100px;height:44px">Gain a card</button></div></main>');
  await page.evaluate(assertScreenFit,{});
  for(const position of [{left:'120px',top:'5px'},{left:'-10px',top:'5px'},{left:'5px',top:'80px'},{left:'5px',top:'-10px'}]){
    await page.locator('#target').evaluate((node,position)=>Object.assign((node as HTMLElement).style,position),position);
    await expect(page.evaluate(assertScreenFit,{})).rejects.toThrow(/clipped by div/);
  }
  await page.locator('#target').evaluate(node=>{const target=node as HTMLElement;target.style.cssText='position:absolute;left:5px;top:5px;width:100px;height:44px;overflow:hidden;white-space:nowrap';target.textContent='This complete instruction cannot fit inside this component';});
  await expect(page.evaluate(assertScreenFit,{})).rejects.toThrow(/Text clipped/);
  await page.locator('#target').evaluate(node=>{const target=node as HTMLElement;target.style.cssText='position:absolute;left:5px;top:5px;width:100px;height:44px;overflow:hidden';target.textContent='Choose\nthese\ncards\nto\ndiscard';target.style.whiteSpace='pre';});
  await expect(page.evaluate(assertScreenFit,{})).rejects.toThrow(/Text clipped/);
});
