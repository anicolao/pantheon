"""Cross-entropy search of legal-action preferences with independent screening."""
import hashlib,json,os,subprocess,sys,threading,time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from train_four import summary

root=Path(sys.argv[1]);c=json.loads((root/'config.json').read_text());rng=np.random.default_rng(c['seed']);start=time.monotonic()
protocol=dict(c,sourceHashes={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in Path('scripts/rl').glob('*') if p.is_file()},actorSHA256=hashlib.sha256(Path(c['actor']).read_bytes()).hexdigest())
if (root/'protocol.json').exists():
 if '--resume' not in sys.argv:raise RuntimeError('Refusing overwrite')
 old=json.loads((root/'protocol.json').read_text())
 assert all(old[k]==v for k,v in c.items()) and old['actorSHA256']==protocol['actorSHA256']
 (root/f'resume-{time.time_ns()}.json').write_text(json.dumps(protocol,indent=2)+'\n')
else:
 (root/'protocol.json').write_text(json.dumps(protocol,indent=2)+'\n')
(root/'jobs').mkdir(exist_ok=True);(root/'screens').mkdir(exist_ok=True)
names=json.loads(subprocess.check_output(['bun','-e',"import {biasNames} from './scripts/rl/bias_worker';console.log(JSON.stringify(biasNames))"],text=True));d=len(names)
local=threading.local();processes=[];lock=threading.Lock();counter=0

def worker(job):
 target=root/('screens' if job['screen'] else 'jobs')/(job['id']+'.json')
 if target.exists():
  try:cached=json.loads(target.read_text())
  except json.JSONDecodeError:
   target.rename(target.with_suffix('.interrupted-json'))
  else:
   assert all(cached[k]==v for k,v in job.items()),'Cached search protocol drift'
   assert len(cached['rows'])==job['games'] and cached['summary']==summary(cached['rows'])
   return cached
 if not hasattr(local,'proc'):
  local.proc=subprocess.Popen(['bun','scripts/rl/bias_worker.ts',str(root/'config.json')],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=None,text=True,bufsize=1)
  with lock:processes.append(local.proc)
 p=local.proc;p.stdin.write(json.dumps(job)+'\n');p.stdin.flush();line=p.stdout.readline()
 if not line:raise RuntimeError('Preference worker failed; no excluded games')
 result=json.loads(line);score=summary(result['rows']);record=dict(job,**result,summary=score)
 temporary=target.with_suffix('.tmp');temporary.write_text(json.dumps(record)+'\n');temporary.replace(target)
 return record

def job(parameters,prefix,games,screen=False):
 global counter
 counter+=1;return dict(id=f'{counter:05d}',parameters=np.asarray(parameters).tolist(),prefix=prefix,games=games,screen=screen)

def ranked(rows):return sorted(rows,key=lambda r:(r['summary']['share'],r['summary']['meanVP']),reverse=True)

zero=np.zeros(d);best=None;screened={};history=[]
with ThreadPoolExecutor(max_workers=c['workers']) as pool:
 try:
  def screen_many(entries):
   global best
   todo=[];keys=set(screened)
   for parameters,label in entries:
    key=json.dumps(np.asarray(parameters).tolist())
    if key not in keys:
     keys.add(key);todo.append((key,label,job(parameters,c['prefix']+':screen',c['screenGames'],True)))
   records=list(pool.map(worker,[item[2] for item in todo]))
   for (key,label,_),row in zip(todo,records,strict=True):
    screened[key]=row
    if best is None or row['summary']['share']>best['summary']['share']:
     best=row;(root/'best-screen.json').write_text(json.dumps(row)+'\n')
    history.append(dict(label=label,id=row['id'],summary=row['summary']))
    (root/'screening.json').write_text(json.dumps(history,indent=2)+'\n')
    print(json.dumps(dict(stage='screen',label=label,best=best['summary']['share'],**row['summary'])),flush=True)
  screen_many([(zero,'incumbent')])
  probe=[zero]
  for i,name in enumerate(names):
   values=[-6,-3,3,6,10] if name.startswith(('card:','worship:')) else ([-4,4] if name in ['select:obol','select:hamlet','select:skip'] else [])
   for value in values:
    x=zero.copy();x[i]=value;probe.append(x)
  rows=list(pool.map(worker,[job(x,c['prefix']+':probe',c['trainGames']) for x in probe]))
  screen_many([(row['parameters'],f'probe-{i}') for i,row in enumerate(ranked(rows)[:c['screenTop']])])
  mean=np.asarray(best['parameters']);sigma=np.full(d,2.5)
  for gen in range(c['generations']):
   population=[zero,mean.copy(),np.asarray(best['parameters'])]
   population += [np.clip(mean+rng.normal(size=d)*sigma,-12,12) for _ in range(c['population']-3)]
   rows=ranked(list(pool.map(worker,[job(x,c['prefix']+f':generation-{gen}',c['trainGames']) for x in population])))
   elite=np.asarray([r['parameters'] for r in rows[:c['elite']]])
   mean=.35*mean+.65*elite.mean(axis=0);sigma=np.maximum(.5,.35*sigma+.65*elite.std(axis=0))
   screen_many([(row['parameters'],f'g{gen}-{i}') for i,row in enumerate(rows[:c['screenTop']])])
   (root/f'generation-{gen}.json').write_text(json.dumps(dict(mean=mean.tolist(),sigma=sigma.tolist(),ranked=[dict(id=r['id'],summary=r['summary']) for r in rows]),indent=2)+'\n')
   print(json.dumps(dict(stage='generation',generation=gen,bestScreen=best['summary']['share'],elapsedSeconds=time.monotonic()-start)),flush=True)
  (root/'selection.json').write_text(json.dumps(dict(selected='selected',source=best['id'],screen=best['summary'],parameters=best['parameters'],vector=best['vector'],elapsedSeconds=time.monotonic()-start),indent=2)+'\n')
 finally:
  for p in processes:
   try:p.stdin.close();p.wait(timeout=30)
   except Exception:p.terminate()
