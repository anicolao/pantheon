import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {setupExperiment} from '../../scripts/balance/experiment';
import {strategyView,inventoryAtSetup,updateInventory,cardValue} from '../../scripts/balance/strategy';
import {baseProfiles} from '../../scripts/balance/base-profiles';
import {engineCapacity,cardFeatures} from '../../scripts/balance/engine';
import {definition,activePlayer,applyPlayCommand} from '../../src/lib/game/actions';
const dir='balance-results/shared-endgame-validation-v1';
const {game}=setupExperiment('review-engine',['thaleia','nereon'],'base-game');
const v=strategyView(game,activePlayer(game),inventoryAtSetup(game,'base-game'),undefined,'base-game');
v.phase='buys';v.resources={coins:4,actions:0,buys:1,worship:0};v.endGamePolicy='turn-2';
const ids=['drachma','council-of-sages','harbor-pilot','sacred-academy','talent'];
for(const extra of [undefined,'council-of-sages']){
 const w={...v,owned:{...v.owned,...(extra?{[extra]:1}:{})}};
 console.log('SCORES',extra??'start',engineCapacity(w),ids.map(id=>({id,cost:definition(id).cost,features:cardFeatures(id,'base-game'),value:cardValue(w,baseProfiles.engine,id)})));
}
const sums:any={};
for(const file of readdirSync(dir).filter(x=>/^games-.*gz$/.test(x))){
 for(const line of gunzipSync(readFileSync(dir+'/'+file)).toString().trim().split('\n')){
 const r=JSON.parse(line);if(r.second!=='treasure@turn-2'||!['engine@turn-2','engine-thin@turn-2','treasure@turn-2'].includes(r.first))continue;
 for(const p of r.result.players){const k=r.first+'/'+p.position;const a=sums[k]??={n:0,turns:0,full:0,spare:0,unseen:0,size:0,first:0,vp:0,acq:{},trash:{}};
 a.n++;a.turns+=p.turns;a.full+=p.telemetry.fullDeckDraws;a.spare+=p.telemetry.spareActionsWithUnseen;a.unseen+=p.telemetry.unseenAtActionEnd;a.size+=p.telemetry.finalDeckSize;a.first+=p.telemetry.firstScoreTurn??p.turns;a.vp+=p.score;
 for(const [id,n] of Object.entries(p.telemetry.acquisitions))a.acq[id]=(a.acq[id]??0)+Number(n);
 for(const [id,n] of Object.entries(p.telemetry.trashes))a.trash[id]=(a.trash[id]??0)+Number(n);
 }
 }}
for(const [k,a]of Object.entries(sums) as any){console.log('METRICS',k,JSON.stringify({...a,full:a.full/a.turns,spare:a.spare/a.turns,unseen:a.unseen/a.turns,turns:a.turns/a.n,size:a.size/a.n,first:a.first/a.n,vp:a.vp/a.n,acq:Object.fromEntries(Object.entries(a.acq).map(([id,n])=>[id,Number(n)/a.n])),trash:Object.fromEntries(Object.entries(a.trash).map(([id,n])=>[id,Number(n)/a.n]))}));}
for(const first of ['engine','engine-thin']){
 const saved=JSON.parse(gunzipSync(readFileSync(dir+'/replays/0-'+first+'@turn-2-treasure@turn-2.json.gz')).toString());
 const {game,events}=setupExperiment(saved.options.seed,saved.options.lineup,'base-game');const inventory=inventoryAtSetup(game,'base-game'),acquired=new Set<string>();
 let seen=new Set<string>(),key='';const rows=[];
 for(const e of saved.events.slice(events.length)){
 const uid=activePlayer(game),pos=game.turnOrder.indexOf(uid),t=(game.turn.turns[uid]??0)+1;
 if(key!==uid+'/'+t){key=uid+'/'+t;seen=new Set(game.decks[uid].hand.map(c=>c.id));}
 if(e.type==='card/bought'&&pos===0){const view=strategyView(game,uid,inventory,undefined,'base-game',Math.max(0,Object.values(inventory[uid]).reduce((s,n)=>s+n,0)-seen.size));view.endGamePolicy='turn-2';
 const ranks=Object.keys(view.supply).filter(id=>view.supply[id]>0&&definition(id).cost!==null&&definition(id).cost!<=view.resources.coins).map(id=>({id,value:cardValue(view,baseProfiles[first],id)})).sort((a,b)=>b.value-a.value).slice(0,4);
 rows.push({turn:t,coins:view.resources.coins,buy:e.cardId,capacity:engineCapacity(view),ranks});}
 const start=game.movements.length;const msg=applyPlayCommand(game,uid,e,e.sequence,'base-game');game.activity.push({sequence:e.sequence,message:msg});updateInventory(inventory,game,start,acquired);
 if(e.type!=='turn/ended')for(const m of game.movements.slice(start))if(m.uid===uid&&m.kind==='draw'&&m.card)seen.add(m.card.id);
 }
 console.log('TRACE',first,JSON.stringify(rows));
}
