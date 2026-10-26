"""Cross-entropy search of public-state preferences, with separate screening and confirmation."""
import json,sys,subprocess,threading,hashlib,time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from train_four import summary
r=Path(sys.argv[1]);c=json.loads((r/'config.json').read_text());local=threading.local();procs=[];lock=threading.Lock();rng=np.random.default_rng(c['seed'])
if (r/'protocol.json').exists():raise RuntimeError('Refusing overwrite')
(r/'jobs').mkdir();(r/'chunks').mkdir();(r/'protocol.json').write_text(json.dumps(dict(c,sourceHashes={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in [Path('scripts/rl/preference_policy.ts'),Path(c['worker']),Path(__file__)]}),indent=2)+'\n')
def run(job):
 if not hasattr(local,'p'):
  local.p=subprocess.Popen(['bun',c['worker'],str(r/'config.json')],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,bufsize=1)
  with lock:procs.append(local.p)
 p=local.p;p.stdin.write(json.dumps(job)+'\n');p.stdin.flush();line=p.stdout.readline()
 if not line:raise RuntimeError('Preference game failed; no exclusions')
 row=dict(job,**json.loads(line));return row
mean=np.zeros(c['dimensions']);sigma=np.full(c['dimensions'],1.5);all_screens=[];best_rule=None
with ThreadPoolExecutor(max_workers=c['workers']) as pool:
 def assess(jobs):
  rows=list(pool.map(run,jobs))
  for row in rows:row['summary']=summary(row['rows']);(r/'jobs'/f"{row['id']}.json").write_text(json.dumps(row)+'\n')
  return rows
 try:
  base=assess([dict(id='screen-incumbent',rule=None,prefix=c['prefix']+':screen',games=c['screenGames'])])[0];all_screens.append(base)
  for generation in range(c['generations']):
   parameters=[mean.copy(),np.zeros(c['dimensions']) if best_rule is None else np.array(best_rule['parameters'])]
   parameters.extend(np.clip(rng.normal(mean,sigma),-6,6) for _ in range(c['population']-2))
   jobs=[dict(id=f'g{generation}-{i}',rule=dict(parameters=p.astype(np.float32).tolist()),prefix=c['prefix']+f':train{generation}',games=c['trainGames']) for i,p in enumerate(parameters)]
   rows=assess(jobs);ranked=sorted(rows,key=lambda x:x['summary']['share'],reverse=True);elite=np.array([x['rule']['parameters'] for x in ranked[:c['elite']]])
   mean=.4*mean+.6*elite.mean(0);sigma=np.maximum(.15,.2*sigma+.8*elite.std(0))
   screens=assess([dict(id=f'screen-g{generation}-{i}',rule=x['rule'],prefix=c['prefix']+':screen',games=c['screenGames']) for i,x in enumerate(ranked[:c['screenTop']])]);all_screens.extend(screens)
   best=max(all_screens,key=lambda x:x['summary']['share']);best_rule=best['rule']
   (r/f'generation-{generation}.json').write_text(json.dumps(dict(mean=mean.tolist(),sigma=sigma.tolist(),bestScreen=best['summary'],bestSource=best['id'],bestRule=best_rule),indent=2)+'\n')
   print(json.dumps(dict(stage='generation',generation=generation,bestScreen=best['summary'],bestSource=best['id'])),flush=True)
  best=max(all_screens,key=lambda x:x['summary']['share']);(r/'selection.json').write_text(json.dumps(dict(rule=best['rule'],screen=best['summary'],source=best['id'],options=[dict(source=x['id'],rule=x['rule'],summary=x['summary']) for x in all_screens]),indent=2)+'\n')
  jobs=[dict(id=name,rule=rule,prefix=c['prefix']+':confirm',games=c['confirmationGames']) for name,rule in [('incumbent',None),('candidate',best['rule'])]]
  parts=list(pool.map(run,[dict(j,start=start,games=min(c['chunkGames'],j['games']-start)) for j in jobs for start in range(0,j['games'],c['chunkGames'])]))
  for p in parts:(r/'chunks'/f"{p['id']}-{p['start']}.json").write_text(json.dumps(p)+'\n')
  finals=[]
  for job in jobs:
   pieces=[p for p in parts if p['id']==job['id']];row=dict(job,rows=[x for p in pieces for x in p['rows']],overrides=sum(p['overrides'] for p in pieces));row['summary']=summary(row['rows']);(r/'jobs'/f"{row['id']}.json").write_text(json.dumps(row)+'\n');finals.append(dict(id=row['id'],summary=row['summary'],overrides=row['overrides']))
  (r/'confirmation.json').write_text(json.dumps(finals,indent=2)+'\n');print(json.dumps(dict(stage='confirm',models=finals)),flush=True)
 finally:
  for p in procs:p.stdin.close();p.wait(timeout=30)
