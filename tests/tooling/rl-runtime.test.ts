import {expect,test} from 'bun:test';
import fixtures from './fixtures/rl-actors.json';
import {rlAction,rlCheckpointHash} from '../../src/lib/bots/rl';

for(const leader of ['melia','nereon','thaleia','doreios']){
 test(`${leader} browser actor matches frozen PyTorch decisions`,()=>{
  const examples=fixtures.filter(row=>row.leader===leader);
  expect(examples.length).toBeGreaterThanOrEqual(6);
  for(const row of examples){
   expect(rlCheckpointHash(leader)).toBe(row.checkpointSHA256);
   expect(rlAction(leader,row.observation,row.mask)).toBe(row.action);
  }
 });
}
