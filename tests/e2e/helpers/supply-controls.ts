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
  const marker=page.locator('.turn-marker');
  if((await marker.textContent())?.includes('Treasures'))return;
  // Automatic progression is already in flight when there are no legal Actions.
  const playable=await page.locator('.hand-slot [data-card-id]').evaluateAll(nodes=>nodes.some(node=>node.getAttribute('data-card-id')&&!['obol','drachma','talent','hamlet','polis','acropolis'].includes(node.getAttribute('data-card-id')!)));
  if(playable&&await page.getByRole('button',{name:'To Treasures',exact:true}).isEnabled())await page.getByRole('button',{name:'To Treasures',exact:true}).click();
  await expect(marker).toContainText('Treasures');
}
