"""Start the Athena teacher after the auxiliary training/audit workers are released."""
import json,os,subprocess,sys,time,shutil
from pathlib import Path
r=Path('balance-results/doreios-four-rl-v25');gate=Path('balance-results/doreios-four-rl-v22/queue-finished.json')
if (r/'queue.json').exists():raise RuntimeError('Athena study already queued; inspect its live handle')
(r/'queue.json').write_text(json.dumps(dict(pid=os.getpid(),gate=str(gate),time=time.time()))+'\n')
while not gate.exists():
 try:os.kill(49845,0)
 except ProcessLookupError:raise RuntimeError('Auxiliary queue ended before completing its audit')
 time.sleep(5)
assert json.loads(gate.read_text())['completed']
while shutil.disk_usage('.').free<1024**3:time.sleep(15)
for script,label in [('search_rule_policy.py','search'),('report_rule_policy.py','report')]:
 with open(f'/tmp/d4r25-{label}.log','w') as log:
  p=subprocess.Popen([sys.executable,'scripts/rl/'+script,str(r)],stdout=log,stderr=subprocess.STDOUT);print(json.dumps(dict(stage=label,pid=p.pid)),flush=True)
  if p.wait():raise RuntimeError(f'{label} failed; see its log. No games excluded.')
(r/'queue-finished.json').write_text(json.dumps(dict(time=time.time(),completed=True))+'\n')
