import subprocess,concurrent.futures,os,json
from pathlib import Path
root=Path(__file__).resolve().parent
def run(job):
 seed,reverse=job
 p=root/f'{seed}-{"reverse" if reverse else "forward"}.json'
 if p.exists():return
 r=subprocess.run(['bun',str(root/'diagnose.ts'),str(seed)]+(['reverse'] if reverse else []),text=True,capture_output=True)
 if r.returncode:raise RuntimeError(r.stderr)
 json.loads(r.stdout);p.write_text(r.stdout)
with concurrent.futures.ThreadPoolExecutor(max_workers=os.cpu_count()) as pool:
 for i,_ in enumerate(pool.map(run,[(s,r) for s in range(400000,400020) for r in [False,True]])):print(i+1,flush=True)
