"""Bounded process scheduler; preserve per-job logs and stop on the first failure."""
import argparse,json,subprocess,sys,time
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('script');p.add_argument('configs',nargs='+');p.add_argument('--parallel',type=int,default=2);args=p.parse_args()
pending=list(args.configs);running=[]
try:
 while pending or running:
  while pending and len(running)<args.parallel:
   path=pending.pop(0);c=json.loads(Path(path).read_text());out=Path(c['output']);out.mkdir(parents=True,exist_ok=True)
   if (out/'run.log').exists():raise RuntimeError(f'Refusing to overwrite {out}/run.log')
   log=(out/'run.log').open('w');child=subprocess.Popen([sys.executable,args.script,path],stdout=log,stderr=subprocess.STDOUT);running.append((child,log,path));print(json.dumps(dict(started=path,pid=child.pid)),flush=True)
  for child,log,path in running[:]:
   code=child.poll()
   if code is not None:
    log.close();running.remove((child,log,path));print(json.dumps(dict(completed=path,exitCode=code)),flush=True)
    if code:raise RuntimeError(f'Failed: {path}')
  if running:time.sleep(.5)
finally:
 for child,log,path in running:
  if child.poll() is None:child.terminate()
  try:child.wait(timeout=15)
  except subprocess.TimeoutExpired:child.kill();child.wait()
  log.close()
