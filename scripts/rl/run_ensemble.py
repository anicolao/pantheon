"""Frozen two-actor ensemble; screen then independently confirm without deployment."""
import hashlib,json,os,shutil,subprocess,sys,time,uuid
from pathlib import Path
def write(p,v):p.write_text(json.dumps(v,indent=2)+'\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 r=Path('balance-results/doreios-four-rl-v39');r.mkdir(exist_ok=False)
 s=Path('balance-results/doreios-four-rl-v32');secondary=Path('balance-results/doreios-four-rl-v23')
 for p in [s,secondary]:assert json.loads((p/'audit.json').read_text())['replaysVerified']==12800
 shutil.copytree(s/'actors',r/'actors');shutil.copyfile(s/'candidate.json',r/'actors/doreios.json');shutil.copyfile(secondary/'candidate.json',r/'secondary.json')
 m=json.loads((s/'opponents.json').read_text())
 for leader,entry in m['actors'].items():
  p=r/'actors'/f'{leader}.json'
  if leader!='doreios':assert sha(p)==entry['sha256']
  entry.update(path=str(p.resolve()),sha256=sha(p))
 write(r/'opponents.json',m)
 c=dict(output=str(r),opponentManifest=str(r/'opponents.json'),worker=str(r/'ensemble-worker.js'),secondaryActor=dict(path=str(r/'secondary.json'),sha256=sha(r/'secondary.json')),prefix='d4r39-'+uuid.uuid4().hex[:12],workers=4,chunkGames=64,trainGames=128,screenGames=512,screenTop=2,confirmationGames=6400,selection='Combine audited v32 and independently explored v23 frozen public-v1 actors. Secondary weight .25/.5/.75, with raw logits or legal-logit standardization. Both endpoints and all choices use public observations and legal masks; exact original-actor game parity checked before search. Probe128,best2+unchanged v32 screen512;freeze before6400fresh paired games/model;all actual games full-replayed. No deployment.')
 write(r/'config.json',c);write(r/'rules.json',[None,*[dict(weight=w,normalize=n) for w in [.25,.5,.75] for n in [False,True]]]);write(r/'queue.json',dict(pid=os.getpid(),time=time.time(),gate='v28/queue-finished.json'))
 subprocess.run(['bun','build','scripts/rl/ensemble_worker.ts','--target=bun','--outfile='+c['worker']],check=True)
 # Compare the entire actual outcomes at zero secondary weight to the original actor.
 jobs=[dict(prefix=c['prefix']+':parity',games=16,rule=rule) for rule in [None,dict(weight=0,normalize=False),dict(weight=0,normalize=True)]]
 proc=subprocess.run(['bun',c['worker'],str(r/'config.json')],input=''.join(json.dumps(j)+'\n' for j in jobs),text=True,capture_output=True,check=True)
 rows=[json.loads(line) for line in proc.stdout.splitlines()];assert len(rows)==3
 assert rows[0]==rows[1]==rows[2] and all(x['replayVerified'] for x in rows[0]['rows'])
 write(r/'endpoint-parity.json',dict(games=16,variants=3,exact=True,fullReplays=True,workerSHA256=sha(Path(c['worker']))))
 for path in ['scripts/rl','src/lib/bots','src/lib/game','standard-matrix','balance-checkpoint/equal-turns/source/scripts/balance']:shutil.copytree(path,r/'source'/path,ignore=shutil.ignore_patterns('__pycache__'),dirs_exist_ok=True)
 gate=Path('balance-results/doreios-four-rl-v28/queue-finished.json')
 while not gate.exists():time.sleep(10)
 assert json.loads(gate.read_text())['completed']
 for script,label in [('search_rollout.py','search'),('report_rule_policy.py','report')]:
  with (r/f'{label}.log').open('w') as log:subprocess.run([sys.executable,'scripts/rl/'+script,str(r)],stdout=log,stderr=subprocess.STDOUT,check=True)
 write(r/'queue-finished.json',dict(completed=True,time=time.time()))
if __name__=='__main__':main()
