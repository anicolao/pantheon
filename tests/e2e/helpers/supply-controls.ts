import {expect,type Page} from '@playwright/test';

/** Browse the public, cost-sorted row without buying or reading private state. */
export async function browseSupply(page:Page,name:string){
  await expect(page.locator('.session')).toHaveAttribute('aria-busy','false');
  const card=page.getByRole('button',{name:`Buy ${name}`,exact:true});
  if(await card.count())return card;
  const cheaper=page.getByRole('button',{name:'Cheaper cards',exact:true});
  while(await cheaper.isEnabled())await cheaper.click();
  for(let index=0;index<20;index++){
    if(await card.count())return card;
    const next=page.getByRole('button',{name:'More expensive cards',exact:true});
    if(!await next.isEnabled())break;
    await next.click();
  }
  throw new Error(`Supply card not found: ${name}`);
}
export async function inspectSupply(page:Page,name:string){
  const card=await browseSupply(page,name);await card.focus();await page.keyboard.press('Shift+F10');
}
export async function enterTreasures(page:Page){
  // Read phase, readiness, and legal plays together. Card type alone is not
  // playability: an Action can remain in hand after the last Action is spent.
  const phase = await page.waitForFunction(() => {
    const session = document.querySelector('.session');
    if (session?.getAttribute('aria-busy') !== 'false') return false;
    const marker = session.querySelector('.turn-marker')?.textContent;
    if (marker?.includes('Treasures')) return 'treasures';
    const playableAction = session.querySelector(
      '.hand-slot:has([data-type="Action"]) + button[aria-label^="Play hand card "]');
    return marker?.includes('Actions') && playableAction ? 'actions' : false;
  }, undefined, {timeout: 2000});
  if (await phase.jsonValue() === 'actions') await page.getByRole('button',{name:'To Treasures',exact:true}).click();
  await expect(page.locator('.turn-marker')).toContainText('Treasures');
}
