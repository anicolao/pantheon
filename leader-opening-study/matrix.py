import os,json,subprocess,concurrent.futures,time,hashlib,sys
from pathlib import Path
from pool import CachedWorkers
from runlock import lock
root=Path(__file__).resolve().parent;control='--control' in sys.argv;name='control' if control else 'matrix';run_lock=lock(root,name);out=root/name;out.mkdir(exist_ok=True)
books=json.loads((root/'selected-books.json').read_text());leaders=['thaleia','nereon','melia','doreios'];kinds=['money','classic-engine']
start=400000;n=100 if control else 200;workers=os.cpu_count();jobs=[]
for a in leaders:
 for b in leaders:
  if a==b:continue
  for first in kinds:
   for second in kinds:
    if control and (first=='classic-engine')==(second=='classic-engine'):continue
    for k in range(0,n,2):
     id=f'{a}-{b}-{first}-{second}-{k}'
     jobs.append({'id':id,'lineup':[a,b],'kinds':[first,second],'books':[books[a] if first=='classic-engine' and not control else None,books[b] if second=='classic-engine' and not control else None],'seeds':list(range(start+k,start+min(k+2,n))),'firstSeed':start,'output':str(out/(id+'.jsonl'))})
source={}
for directory in ['src/lib/bots','src/lib/game','standard-matrix','balance-checkpoint','historical-thaleia/source']:
 for f in (root.parent/directory).rglob('*.ts'):source[str(f.relative_to(root.parent))]=hashlib.sha256(f.read_bytes()).hexdigest()
for name in ['runner.ts','daemon.ts','matrix.py']:
 f=root/name;source['leader-opening-study/'+name]=hashlib.sha256(f.read_bytes()).hexdigest()
f=root.parent/'historical-thaleia/profiles.json';source['historical-thaleia/profiles.json']=hashlib.sha256(f.read_bytes()).hexdigest()
manifest={'games':2400 if control else 9600,'cells':24 if control else 48,'gamesPerCell':n,'controlWithoutBooks':control,'seedStart':start,'seedPrefix':'leader-matrix-v1','rules':'standard leaders/Worship, equal turns, half-credit ties','strategies':kinds,'books':books,'sourceSHA256':source,'workers':workers,'gamesPerJob':2}
existing=out/'manifest.json'
if existing.exists():assert json.loads(existing.read_text())==manifest
else:existing.write_text(json.dumps(manifest,indent=2))
t0=time.time();cache=CachedWorkers(root)
def task(j):
 path=out/(j['id']+'.job.json')
 if Path(j['output']).exists():
  assert json.loads(path.read_text())==j
  records=[json.loads(l) for l in Path(j['output']).read_text().splitlines()]
  done=[r['seed'] for r in records];assert len(set(done))==len(done) and set(done)<=set(j['seeds'])
  remaining=[s for s in j['seeds'] if s not in done]
  if not remaining:return
  runjob={**j,'seeds':remaining};path=out/(j['id']+'.resume.json');path.write_text(json.dumps(runjob))
 else:path.write_text(json.dumps(j))
 cache.run(json.loads(path.read_text()))
with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
 fs=[pool.submit(task,j) for j in jobs]
 for i,f in enumerate(concurrent.futures.as_completed(fs)):
  f.result()
  if i%25==0 or i+1==len(fs):print(json.dumps({'done':i+1,'jobs':len(fs),'seconds':round(time.time()-t0)}),flush=True)
cache.close()
(out/'timing.json').write_text(json.dumps({'seconds':time.time()-t0}))
