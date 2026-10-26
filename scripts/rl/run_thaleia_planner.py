"""Predeclared paired test: Doreios planner alone versus Doreios and Thaleia planners."""
import hashlib,json,math,os,shutil,statistics,subprocess,sys,time
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
def write(p,v):p.write_text(json.dumps(v,indent=2)+'\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 r=Path('balance-results/thaleia-planner-v1');r.mkdir(exist_ok=False);s=Path('balance-results/doreios-four-rl-v28');tc=Path('balance-results/thaleia-four-rl-v1/checkpoint-524288.zip')
 old=json.loads((s/'config.json').read_text());result=json.loads((s/'results.json').read_text());assert result['replayVerifiedGames']==6400 and result['improvementConfirmed']
 shutil.copytree(s/'actors',r/'actors');shutil.copyfile(s/'critic.json',r/'doreios-critic.json');shutil.copyfile(tc,r/'thaleia-checkpoint.zip')
 manifest=json.loads((s/'opponents.json').read_text())
 for leader,entry in manifest['actors'].items():
  path=r/'actors'/f'{leader}.json';assert sha(path)==entry['sha256'];entry['path']=str(path.resolve())
 write(r/'opponents.json',manifest)
 subprocess.run([sys.executable,'scripts/rl/export_signed_win_critic.py',str(r/'thaleia-checkpoint.zip'),str(r/'actors/thaleia.json'),str(r/'thaleia-critic.json')],check=True)
 # Confirm the checkpoint's training reward from its frozen protocol, rather than guessing.
 reward=json.loads(Path('balance-results/thaleia-four-rl-v1/protocol.json').read_text())['reward'];assert reward=='2 * split win credit - 1; no intermediate reward'
 dr=result['rule'];tr=dict(dr,utility='win')
 c=dict(output=str(r),opponentManifest=str(r/'opponents.json'),worker=str(r/'two-planner-worker.js'),doreiosCritic=dict(path=str(r/'doreios-critic.json'),sha256=sha(r/'doreios-critic.json')),thaleiaCritic=dict(path=str(r/'thaleia-critic.json'),sha256=sha(r/'thaleia-critic.json')),doreiosRule=dr,thaleiaRule=tr,prefix=old['prefix']+':confirm',games=400,workers=12,chunkGames=4,baselineSource=str(s/'jobs/candidate.json'),protocol='Fixed first400 existing v28 confirmation games (100 seed blocks x four seat rotations), no new selection or tuning. Doreios retains exact confirmed planner in both arms. Add Thaleia planner with same16samples/4candidates/risk1/four-own-turn horizon; Thaleia uses its own frozen signed-win critic normalized(value+1)/2 and exact split-win terminal utility. Doreios retains margin critic/utility. Hypothetical continuations use frozen plain actors, not nested planners. Verify16 cached baseline games exactly before comparison; full-state replay every actual game. Report all four shares and paired seed-block CIs. No deployment.')
 write(r/'config.json',c);write(r/'queue.json',dict(pid=os.getpid(),time=time.time()))
 subprocess.run(['bun','build','scripts/rl/two_planner_worker.ts','--target=bun','--outfile='+c['worker']],check=True)
 write(r/'protocol.json',dict(c,workerSHA256=sha(Path(c['worker'])),sourceCommit=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),sourceHashes={str(p):sha(p) for p in Path('scripts/rl').glob('*') if p.is_file()},baselineSHA256=sha(Path(c['baselineSource'])),thaleiaCheckpointSHA256=sha(tc),thaleiaTrainingReward=reward))
 for path in ['scripts/rl','src/lib/bots','src/lib/game','standard-matrix','balance-checkpoint/equal-turns/source/scripts/balance']:shutil.copytree(path,r/'source'/path,ignore=shutil.ignore_patterns('__pycache__'),dirs_exist_ok=True)
 baseline=json.loads(Path(c['baselineSource']).read_text())['rows'][:c['games']];write(r/'baseline.json',baseline)
 (r/'chunks').mkdir()
 def run(start,planning):
  job=dict(prefix=c['prefix'],start=start,games=c['chunkGames'],thaleiaPlanner=planning)
  p=subprocess.run(['bun',c['worker'],str(r/'config.json')],input=json.dumps(job)+'\n',text=True,capture_output=True,check=True)
  value=dict(job,**json.loads(p.stdout));assert len(value['rows'])==job['games'] and all(x['replayVerified'] for x in value['rows'])
  write(r/'chunks'/f'{"candidate" if planning else "parity"}-{start}.json',value);return value
 with ThreadPoolExecutor(max_workers=4) as pool:parity=list(pool.map(lambda start:run(start,False),[0,4,196,396]))
 for chunk in parity:assert chunk['rows']==baseline[chunk['start']:chunk['start']+chunk['games']] and chunk['counts']['thaleia']==dict(overrides=0,searched=0)
 oldchunk=json.loads((s/'chunks/candidate-0.json').read_text())
 for key in ['overrides','searched']:assert sum(x['counts']['doreios'][key] for x in parity[:2])==oldchunk[key]
 write(r/'baseline-parity.json',dict(games=16,exactOutcomes=True,exactFirstEightSearchCounts=True,fullReplays=True))
 print('Baseline parity passed; starting400 fixed candidate games',flush=True)
 chunks=[]
 with ThreadPoolExecutor(max_workers=c['workers']) as pool:
  jobs=[pool.submit(run,start,True) for start in range(0,c['games'],c['chunkGames'])]
  for future in as_completed(jobs):chunks.append(future.result());print(json.dumps(dict(completed=len(chunks)*c['chunkGames'],total=c['games'])),flush=True)
 chunks.sort(key=lambda x:x['start']);candidate=[row for chunk in chunks for row in chunk['rows']];write(r/'candidate.json',candidate)
 def credit(row,leader):scores=row['scores'];top=max(scores.values());return (1/sum(x==top for x in scores.values())) if scores[leader]==top else 0
 def ci(values):mean=statistics.mean(values);half=1.96*statistics.stdev(values)/math.sqrt(len(values));return dict(mean=mean,CI95=[mean-half,mean+half])
 table={}
 for leader in ['melia','nereon','thaleia','doreios']:
  before=[];after=[]
  for start in range(0,c['games'],4):
   b=baseline[start:start+4];a=candidate[start:start+4]
   assert [(x['seed'],x['seat'],x['turnPosition']) for x in a]==[(x['seed'],x['seat'],x['turnPosition']) for x in b]
   assert len({x['block'] for x in a})==1 and {x['rotation'] for x in a}==set(range(4))
   before.append(statistics.mean(credit(x,leader) for x in b));after.append(statistics.mean(credit(x,leader) for x in a))
  table[leader]=dict(before=ci(before),after=ci(after),paired=ci([a-b for a,b in zip(after,before)]))
 outcome=dict(gamesPerArm=c['games'],seedBlocks=c['games']//4,table=table,fullReplaysVerified=2*c['games'],baselineReused=True,baselineReproducedGames=16,counts={leader:{key:sum(x['counts'][leader][key] for x in chunks) for key in ['searched','overrides']} for leader in ['doreios','thaleia']},productionUpdated=False)
 write(r/'results.json',outcome)
 lines=[c['protocol'],'','Leader | Doreios planning only | Both planning | Paired change (95% CI)']
 for leader,t in table.items():d=t['paired'];lines.append(f"{leader}: {t['before']['mean']:.2%} | {t['after']['mean']:.2%} | {100*d['mean']:+.2f}pp [{100*d['CI95'][0]:+.2f}, {100*d['CI95'][1]:+.2f}]")
 (r/'report.txt').write_text('\n'.join(lines)+'\n');write(r/'queue-finished.json',dict(completed=True,time=time.time()));print('\n'.join(lines),flush=True)
if __name__=='__main__':main()
