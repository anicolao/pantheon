import json,os,subprocess,sys,time,shutil
from pathlib import Path
r=Path('balance-results/doreios-four-rl-v34');gate=Path('balance-results/doreios-four-rl-v20/results.json');assert not (r/'queue.json').exists();(r/'queue.json').write_text(json.dumps(dict(pid=os.getpid(),gate=str(gate),time=time.time()))+'\n')
while not gate.exists():
 try:os.kill(47003,0)
 except ProcessLookupError:raise RuntimeError('Preceding rollout controller exited before report')
 time.sleep(5)
while shutil.disk_usage('.').free<1024**3:time.sleep(30)
for script,label in [('search_rollout.py','search'),('report_rule_policy.py','report')]:
 with open(r/f'{label}.log','w') as log:subprocess.run([sys.executable,'scripts/rl/'+script,str(r)],stdout=log,stderr=subprocess.STDOUT,check=True)
(r/'queue-finished.json').write_text(json.dumps(dict(completed=True,time=time.time()))+'\n')
