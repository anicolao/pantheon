import {test,expect} from '../helpers/fixtures';
import {TestStepHelper} from '../helpers/test-step-helper';

test('inspect portrait and landscape gallery cards in the shared dialog frame',async({page},info)=>{
  await page.goto('./gallery/');
  const steps=new TestStepHelper(page,info,'Read every card format in the shared frame');
  for(const [id,name] of [['action','Sacred Academy'],['event','Trial of the Spear'],['leader','Thaleia, Keeper of the Owl']]){
    await page.getByRole('searchbox',{name:'Search cards'}).fill(name);
    const opener=page.getByRole('button',{name:`Inspect ${name}`,exact:true});
    await opener.click();
    const dialog=page.getByRole('dialog',{name:`${name} details`,exact:true});
    await steps.step(id,`Read ${name} and its complete rules`,[{spec:'The card, written rules, copy selector, and Close control fit inside the dialog.',check:async()=>{
      await expect(dialog.locator('.card')).toHaveAttribute('data-layout-state','fit');
      await expect(dialog.locator('.accessible-rules')).toContainText(name);
      await expect(dialog.getByRole('button',{name:'Close',exact:true})).toBeVisible();
      expect(await dialog.evaluate(node=>node.scrollHeight<=node.clientHeight&&node.scrollWidth<=node.clientWidth)).toBe(true);
    }}],{document:true});
    await dialog.getByRole('button',{name:'Show back',exact:true}).click();
    await steps.step(`${id}-back`,`Turn over ${name}`,[{spec:'The matching back replaces the face and can be turned back.',check:async()=>{
      await expect(dialog.locator('.card')).toHaveCount(0);
      await expect(dialog.getByRole('button',{name:'Show front',exact:true})).toBeVisible();
    }}],{document:true});
    await page.keyboard.press('Escape');
    await expect(opener).toBeFocused();
  }
});
