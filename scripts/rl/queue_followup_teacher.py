"""Run a frozen follow-up teacher only after its predecessor releases its workers."""
import json,os,subprocess,sys,time,shutil
from pathlib import Path
r,previous=map(Path,sys.argv[1:3]);gate=previous/'queue-finished.json';pid=json.loads((previous/'queue.json').read_text())['pid']
if (r/'queue.json').exists():raise RuntimeError('Teacher already queued; inspect live handle')
(r/'queue.json').write_text(json.dumps(dict(pid=os.getpid(),gate=str(gate),time=time.time()))+'\n')
while not gate.exists():
 try:os.kill(pid,0)
 except ProcessLookupError:raise RuntimeError('Preceding teacher ended without completion')
 time.sleep(5)
assert json.loads(gate.read_text())['completed']
while shutil.disk_usage('.').free<1024**3:time.sleep(15)
for script,label in [('search_rule_policy.py','search'),('report_rule_policy.py','report')]:
 with (r/f'{label}.log').open('w') as log:
  p=subprocess.Popen([sys.executable,'scripts/rl/'+script,str(r)],stdout=log,stderr=subprocess.STDOUT);print(json.dumps(dict(stage=label,pid=p.pid)),flush=True)
  if p.wait():raise RuntimeError(f'{label} failed; see its log. No games excluded.')
(r/'queue-finished.json').write_text(json.dumps(dict(time=time.time(),completed=True))+'\n')
