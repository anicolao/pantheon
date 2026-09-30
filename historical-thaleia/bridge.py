import json,sys,os,concurrent.futures,subprocess,time
from pathlib import Path
root=Path(__file__).resolve().parent
out=root/('bridge-'+sys.argv[1]);out.mkdir(exist_ok=True)
jobs=[]
for opp in ['nereon','melia','doreios']:
 for i in range(10):
  name=opp+'-'+str(i);dest=out/(name+'.jsonl')
  if dest.exists():raise RuntimeError('Refusing overwrite '+str(dest))
  job={'candidate':'historical-v4-bridge','oldOpponent':True,'equalTurns':sys.argv[1]=='equal','opponent':opp,'seeds':list(range(240000+i*10,240010+i*10)),'output':str(dest)}
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
