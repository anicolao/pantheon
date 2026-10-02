import concurrent.futures,os,subprocess,time,json
from pathlib import Path
root=Path(__file__).resolve().parent
leaders=['thaleia','nereon','melia','doreios']
jobs=[(i,a,b) for n,a in enumerate(leaders) for b in leaders[n+1:] for i in range(50)]
def run(job):
 i,a,b=job
 r=subprocess.run(['bun',str(root/'runner.ts'),str(i),a,b],capture_output=True,text=True)
 if r.returncode:raise RuntimeError(r.stderr)
 return job
t=time.monotonic()
with concurrent.futures.ThreadPoolExecutor(max_workers=os.cpu_count()) as pool:
 for i,_ in enumerate(pool.map(run,jobs)):pass
(root/'timing.json').write_text(json.dumps({'seconds':time.monotonic()-t,'workers':os.cpu_count(),'games':600}))
print((root/'timing.json').read_text())
