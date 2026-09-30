import os,sys,json,subprocess,time,concurrent.futures,pathlib
root=pathlib.Path(__file__).resolve().parent
label,start,n=sys.argv[1],int(sys.argv[2]),int(sys.argv[3])
out=root/label;out.mkdir(exist_ok=True)
leaders=['thaleia','nereon','melia','doreios'];strategies=['money','engine']
jobs=[(a,b,s,t,k,min(25,n-k)) for a in leaders for b in leaders if a!=b for s in strategies for t in strategies for k in range(0,n,25)]
manifest={'seedStart':start,'gamesPerCell':n,'cells':48,'workers':os.cpu_count(),'rules':'standard powers/worship, equal turns, original split ties','seedPrefix':'leader-matrix-v1','opening':'observed-budget book; no worship on first two turns','checkpoint':'7deefaa0'}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2))
def task(j):
 a,b,s,t,k,count=j;stem=f'{a}-{b}-{s}-{t}-{k}'
 p=out/(stem+'.jsonl')
 if p.exists():raise RuntimeError('Refusing overwrite '+str(p))
 result=subprocess.run(['bun',str(root/'worker.ts'),a,b,s,t,str(start+k),str(count),str(p)],capture_output=True,text=True)
 if result.returncode:raise RuntimeError(stem+' '+result.stderr)
 return result.stdout.strip()
t0=time.time()
with concurrent.futures.ThreadPoolExecutor(max_workers=os.cpu_count()) as pool:
 futures=[pool.submit(task,j) for j in jobs]
 for i,future in enumerate(concurrent.futures.as_completed(futures)):
  x=future.result()
  print(json.dumps({'done':i+1,'jobs':len(jobs),'elapsed':round(time.time()-t0),'worker':json.loads(x)}),flush=True)
