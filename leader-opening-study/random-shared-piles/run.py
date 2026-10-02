import concurrent.futures,os,subprocess
from pathlib import Path
root=Path(__file__).resolve().parent
def run(i):
 r=subprocess.run(['bun',str(root/'runner.ts'),str(i)],capture_output=True,text=True)
 if r.returncode:raise RuntimeError(r.stderr)
 return i
with concurrent.futures.ThreadPoolExecutor(max_workers=os.cpu_count()) as pool:
 for i in pool.map(run,range(50)):print(i,flush=True)
