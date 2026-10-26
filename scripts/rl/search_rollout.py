"""Predeclared public-belief teacher comparison, sharded by complete seed blocks."""
import json,sys,subprocess,threading,hashlib,time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from train_four import summary
r=Path(sys.argv[1]);c=json.loads((r/'config.json').read_text());local=threading.local();procs=[];lock=threading.Lock()
if (r/'protocol.json').exists():raise RuntimeError('Refusing overwrite')
(r/'jobs').mkdir();(r/'chunks').mkdir();(r/'protocol.json').write_text(json.dumps(dict(c,sourceHashes={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in [Path('scripts/rl/belief_rollout.ts'),Path(c['worker']),Path(__file__)]}),indent=2)+'\n')
def run(job):
 if not hasattr(local,'p'):
  local.p=subprocess.Popen(['bun',c['worker'],str(r/'config.json')],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,bufsize=1)
  with lock:procs.append(local.p)
 p=local.p;p.stdin.write(json.dumps(job)+'\n');p.stdin.flush();line=p.stdout.readline()
 if not line:raise RuntimeError('Teacher game failed; no exclusions')
 row=dict(job,**json.loads(line));(r/'chunks'/f"{job['id']}-{job['start']}.json").write_text(json.dumps(row)+'\n');return row
rules=json.loads((r/'rules.json').read_text())
with ThreadPoolExecutor(max_workers=c['workers']) as pool:
 def batch(jobs):
  parts=list(pool.map(run,[dict(j,start=start,games=min(c['chunkGames'],j['games']-start)) for j in jobs for start in range(0,j['games'],c['chunkGames'])]));rows=[]
  for job in jobs:
   pieces=[p for p in parts if p['id']==job['id']];row=dict(job,rows=[v for p in pieces for v in p['rows']],overrides=sum(p['overrides'] for p in pieces),searched=sum(p['searched'] for p in pieces));row['summary']=summary(row['rows']);(r/'jobs'/f"{job['id']}.json").write_text(json.dumps(row)+'\n');rows.append(row)
  return rows
 try:
  probes=batch([dict(id=f'probe-{i}',rule=rule,prefix=c['prefix']+':probe',games=c['trainGames']) for i,rule in enumerate(rules)])
  selected=[probes[0],*sorted(probes[1:],key=lambda x:x['summary']['share'],reverse=True)[:c['screenTop']]]
  print(json.dumps(dict(stage='probe',options=[dict(rule=x['rule'],summary=x['summary']) for x in probes])),flush=True)
  screens=batch([dict(id=f'screen-{i}',rule=x['rule'],prefix=c['prefix']+':screen',games=c['screenGames']) for i,x in enumerate(selected)])
  best=max(screens,key=lambda x:x['summary']['share']);(r/'selection.json').write_text(json.dumps(dict(rule=best['rule'],screen=best['summary'],source=best['id'],options=[dict(rule=x['rule'],summary=x['summary']) for x in screens]),indent=2)+'\n')
  print(json.dumps(dict(stage='selected',rule=best['rule'],screen=best['summary'])),flush=True)
  finals=batch([dict(id=name,rule=rule,prefix=c['prefix']+':confirm',games=c['confirmationGames']) for name,rule in [('incumbent',None),('candidate',best['rule'])]])
  (r/'confirmation.json').write_text(json.dumps([dict(id=x['id'],rule=x['rule'],summary=x['summary'],overrides=x['overrides']) for x in finals],indent=2)+'\n')
 finally:
  for p in procs:p.stdin.close();p.wait(timeout=30)
