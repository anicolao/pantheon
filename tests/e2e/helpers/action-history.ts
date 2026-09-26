import { expect, type Page, type TestInfo } from '@playwright/test';
import { applyPlayCommand, activePlayer, definition, type ActionCommand } from '../../../src/lib/game/actions';
import { replaySetup, leaderIds, type SetupEvent } from '../../../src/lib/game/setup';
import { roomCodeFixture } from './room-code-fixture';
const root = 'http://127.0.0.1:8193/v1/projects/demo-pantheon/databases/(default)/documents';
const headers = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const value = (item: unknown): object => typeof item === 'string' ? { stringValue: item } : typeof item === 'number' ? { integerValue: String(item) } : Array.isArray(item) ? { arrayValue: { values: item.map(value) } } : { mapValue: { fields: fields(item as Record<string, unknown>) } };
const fields = (item: Record<string, unknown>) => Object.fromEntries(Object.entries(item).map(([key, entry]) => [key, value(entry)]));
export async function readEvents(code: string): Promise<SetupEvent[]> {
  const decode = (entry: Record<string, unknown>): unknown => 'stringValue' in entry ? entry.stringValue : 'integerValue' in entry ? Number(entry.integerValue) : 'arrayValue' in entry ? ((entry.arrayValue as { values?: Record<string, unknown>[] }).values ?? []).map(decode) : undefined;
  const documents: {fields:Record<string,Record<string,unknown>>}[] = [];
  let token = '';
  do {
    const response = await fetch(`${root}/games/${code}/events?pageSize=1000${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`, { headers });
    if (!response.ok) throw new Error(`Read ${code}: ${response.status}`);
    const data = await response.json(); documents.push(...(data.documents ?? [])); token = data.nextPageToken ?? '';
  } while (token);
  return documents.map(doc => Object.fromEntries(Object.entries(doc.fields).filter(([key]) => key !== 'createdAt').map(([key, val]) => [key, decode(val)])) as SetupEvent).sort((a,b) => a.sequence-b.sequence);
}
/** A legal recorded match prelude, not a runtime test mode or injected projection.
 * Purchase/cleanup commands prepare later turns before the Action UI is exercised.
 * All subsequent player commands go through the real authenticated repository/rules.
 */
