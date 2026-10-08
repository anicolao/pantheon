import { observeDraws, waitForDraws, drawFrames } from './helpers/draw-observer';
import { expect, test } from '@playwright/test';
import { browseSupply } from './helpers/supply-controls';
import { browseChoice } from './helpers/table-controls';

test('draw reveals overlap earlier landings but open only one slot at a time', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./dev/animations/?scenario=council-of-sages');
  const trigger = page.getByRole('button', { name: 'Trigger', exact: true });
  await expect(trigger).toBeEnabled();
  await observeDraws(page);
  await trigger.click();
  await expect(page.locator('[data-motion-kind="draw"]').first()).toBeVisible();
  for (const count of [1, 2, 3]) await waitForDraws(page, count);
  const frames = await drawFrames(page);
  const steps = [...new Set(frames.flatMap(frame => frame.cards.map(card => card.step)))];
  expect(steps).toHaveLength(3);
  for (const [index, step] of steps.entries()) {
    const reveal = frames.find(frame => frame.cards.some(card => card.step === step && card.phase === 'reveal'))!;
    expect(reveal).toBeDefined();
    expect(reveal.hand).toBe(4 + index);
    if (index) expect(reveal.cards.some(card => card.step === steps[index - 1] && card.phase !== 'reveal')).toBe(true);
    const space = frames.find(frame => frame.cards.some(card => card.step === step && card.phase === 'space'))!;
    expect(space).toBeDefined();
    expect(space.hand).toBe(5 + index);
    const travel = frames.flatMap(frame => frame.cards).find(card => card.step === step && card.phase === 'travel')!;
    expect(travel).toBeDefined();
    expect(travel.inHand).toBe(true);
    expect(travel.slotStack).not.toBeNull();
    expect(travel.stack).toBe(travel.slotStack);
  }
  await expect(page.locator('.public-flight')).toHaveCount(0);
  await expect(page.locator('.hand')).toHaveAttribute('data-hand-total', '7');
  await expect(page.getByRole('button', { name: 'Replay', exact: true })).toBeEnabled();
});

test('reducing motion mid-draw releases all staged hand cards', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./dev/animations/?scenario=council-of-sages');
  const trigger = page.getByRole('button', { name: 'Trigger', exact: true });
  await expect(trigger).toBeEnabled();
  await trigger.click();
  await expect(page.locator('.hand > [data-draw-phase="travel"]')).toBeVisible();
  await expect(page.locator('[data-draw-phase="reveal"]')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.public-flight')).toHaveCount(0);
  await expect(page.locator('.hand')).toHaveAttribute('data-hand-total', '7');
  await expect(page.getByRole('button', { name: 'Replay', exact: true })).toBeEnabled();
});

test('Seed Keeper choice fades in only after its card lands', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./dev/animations/?scenario=seed-keeper');
  const trigger = page.getByRole('button', { name: 'Trigger', exact: true });
  await expect(trigger).toBeEnabled();
  await trigger.click();
  await expect(page.locator('[data-motion-kind="play"]')).toBeVisible();
  const choice = page.locator('.inline-choice');
  await expect(choice).toHaveCount(0);
  await expect(choice).toBeVisible();
  await expect(page.locator('.public-flight')).toHaveCount(0);
  const fadesIn = await choice.evaluate(node => node.getAnimations().some(animation => {
    const frames = (animation.effect as KeyframeEffect).getKeyframes();
    return frames[0]?.opacity === '0' && frames.at(-1)?.opacity === '1';
  }));
  expect(fadesIn).toBe(true);
  await expect(choice).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByRole('button', { name: 'Done trashing', exact: true })).toBeEnabled();
});


test('Victorious Procession lands, pauses, and leaves no duplicate on the table', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./dev/animations/?scenario=victorious-procession');
  const trigger = page.getByRole('button', { name: 'Trigger', exact: true });
  await expect(trigger).toBeEnabled();
  await trigger.click();
  await expect(page.locator('[data-motion-kind="play"]')).toBeVisible();
  await expect(page.locator('.played-card')).toHaveCSS('opacity', '0');
  const outcome = page.locator('.outcome');
  // Playing the last Action also advances to Treasures. That state update
  // must retain the reveal's masked DOM slot throughout the flight.
  await expect(page.getByRole('region', { name: 'Turn resources' })).toContainText('Treasures');
  await expect(outcome).toHaveCSS('opacity', '0');
  const reveal = page.locator('[data-motion-kind="reveal"]');
  await expect(reveal).toBeVisible();
  await expect(outcome).toHaveCSS('opacity', '0');
  await expect(reveal).toHaveAttribute('data-motion-phase', 'pause');
  await expect(page.locator('[data-motion-kind="topdeck"], [data-motion-kind="discard"]')).toBeVisible();
  await expect(outcome).toHaveCSS('opacity', '0');
  await expect(page.locator('.public-flight')).toHaveCount(0);
  await expect(outcome).toBeHidden();
  await expect(page.locator('.played-card')).toHaveCSS('opacity', '1');
});

