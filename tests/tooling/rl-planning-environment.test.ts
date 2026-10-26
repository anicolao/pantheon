import {test,expect} from 'bun:test';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {PlanningEnvironment} from '../../scripts/rl/planning_environment';
const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
test('learner changes do not alter the frozen opponent planning models',()=>{
 const dir=mkdtempSync(join(tmpdir(),'planning-world-'));
 try{
  const fixture=resolve('balance-results/thaleia-planner-v1');
  const actors=Object.fromEntries(['melia','nereon','thaleia','doreios'].map(l=>{const path=join(fixture,'actors',l+'.json');return [l,{path,sha256:sha(path)}];}));
  const world=join(dir,'world.json');writeFileSync(world,JSON.stringify({actors}));
  const c=JSON.parse(readFileSync(join(fixture,'config.json'),'utf8'));
  const policies=Object.fromEntries(['doreios','thaleia'].map(l=>{const path=join(fixture,l+'-critic.json');return [l,{critic:{path,sha256:sha(path)},rule:c[l+'Rule']}];}));
  const manifest={actors,planning:{worldManifest:world,policies}},original=join(dir,'original.json');writeFileSync(original,JSON.stringify(manifest));
  const before=new PlanningEnvironment('nereon',original),data=JSON.parse(readFileSync(actors.nereon.path,'utf8'));
  const bias=Buffer.from(data.layers.at(-1).bias,'base64');bias.writeFloatLE(bias.readFloatLE(0)+1,0);data.layers.at(-1).bias=bias.toString('base64');data.checkpointSHA256='test-mutated-policy';
  const changed=join(dir,'changed-actor.json');writeFileSync(changed,JSON.stringify(data));
  const afterPath=join(dir,'changed.json');writeFileSync(afterPath,JSON.stringify({...manifest,actors:{...actors,nereon:{path:changed,sha256:sha(changed)}}}));
  const after=new PlanningEnvironment('nereon',afterPath),obs=new Array(171).fill(0);
  expect(after.actors.nereon.logits(obs)[0]).not.toBe(before.actors.nereon.logits(obs)[0]);
  expect(after.worldActors.nereon.logits(obs)).toEqual(before.worldActors.nereon.logits(obs));
  expect(after.worldActors.nereon.checkpointSHA256).toBe(before.worldActors.nereon.checkpointSHA256);
  expect(after.planners.doreios.spec).toEqual(before.planners.doreios.spec);
  expect(after.planners.thaleia.spec).toEqual(before.planners.thaleia.spec);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