export async function actionTable(page: Page, info: TestInfo, subject: string, leader = 'thaleia', options: { extra?: string[]; reveal?: 'Territory' | 'other'; other?: Page; count?: 2 | 3 | 4; empty?: string } = {}) {
  const count = options.count ?? 2;
  const code = await roomCodeFixture(page, { ...info, title: `${info.title}/${subject}/${leader}/${options.reveal ?? ''}${options.empty ? `/empty-${options.empty}` : ''}${count === 2 ? '' : `/${count}`}` } as TestInfo);
  await page.goto('./play/'); await page.getByLabel('Your name', {exact:true}).fill('Ariadne'); await page.getByRole('radio',{name:`${count} players`,exact:true}).check(); await page.getByRole('button',{name:'Create table',exact:true}).click(); await expect(page.getByTestId('player-seat')).toHaveCount(1);
  if (options.other) { await options.other.goto(page.url()); await options.other.getByLabel('Your name', {exact:true}).fill('Theseus'); await options.other.getByRole('button',{name:'Join table',exact:true}).click(); await expect(options.other.getByTestId('player-seat')).toHaveCount(2); }
  const events = await readEvents(code), host = events[0].actorUid, guest = events[1]?.actorUid ?? `observer-${code}`;
  if (events.length === 1) events.push({schemaVersion:1,sequence:2,actorUid:guest,name:'Theseus',playerCount:count,type:'player/joined'});
  for (let seat = events.length; seat < count; seat++) events.push({schemaVersion:1,sequence:events.length+1,actorUid:`observer-${code}-${seat}`,name:['Ariadne','Theseus','Iris','Leon'][seat],playerCount:count,type:'player/joined'});
  events.push({schemaVersion:1,reducerVersion:1,sequence:events.length+1,actorUid:host,name:'Ariadne',playerCount:count,type:'draft/started',seed:`actions-${code}`,commandId:'draft'});
  let game = replaySetup(events);
  const others = leaderIds.filter(id=>id!==leader);
  for (const uid of game.draftOrder) events.push({schemaVersion:1,reducerVersion:1,sequence:events.length+1,actorUid:uid,name:game.players.find(player=>player.uid===uid)!.name,playerCount:count,type:'leader/chosen',leaderId:uid===host?leader:others.shift()!,commandId:`leader-${uid}`});
  game = replaySetup(events);
  const append = (command: ActionCommand) => {
    const uid = activePlayer(game), sequence = events.length+1;
    const event: SetupEvent = {schemaVersion:1,reducerVersion:1,sequence,actorUid:uid,name:game.players.find(player=>player.uid===uid)!.name,playerCount:count,commandId:`prelude-${sequence}`,...command};
    const message = applyPlayCommand(game,uid,command,sequence); game.activity.push({sequence,message}); events.push(event);
  };
  const wanted = [subject,...(options.extra??[])].filter(id=>!definition(id).uniqueStartingCard), bought: string[] = [];
  let upgrades = 0;
  for (let turns=0; turns<300; turns++) {
    const uid = activePlayer(game), zones=game.decks[uid];
    if ((!options.empty || game.supply[options.empty] === 0) && uid===host && [subject,...(options.extra??[])].every(id=>zones.hand.some(card=>card.cardId===id)) && (!options.reveal || (zones.deck.length && (definition(zones.deck[0].cardId).type==='Territory') === (options.reveal==='Territory')))) break;
    // Temples are real plays; Nereon/Melia help reach the 5-cost cards naturally.
    if (uid===host) { const temple=zones.hand.find(card=>definition(card.cardId).uniqueStartingCard); if(temple) {append({type:'action/played',instanceId:temple.id}); if(game.turn.choice) append({type:'choice/resolved',choiceId:game.turn.choice.id,targets:[]});} }
    append({type:'phase/advanced'});
    if(uid===host) for(const card of [...zones.hand]) if(definition(card.cardId).type==='Treasure') append({type:'treasure/played',instanceId:card.id});
    append({type:'phase/advanced'});
    if(uid===host){ const next=wanted.find(id=>!bought.includes(id)); if(next && game.resources.coins>=definition(next).cost!){append({type:'card/bought',cardId:next});bought.push(next);} else if(next && game.resources.coins>=3 && upgrades<3){append({type:'card/bought',cardId:'drachma'});upgrades++;} else if(options.empty && game.supply[options.empty] > 0 && game.resources.coins >= definition(options.empty).cost!)append({type:'card/bought',cardId:options.empty}); }
    append({type:'turn/ended'});
    if(turns===299) throw new Error(`Could not reach Action fixture ${subject}`);
  }
  expect(activePlayer(game)).toBe(host); expect(game.turn.phase).toBe('actions'); expect(game.decks[host].hand.some(card=>card.cardId===subject)).toBe(true);
  expect(replaySetup(events)).toEqual(game);
  // Clear animation history in the presentation by entering at the completed prelude.
  await page.goto('./'); if (options.other) await options.other.goto('./');
  const writes = events.slice(1).map(event => ({update:{name:`projects/demo-pantheon/databases/(default)/documents/games/${code}/events/${event.sequence}`,fields:fields(event)}}));
  for(let i=0;i<writes.length;i+=200){ const result=await fetch(`${root}:commit`,{method:'POST',headers,body:JSON.stringify({writes:writes.slice(i,i+200)})});expect(result.ok).toBe(true); }
  const result=await fetch(`${root}/games/${code}`,{method:'PATCH',headers,body:JSON.stringify({fields:fields({owner:host,members:game.players.map(player=>player.uid),playerCount:count,revision:events.length,phase:'playing'})})});expect(result.ok).toBe(true);
  await page.goto(`./play/?room=${code}`); await expect(page.locator('[data-status]')).toHaveAttribute('data-status','synced');
  if (options.other) { await options.other.goto(page.url()); await expect(options.other.locator('[data-status]')).toHaveAttribute('data-status','synced'); }
  return {code,host,guest,game,events};
}
export async function playCard(page:Page,id:string){
  for(let i=0;i<20;i++){
    const face=page.locator(`.hand [data-card-id="${id}"]`);
    if(await face.count()){const index=await face.first().evaluate(node=>[...node.closest('.hand')!.querySelectorAll('[data-card-id]')].indexOf(node));await page.getByTestId('hand-card').nth(index).click();await page.getByRole('button',{name:`Play ${definition(id).name}`,exact:true}).click();await expect(page.locator(`.played-cards [data-card-id="${id}"]`)).toHaveCount(1);return;}
    const next=page.getByRole('button',{name:'Next hand cards',exact:true});if(!await next.isEnabled())break;await next.click();
  }
  throw new Error(`Card ${id} was not in hand`);
}
