import json,sys,os,concurrent.futures,subprocess,time
from pathlib import Path
root=Path(__file__).resolve().parent
stage=sys.argv[1];plan=json.loads((root/'plan.json').read_text());out=root/stage;out.mkdir(exist_ok=True)
candidates=plan['candidates'] if stage=='screen' else json.loads((root/'shortlist.json').read_text())
if stage=='validation':candidates=[{'id':'selected-book','split':'all','book':json.loads((root/'selected-book.json').read_text())}]
jobs=[]
for c in candidates:
 for opp in plan['opponents']:
  seeds=list(range(plan['validation']['start'],plan['validation']['start']+plan['validation']['count'])) if stage=='validation' else plan[stage][c['split']]
  chunks=[seeds[i:i+10] for i in range(0,len(seeds),10)]
  for i,chunk in enumerate(chunks):
   name=c['id']+'-'+opp+'-'+str(i);dest=out/(name+'.jsonl')
   if dest.exists():raise RuntimeError('Refusing overwrite '+str(dest))
   job={'candidate':c['id'],'split':c['split'],'opponent':opp,'seeds':chunk,'book':c.get('book',{c['split']:c.get('cards')}),'output':str(dest)}
   path=out/(name+'.job.json');path.write_text(json.dumps(job));jobs.append(path)
t0=time.time()
def task(path):
 r=subprocess.run(['bun',str(root/'worker.ts'),str(path)],capture_output=True,text=True)
 if r.returncode:raise RuntimeError(path.name+' '+r.stderr)
 return json.loads(r.stdout)
with concurrent.futures.ThreadPoolExecutor(max_workers=os.cpu_count()) as pool:
 futures=[pool.submit(task,p) for p in jobs]
 for i,f in enumerate(concurrent.futures.as_completed(futures)):
  try:r=f.result()
  except Exception as e:print('ERROR '+str(e),flush=True);raise
  print(json.dumps({'done':i+1,'jobs':len(jobs),'elapsed':round(time.time()-t0),'result':r}),flush=True)
