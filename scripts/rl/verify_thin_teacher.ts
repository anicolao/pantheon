import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {FourEnvironment} from './four_environment';
const root='balance-results/doreios-four-rl-v31',rule={floor:8,protect:[6,8],stopSupply:4},job={games:16,prefix:'temple-thin-baseline-parity',rule};
const proc=Bun.spawnSync(['bun',root+'/temple-thin-worker.js',root+'/config.json'],{stdin:Buffer.from(JSON.stringify(job)+'\n')});if(proc.exitCode)throw Error(proc.stderr.toString());const expected=JSON.parse(proc.stdout.toString()).rows;
const temp=mkdtempSync(join(tmpdir(),'thin-teacher-'));
try{
 const m=JSON.parse(readFileSync(root+'/opponents.json','utf8'));m.teacher='temple-order';m.teacherThinRule=rule;const path=join(temp,'manifest.json');writeFileSync(path,JSON.stringify(m));const env=new FourEnvironment('doreios',path),rows=[];
 for(let i=0;i<job.games;i++){let state=env.reset(job.prefix+':'+i,true);while(!state.done)state=env.step(env.teacher());rows.push(state.info);}
 if(!isDeepStrictEqual(rows,expected))throw Error('Teacher label integration changed game outcomes');
 const result={games:job.games,exactTeacherGameOutcomes:true,allReplayVerified:rows.every(x=>x.replayVerified)};writeFileSync('balance-results/doreios-four-rl-v32/thin-teacher-parity.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{rmSync(temp,{recursive:true,force:true});}
