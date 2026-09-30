import {strictEqual} from 'node:assert';
import {createHash} from 'node:crypto';
import {runAgainstMoney} from './accepted-engine/runner';
const hashes=['581911eba8dff69e452877fd47438c56021e4480d07215f5da2eced05695dee7', 'a9e9687c97bdfbed03389843fc5587c1d61a5eea3a8868c3abcee4cc534df9c4', '41822d81a77b446312c2c0a16d0fc36e19eed8f85576a85b45d5fa1abc1d47ef', 'e7a0d137bdfc72cdb453079b7a27e7acd7d1c2add5dd728945b50ab2e7003820'];
let i=0;for(const seat of [0,1] as const)for(const seed of [220000,220001])strictEqual(createHash('sha256').update(JSON.stringify(runAgainstMoney(seed,seat))).digest('hex'),hashes[i++]);
console.log('Four frozen checkpoint game hashes verified');