test('a worship choice opened by the scenario flies in from its sidebar card', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./dev/animations/?scenario=counsel-of-olympus');
  const trigger = page.getByRole('button', { name: 'Trigger', exact: true });
  await expect(trigger).toBeEnabled();
  await trigger.click();
  const overlay = page.getByRole('region', { name: 'Athena worship', exact: true });
  await expect(overlay).toBeVisible();
  const fliesIn = await overlay.evaluate(node => node.getAnimations().some(animation => {
    const frames = (animation.effect as KeyframeEffect).getKeyframes();
    return String(frames[0]?.transform ?? '').includes('translate(') && frames.at(-1)?.transform === 'none';
  }));
  expect(fliesIn).toBe(true);
  await expect(overlay).toHaveCSS('transform', 'none');
});

for (const speed of ['1', '0.25']) test(`Treasures land right to left before the market moves at ${speed} speed`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./dev/animations/?scenario=treasures');
  const trigger = page.getByRole('button', { name: 'Trigger', exact: true });
  await expect(trigger).toBeEnabled();
  await page.getByRole('combobox', { name: 'Playback speed' }).selectOption(speed);
  await page.evaluate(() => {
    const audit = { overlap: false, moved: false, started: [] as string[], landed: [] as string[] };
    (window as Window & { treasureAudit?: typeof audit }).treasureAudit = audit;
    const original = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      const animation = original.apply(this, args);
      if (this.matches('.public-flight[data-motion-kind="play"]')) {
        const card = this.querySelector<HTMLElement>('[data-card-id]')!.dataset.cardId!;
        audit.started.push(card);
        void animation.finished.then(() => audit.landed.push(card), () => undefined);
      }
      return animation;
    };
    const supply = document.querySelector('.supply-coverflow')!;
    new MutationObserver(records => {
      if (!audit.started.length || !records.some(record => (record.target as Element).matches('.supply-face'))) return;
      audit.moved = true;
      if (document.querySelector('.public-flight[data-motion-kind="play"]')) audit.overlap = true;
    }).observe(supply, { subtree: true, attributes: true, attributeFilter: ['style'] });
  });
  await trigger.click();
  await expect(page.locator('.public-flight')).toHaveCount(3);
  await expect.poll(() => page.evaluate(() => (window as Window & { treasureAudit?: { landed: string[] } }).treasureAudit!.landed)).toContain('talent');
  await expect(page.locator('.public-flight')).toHaveCount(0);
  await expect(page.locator('.supply-coverflow')).toHaveAttribute('aria-busy', 'true');
  // The market's slow-motion glide intentionally lasts over two seconds.
  // Restore normal playback after proving it started only after the flights.
  await page.getByRole('button', { name: /Animation lab/ }).click();
  await page.getByRole('combobox', { name: 'Playback speed' }).selectOption('1');
  await expect(page.locator('.supply-coverflow')).toHaveAttribute('aria-busy', 'false');
  const audit = await page.evaluate(() => (window as Window & { treasureAudit?: unknown }).treasureAudit);
  expect(audit).toEqual({ overlap: false, moved: true, started: ['talent', 'drachma', 'obol'], landed: ['talent', 'drachma', 'obol'] });
  expect(await page.locator('.played-card [data-card-id]').evaluateAll(nodes => nodes.map(node => (node as HTMLElement).dataset.cardId))).toEqual(['talent', 'drachma', 'obol']);
});

test('observer draws remain private and Reset removes in-flight cards', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./dev/animations/?scenario=council-of-sages&players=4&observer=true');
  const trigger = page.getByRole('button', { name: 'Trigger', exact: true });
  await expect(trigger).toBeEnabled();
  const players = page.getByRole('button', { name: 'Players and Chronicle', exact: true });
  if (await players.isVisible()) {
    await players.click();
    await expect(page.locator('.player-sidebar')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  }
  await trigger.click();
  const draw = page.locator('[data-draw-phase="reveal"]');
  await expect(draw).toBeVisible();
  await expect(draw.locator('[data-card-id]')).toHaveCount(0);
  await expect(draw).not.toHaveAttribute('data-motion-card');
  const sizes = await draw.evaluate(node => ({ flight: node.getBoundingClientRect().width, sidebar: document.querySelector<HTMLElement>('[data-motion-key^="hidden:"]')!.offsetWidth }));
  // The rising card can still be scaled from its smaller deck icon.
  expect(sizes.flight).toBeLessThanOrEqual(sizes.sidebar);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.locator('.public-flight')).toHaveCount(0);
  await expect(trigger).toBeEnabled();
});


