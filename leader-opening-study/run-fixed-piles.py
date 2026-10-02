import argparse, concurrent.futures, os, subprocess, time, json
from pathlib import Path
root=Path(__file__).resolve().parent
leaders=['thaleia','nereon','melia','doreios']
parser=argparse.ArgumentParser()
parser.add_argument('--counts',nargs='+',type=int,choices=range(4),default=list(range(4)))
counts=parser.parse_args().counts
jobs=[(count,i,a,b) for count in counts for n,a in enumerate(leaders) for b in leaders[n+1:] for i in range(500)]
def run(job):
 count,i,a,b=job
 r=subprocess.run(['bun',str(root/('random-fixed-piles-'+str(count))/'runner.ts'),str(i),a,b],capture_output=True,text=True)
 if r.returncode: raise RuntimeError(str(job)+'\n'+r.stderr)
 return job
t=time.monotonic()
with concurrent.futures.ThreadPoolExecutor(max_workers=os.cpu_count()) as pool:
 for i,_ in enumerate(pool.map(run,jobs)):
  if (i+1)%500==0: print(json.dumps(dict(games=2*(i+1),seconds=time.monotonic()-t)),flush=True)
result=dict(seconds=time.monotonic()-t,workers=os.cpu_count(),games=2*len(jobs),counts=counts)
(root/'fixed-piles-timing.json').write_text(json.dumps(result))
print(json.dumps(result))
