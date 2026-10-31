"""Add the established planner to the exact production Nereon actor/critic."""
import json,os,shutil,subprocess,time
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
from run_nereon_planning_rl import sha,write,paired_table
R=Path('balance-results/nereon-main-planner-v1')
B=Path('balance-results/nereon-main-comparison-v1')

def main():
 if '--resume' not in os.sys.argv:
  R.mkdir(exist_ok=False);(R/'chunks').mkdir()
  prior=json.loads((B/'config.json').read_text());checkpoint=Path('balance-results/leader-rl-v1/nereon/champion.zip')
  assert sha(checkpoint)==prior['productionCheckpoint']
  for source,target in [(checkpoint,'production.zip'),(B/'production-nereon.json','actor.json'),(B/'pair-worker.js','pair-worker.js')]:shutil.copyfile(source,R/target)
  subprocess.run([os.sys.executable,'scripts/rl/export_signed_win_critic.py',str(R/'production.zip'),str(R/'actor.json'),str(R/'critic.json')],check=True)
  subprocess.run([os.sys.executable,'scripts/rl/verify_critic_export.py',str(R/'production.zip'),str(R/'critic.json'),str(R/'critic-validation.json')],check=True)
  manifest=json.loads((B/'manifest.json').read_text());assert 'nereon' not in manifest['planning']['policies']
  manifest['actors']['nereon']=dict(path=str((R/'actor.json').resolve()),sha256=sha(R/'actor.json'))
  rule=json.loads(Path('balance-results/nereon-planning-rl-v1/planned-manifest.json').read_text())['planning']['policies']['nereon']['rule']
  manifest['planning']['policies']['nereon']=dict(critic=dict(path=str((R/'critic.json').resolve()),sha256=sha(R/'critic.json')),rule=rule,useCurrentActor=True)
  write(R/'manifest.json',manifest);write(R/'worker.json',dict(leader='nereon',manifest=str(R/'manifest.json')))
  frozen=[R/'production.zip',R/'actor.json',R/'critic.json',R/'manifest.json',R/'worker.json',R/'pair-worker.js',B/'production.json']
  c=dict(mainCommit=prior['mainCommit'],checkpointSHA256=prior['productionCheckpoint'],prefix=prior['prefix'],games=400,workers=16,rule=rule,
   files={str(p):sha(p) for p in frozen},design='Production actor plus its exact matching critic; critic trained heads-up against MM with signed terminal outcome, used here experimentally in four-player lookahead. Same 400 games as production-only comparison. Freeze all opposing actors, critics, and their internal world models. Nereon planner uses current production Nereon for its own hypothetical continuations. 16 worlds, four candidates, four-own-turn horizon. Split ties; paired confidence intervals cluster four rotations per seed block. Reused benchmark, no automatic deployment.')
  write(R/'config.json',c)
 else:
  c=json.loads((R/'config.json').read_text());q=json.loads((R/'queue.json').read_text())
  try:os.kill(q['pid'],0)
  except ProcessLookupError:pass
  else:raise RuntimeError('Previous controller PID still exists')
 assert all(sha(Path(p))==h for p,h in c['files'].items())
 write(R/'queue.json',dict(pid=os.getpid(),started=time.time()))
 def game(index):
  p=R/'chunks'/f'{index:04}.json'
  if p.exists():part=json.loads(p.read_text())
  else:
   job=dict(prefix=c['prefix'],start=index,games=1)
   output=subprocess.run(['bun',str(R/'pair-worker.js'),str(R/'worker.json'),json.dumps(job)],check=True,capture_output=True,text=True)
   part=dict(job,**json.loads(output.stdout),manifestSHA256=sha(R/'manifest.json'));write(p,part)
  assert part['start']==index and part['prefix']==c['prefix'] and part['manifestSHA256']==sha(R/'manifest.json')
  assert len(part['rows'])==1 and part['rows'][0]['replayVerified']
  return part
 parts=[]
 with ThreadPoolExecutor(max_workers=16) as pool:
  for f in as_completed([pool.submit(game,i) for i in range(400)]):
   parts.append(f.result());print(json.dumps(dict(completed=len(parts),total=400)),flush=True)
 rows=[p['rows'][0] for p in sorted(parts,key=lambda p:p['start'])];write(R/'planned.json',rows)
 counts={leader:{key:sum(p['counts'][leader][key] for p in parts) for key in ['searched','overrides']} for leader in ['nereon','thaleia','doreios']}
 assert counts['nereon']['searched']>0
 result=dict(mainCommit=c['mainCommit'],gamesPerArm=400,table=paired_table(json.loads((B/'production.json').read_text()),rows),plannerCounts=counts,productionUpdated=False)
 assert all(sha(Path(p))==h for p,h in c['files'].items())
 write(R/'results.json',result);write(R/'queue-finished.json',dict(completed=True,time=time.time()));print(json.dumps(result,indent=2),flush=True)

if __name__=='__main__':main()
