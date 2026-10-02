import {afterAll,beforeAll,expect,test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {collection,doc,getDoc,getDocs,updateDoc,writeBatch,serverTimestamp,type Firestore} from 'firebase/firestore';
import {enterRoom,inviteBot,automateHost,appendGameCommand} from '../../src/lib/backend/setup-repository';
import {replaySetup,type SetupEvent} from '../../src/lib/game/setup';
import {TableBotDriver} from '../../src/lib/bots/table';
let env:RulesTestEnvironment;
const db=(uid:string)=>env.authenticatedContext(uid).firestore() as unknown as Firestore;
const events=async(d:Firestore,id:string)=>(await getDocs(collection(d,'games',id,'events'))).docs.map(d=>d.data() as SetupEvent).sort((a,b)=>a.sequence-b.sequence);
beforeAll(async()=>{env=await initializeTestEnvironment({projectId:'demo-pantheon',firestore:{host:'127.0.0.1',port:8193,rules:readFileSync('firestore.rules','utf8')}});});
afterAll(async()=>{await env?.cleanup();});
test('host invites persistent bots; human joins preserve bot metadata; retries do not take another seat',async()=>{
 const d=db('bot-host');await enterRoom(d,'bots-join','bot-host','Host',4);
 await inviteBot(d,'bots-join','bot-host','money','bot-one');await inviteBot(d,'bots-join','bot-host','money','bot-one');
 await enterRoom(db('bot-guest'),'bots-join','bot-guest','Guest');
 await inviteBot(d,'bots-join','bot-host','engine','bot-two');
 const g=replaySetup(await events(d,'bots-join'));
 expect(g.players.map(p=>p.botKind??'human')).toEqual(['human','money','human','engine']);
 expect((await getDoc(doc(d,'games','bots-join'))).data()!.bots).toEqual({'bot-one':'money','bot-two':'engine'});
 await expect(inviteBot(d,'bots-join','bot-host','engine','bot-full')).rejects.toThrow('full');
 await expect(inviteBot(db('bot-guest'),'bots-join','bot-guest','engine','bot-forged')).rejects.toThrow('host');
 await assertFails(updateDoc(doc(db('bot-guest'),'games','bots-join'),{bots:{'bot-one':'engine'}}));
});
test('a bot invitation racing a human cannot overfill the last seat',async()=>{
 const d=db('race-bot-host');await enterRoom(d,'bots-race','race-bot-host','Host',2);
 const result=await Promise.allSettled([inviteBot(d,'bots-race','race-bot-host','money','bot-race'),enterRoom(db('race-bot-human'),'bots-race','race-bot-human','Guest')]);
 expect(result.filter(r=>r.status==='fulfilled')).toHaveLength(1);
 expect(replaySetup(await events(d,'bots-race')).players).toHaveLength(2);
});
test('bot commands authenticate, deduplicate, reject stale revisions and survive host reload',async()=>{
 const d=db('bot-play-host'),guest=db('bot-play-guest'),id='bots-play';
 await enterRoom(d,id,'bot-play-host','Host',3);await enterRoom(guest,id,'bot-play-guest','Guest');await inviteBot(d,id,'bot-play-host','classic-engine','bot-player');
 await automateHost(d,id,'bot-play-host','engine');await automateHost(d,id,'bot-play-host',null);
 expect(replaySetup(await events(d,id)).players[0].botKind).toBeUndefined();
 await appendGameCommand(d,id,'bot-play-host','begin',{type:'draft/started',seed:'bot-play'});
 await expect(automateHost(d,id,'bot-play-host','money')).rejects.toThrow('begun');
 await expect(appendGameCommand(guest,id,'bot-play-guest','forged',{type:'leader/chosen',leaderId:'thaleia'},undefined,'bot-player')).rejects.toThrow('host');
 const driver=new TableBotDriver();
 for(let i=0;i<3;i++){
  const es=await events(d,id),g=replaySetup(es),uid=g.draftOrder[Object.keys(g.leaders).length];
  if(uid==='bot-player'){
   const p=driver.next(es,'bot-play-host')!;expect(new TableBotDriver().next(es,'bot-play-host')).toEqual(p);
   // Bypassing the repository still cannot impersonate a bot from a guest account.
   const batch=writeBatch(guest),sequence=es.length+1;
   batch.update(doc(guest,'games',id),{revision:sequence,phase:i===2?'playing':'draft'});
   batch.set(doc(guest,'games',id,'events',String(sequence)),{schemaVersion:1,reducerVersion:1,sequence,actorUid:uid,name:'Classic Engine bot 3',playerCount:3,commandId:p.commandId,...p.command,createdAt:serverTimestamp()});
   await assertFails(batch.commit());
   await appendGameCommand(d,id,'bot-play-host',p.commandId,p.command,p.revision,p.actorUid);
   await appendGameCommand(d,id,'bot-play-host',p.commandId,p.command,p.revision,p.actorUid);
   expect((await events(d,id)).length).toBe(es.length+1);
  }else{
   const leader=['thaleia','nereon','melia','doreios'].find(l=>!Object.values(g.leaders).includes(l))!;
   await appendGameCommand(uid==='bot-play-host'?d:guest,id,uid,'draft-'+i,{type:'leader/chosen',leaderId:leader});
  }
 }
 const es=await events(d,id);
 await appendGameCommand(d,id,'bot-play-host','stale',{type:'turn/ended'},es.length-1,'bot-player');
 expect((await events(d,id)).length).toBe(es.length);
 expect(replaySetup(es).phase).toBe('playing');
});