test('a zero-cost purchase preserves the browsed market position', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./dev/animations/?scenario=victorious-procession');
  const trigger = page.getByRole('button', { name: 'Trigger', exact: true });
  await expect(trigger).toBeEnabled();
  await trigger.click();
  await expect(page.getByRole('button', { name: 'Replay', exact: true })).toBeEnabled();
  await expect(page.locator('.resources [data-resource="buys"]')).toHaveAttribute('data-value', '2');
  const obol = await browseSupply(page, 'Obol');
  await obol.click();
  await expect(page.locator('.resources [data-resource="buys"]')).toHaveAttribute('data-value', '1');
  await expect(page.locator('.buy-card[data-centered="true"]')).toHaveAttribute('data-supply-id', 'obol');
});


test('Sacred Grove gains land on the table, pause, then enter discard', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./dev/animations/?scenario=sacred-grove');
  await page.getByRole('button', { name: 'Trigger', exact: true }).click();
  await expect(page.locator('.inline-choice')).toBeVisible();
  const discard = page.locator('[data-public-zone="discard"][data-public-uid="lab-0"]');
  const count = Number((await discard.getAttribute('aria-label'))!.match(/\d+/)![0]);
  await (await browseChoice(page, 'Obol')).click();
  const arrival = page.locator('.public-flight[data-motion-kind="gain"]');
  const outcome = page.locator('.outcome');
  await expect(arrival).toBeVisible();
  await expect(outcome).toHaveCSS('opacity', '0');
  // Sample the real short pause each frame; assertion backoff can skip it.
  await page.waitForFunction(() => document.querySelector('.public-flight[data-motion-kind="gain"]')?.getAttribute('data-motion-phase') === 'pause', undefined, { polling: 'raf', timeout: 2000 });
  const landing = await arrival.evaluate(node => {
    const flight = node.getBoundingClientRect();
    const target = document.querySelector('.outcome-card')!.getBoundingClientRect();
    return { x: flight.x + flight.width / 2, y: flight.y + flight.height / 2, tx: target.x + target.width / 2, ty: target.y + target.height / 2 };
  });
  expect(landing.x).toBeCloseTo(landing.tx, 3);
  expect(landing.y).toBeCloseTo(landing.ty, 3);
  const departure = page.locator('.public-flight[data-motion-kind="discard"]');
  await expect(departure).toBeVisible();
  await expect(outcome).toHaveCSS('opacity', '0');
  await expect(page.locator('.public-flight')).toHaveCount(0);
  await expect(outcome).toBeHidden();
  await expect(discard).toHaveAttribute('aria-label', `Inspect your discard pile: ${count + 1} cards`);
});

