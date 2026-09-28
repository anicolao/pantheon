import {expect,type Page,type TestInfo} from '@playwright/test';
import {replaySetup,leaderIds,type SetupEvent,type SetupState} from '../../../src/lib/game/setup';
import {activePlayer,applyPlayCommand} from '../../../src/lib/game/actions';
import {readEvents} from './action-history';
import {roomCodeFixture} from './room-code-fixture';
import {matchCommand,type MatchGoal} from '../../helpers/match-policy';
const ending=(game:SetupState)=>game.supply.acropolis===0||Object.values(game.supply).filter(n=>n===0).length>=3;
const value=(item:unknown):object=>typeof item==='string'?{stringValue:item}:typeof item==='number'?{integerValue:String(item)}:Array.isArray(item)?{arrayValue:{values:item.map(value)}}:{mapValue:{fields:fields(item as Record<string,unknown>)}};
const fields=(item:Record<string,unknown>)=>Object.fromEntries(Object.entries(item).map(([key,val])=>[key,value(val)]));
export async function finalTurn(page:Page,info:TestInfo,{count=2,goal='acropolis',last=false,other}:{count?:2|3|4;goal?:MatchGoal;last?:boolean;other?:Page}={}){
  info.annotations.push({type:'setup',description:'Recorded-history integration scenario. A complete legal match prepares the last cleanup in the emulator. The illustrated journey begins before the ending turn is confirmed; the prior turns are not presented as UI interactions.'});
  const code=await roomCodeFixture(page,info);
  await page.goto('./play/');await page.getByLabel('Your name',{exact:true}).fill('Ariadne');await page.getByRole('radio',{name:`${count} players`,exact:true}).check();await page.getByRole('button',{name:'Create table',exact:true}).click();await expect(page.getByTestId('player-seat')).toHaveCount(1);
  if(other){await other.goto(page.url());await other.getByLabel('Your name',{exact:true}).fill('Theseus');await other.getByRole('button',{name:'Join table',exact:true}).click();await expect(other.getByTestId('player-seat')).toHaveCount(2);}
  const events=await readEvents(code),host=events[0].actorUid;
  for(let i=events.length;i<count;i++)events.push({schemaVersion:1,sequence:events.length+1,type:'player/joined',actorUid:`match-${code}-${i}`,name:['Ariadne','Theseus','Iris','Leon'][i],playerCount:count});
  let game!:SetupState,seed='';
  for(let i=0;i<100;i++){
    seed=`match-${count}-${goal}-${last}-${i}`;
    game=replaySetup([...events,{schemaVersion:1,reducerVersion:1,sequence:events.length+1,type:'draft/started',actorUid:host,name:'Ariadne',playerCount:count,seed,commandId:'start'}]);
    if(game.turnOrder.indexOf(host)===(last?count-1:0))break;
  }
  events.push({schemaVersion:1,reducerVersion:1,sequence:events.length+1,type:'draft/started',actorUid:host,name:'Ariadne',playerCount:count,seed,commandId:'start'});
  const leaders=leaderIds.filter(id=>id!=='thaleia');
  for(const uid of game.draftOrder)events.push({schemaVersion:1,reducerVersion:1,sequence:events.length+1,type:'leader/chosen',actorUid:uid,name:game.players.find(p=>p.uid===uid)!.name,playerCount:count,leaderId:uid===host?'thaleia':leaders.shift()!,commandId:`leader-${uid}`});
  game=replaySetup(events);
  for(let i=0;i<4000;i++){
    const command=matchCommand(game,goal,host),uid=activePlayer(game);
    if(command.type==='turn/ended'&&ending(game))break;
    const sequence=events.length+1,event:SetupEvent={schemaVersion:1,reducerVersion:1,sequence,actorUid:uid,name:game.players.find(p=>p.uid===uid)!.name,playerCount:count,commandId:`record-${sequence}`,...command};
    const message=applyPlayCommand(game,uid,command,sequence);game.activity.push({sequence,message});events.push(event);
    if(i===3999)throw Error('The legal match did not reach its ending');
  }
  expect(activePlayer(game)).toBe(host);expect(ending(game)).toBe(true);expect(game.turn.phase).not.toBe('finished');expect(replaySetup(events)).toEqual(game);
  await page.goto('./');if(other)await other.goto('./');
  const root='http://127.0.0.1:8193/v1/projects/demo-pantheon/databases/(default)/documents',headers={Authorization:'Bearer owner','Content-Type':'application/json'};
  const writes=events.slice(1).map(event=>({update:{name:`projects/demo-pantheon/databases/(default)/documents/games/${code}/events/${event.sequence}`,fields:fields(event)}}));
  for(let i=0;i<writes.length;i+=200){const response=await fetch(`${root}:commit`,{method:'POST',headers,signal:AbortSignal.timeout(2000),body:JSON.stringify({writes:writes.slice(i,i+200)})});expect(response.ok).toBe(true);}
  const response=await fetch(`${root}/games/${code}`,{method:'PATCH',headers,signal:AbortSignal.timeout(2000),body:JSON.stringify({fields:fields({owner:host,members:game.players.map(p=>p.uid),playerCount:count,revision:events.length,phase:'playing'})})});expect(response.ok).toBe(true);
  await page.goto(`./play/?room=${code}`);await expect(page.locator('[data-status]')).toHaveAttribute('data-status','synced');if(other){await other.goto(page.url());await expect(other.locator('[data-status]')).toHaveAttribute('data-status','synced');}
  return {code,host,events,game};
}
