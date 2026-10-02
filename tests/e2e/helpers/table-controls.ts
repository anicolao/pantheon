import {expect,type Page} from '@playwright/test';

/** Drawers are real controls on portrait phones; desktop sidebars are already open. */
export async function openPlayers(page:Page){
  const control=page.getByRole('button',{name:'Players and Chronicle',exact:true});
  if(await control.isVisible() && await control.getAttribute('aria-expanded')==='false')await control.click();
}
export async function closePlayers(page:Page){
  const control=page.getByRole('button',{name:'Players and Chronicle',exact:true});
  if(await control.isVisible() && await control.getAttribute('aria-expanded')==='true')await control.click();
}
export async function openWorshipDrawer(page:Page){
  const control=page.getByRole('button',{name:'Worship',exact:true});
  if(await control.isVisible() && await control.getAttribute('aria-expanded')==='false')await control.click();
}
export async function openWorship(page:Page,name:string){
  await openWorshipDrawer(page);
  if(await page.locator('.worship-coverflow').count())await expect(page.locator('.worship-coverflow')).toHaveAttribute('aria-busy','false');
  const stacked=page.getByRole('button',{name:`Center ${name}`,exact:true});
  if(await stacked.count())await stacked.click();
  if(await page.locator('.worship-coverflow').count())await expect(page.locator('.worship-coverflow')).toHaveAttribute('aria-busy','false');
  await page.getByRole('button',{name:`Inspect ${name}`,exact:true}).click();
  await expect(page.locator('.worship-overlay')).toHaveAttribute('aria-busy','false');
}
/** Navigate the actual offer, then leave activation to the photographed story. */
export async function browseChoice(page:Page,name:string){
  const choice=page.getByRole('button',{name:`Select ${name}`,exact:true}).first();
  const direction=await page.locator('.buy-card').evaluateAll((nodes,name)=>{
    const current=nodes.findIndex(node=>node.getAttribute('data-centered')==='true');
    const wanted=nodes.findIndex(node=>[`Select ${name}`,`Center ${name}`].includes(node.getAttribute('aria-label')!));
    if(wanted<0)throw new Error(`Choice missing: ${name}`);
    return wanted>current?'ArrowRight':'ArrowLeft';
  },name);
  for(let index=0;index<18&&!await choice.count();index++){
    await page.locator('.buy-card[data-centered=true]').press(direction);
    await expect(page.locator('.session')).toHaveAttribute('aria-busy','false');
    await expect(page.locator('.supply-coverflow')).toHaveAttribute('aria-busy','false');
  }
  await expect(page.locator('.session')).toHaveAttribute('aria-busy','false');
  await expect(page.locator('.supply-coverflow')).toHaveAttribute('aria-busy','false');
  await expect(choice).toBeEnabled();
  return choice;
}