for(const edge of ['south','west','north','east'])test(`tabletop animation lab replays hand motion from ${edge} without changing the saved table`,async({page},info)=>{
  test.skip(info.project.name==='phone','The shared tabletop needs a large display.');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(`./dev/animations/?surface=tabletop&edge=${edge}&scenario=treasures&players=4`);
  const original=await page.evaluate(()=>localStorage.getItem('pantheon-tabletop-v1'));
  const board=page.getByRole('region',{name:'Shared table'});
  await expect(board).toHaveAttribute('data-facing',edge);
  const trigger=page.getByRole('button',{name:'Trigger',exact:true});
  await expect(trigger).toBeEnabled();
  await page.getByRole('combobox',{name:'Playback speed',exact:true}).selectOption('0.5');
  await trigger.click();
  await expect(page.locator('.public-flight[data-motion-kind="play"]').first()).toBeVisible();
  await expect(page.getByRole('button',{name:'Replay',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Reset',exact:true}).click();
  await expect(trigger).toBeEnabled();
  await expect(page.locator('.public-flight')).toHaveCount(0);
  expect(await page.evaluate(()=>localStorage.getItem('pantheon-tabletop-v1'))).toBe(original);
});

for(const edge of ['south','west','north','east'])test(`tabletop ${edge} draw reveals before opening each sorted hand slot`,async({page},info)=>{
  test.skip(info.project.name==='phone','The shared tabletop needs a large display.');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(`./dev/animations/?surface=tabletop&edge=${edge}&scenario=council-of-sages&players=4`);
  const trigger=page.getByRole('button',{name:'Trigger',exact:true});
  await expect(trigger).toBeEnabled();
  const selector=`[data-edge="${edge}"] .table-hand`;
  const initial=Number(await page.locator(selector).getAttribute('data-hand-total'));
  await observeDraws(page,selector);
  await trigger.click();
  for(const count of [1,2,3])await waitForDraws(page,count);
  const frames=await drawFrames(page),steps=[...new Set(frames.flatMap(frame=>frame.cards.map(card=>card.step)))];
  expect(steps).toHaveLength(3);
  for(const [index,step] of steps.entries()){
    const reveal=frames.find(frame=>frame.cards.some(card=>card.step===step&&card.phase==='reveal'))!;
    expect(reveal.hand).toBe(initial-1+index);
    expect(reveal.cards.find(card=>card.step===step)!.slotStack).toBeNull();
    const space=frames.find(frame=>frame.cards.some(card=>card.step===step&&card.phase==='space'))!;
    expect(space.hand).toBe(initial+index);
    const travel=frames.flatMap(frame=>frame.cards).find(card=>card.step===step&&card.phase==='travel')!;
    expect(travel.inHand).toBe(true);expect(travel.stack).toBe(travel.slotStack);
  }
  await expect(page.locator(selector)).toHaveAttribute('data-hand-total',String(initial+2));
  await expect(page.locator('.public-flight')).toHaveCount(0);
});

for(const edge of ['south','west','north','east'])test(`Poseidon centers Drachma before gaining to the ${edge} discard`,async({page},info)=>{
  test.skip(info.project.name==='phone','The shared tabletop needs a large display.');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(`./dev/animations/?surface=tabletop&edge=${edge}&scenario=tribute-of-the-tides&players=4`);
  const trigger=page.getByRole('button',{name:'Trigger',exact:true});
  await expect(trigger).toBeEnabled();
  await page.locator('.buy-card[data-centered="true"]').press('Home');
  await expect(page.locator('.supply-coverflow')).toHaveAttribute('aria-busy','false');
  await page.getByRole('combobox',{name:'Playback speed',exact:true}).selectOption('0.5');
  await page.evaluate((edge)=>{
    const audit={centered:false,settled:false,card:'',landed:false,distance:Infinity};
    (window as Window & {poseidonAudit?:typeof audit}).poseidonAudit=audit;
    const original=Element.prototype.animate;
    Element.prototype.animate=function(...args){
      const animation=original.apply(this,args);
      if(this.matches('.public-flight[data-motion-kind="gain"]')){
        audit.card=this.querySelector<HTMLElement>('[data-card-id]')!.dataset.cardId!;
        audit.centered=document.querySelector('.buy-card[data-centered="true"]')?.getAttribute('data-supply-id')==='drachma';
        audit.settled=document.querySelector('.supply-coverflow')?.getAttribute('aria-busy')==='false';
        const node=this;
        void animation.finished.then(()=>{
          const flight=node.getBoundingClientRect();
          const pile=document.querySelector(`[data-public-zone="discard"][data-public-uid="tabletop-${edge}"]`)!.getBoundingClientRect();
          audit.distance=Math.hypot(flight.x+flight.width/2-pile.x-pile.width/2,flight.y+flight.height/2-pile.y-pile.height/2);
          audit.landed=true;
        },()=>undefined);
      }
      return animation;
    };
  },edge);
  await trigger.click();
  await expect(page.locator('.temple-zoom')).toBeVisible();
  await expect(page.locator('.supply-coverflow')).toHaveAttribute('aria-busy','true');
  await expect(page.locator('.public-flight[data-motion-kind="gain"]')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>(window as Window & {poseidonAudit?:{landed:boolean}}).poseidonAudit!.landed)).toBe(true);
  const audit=await page.evaluate(()=>(window as Window & {poseidonAudit?:{centered:boolean;settled:boolean;card:string;distance:number}}).poseidonAudit!);
  expect(audit.centered).toBe(true);
  expect(audit.settled).toBe(true);
  expect(audit.card).toBe('drachma');
  expect(audit.distance).toBeLessThan(0.01);
});

for(const scenario of ['harvest-feast','seed-keeper'])test(`tabletop hand unlocks after confirming ${scenario}`,async({page},info)=>{
  test.skip(info.project.name==='phone','The shared tabletop needs a large display.');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(`./dev/animations/?surface=tabletop&edge=south&scenario=${scenario}&players=4`);
  await page.getByRole('button',{name:'Trigger',exact:true}).click();
  const choice=page.locator('.inline-choice');
  await expect(choice).toBeVisible();
  await expect(choice).toHaveAttribute('aria-busy','false');
  const hand=page.locator('[data-edge="south"] .table-hand');
  await hand.getByRole('button',{name:/^Select /}).first().click();
  await expect(choice).toHaveAttribute('aria-busy','false');
  await choice.getByRole('button',{name:scenario==='harvest-feast'?'Discard selected (1)':'Done trashing (1)',exact:true}).click();
  await expect(choice).toHaveCount(0);
  const cards=hand.getByRole('button',{name:/^Play /});
  expect(await cards.count()).toBeGreaterThan(0);
  for(const card of await cards.all())await expect(card).toBeEnabled();
});
