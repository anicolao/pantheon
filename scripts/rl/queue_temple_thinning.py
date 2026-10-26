import json,os,subprocess,sys,time,shutil
from pathlib import Path
r=Path('balance-results/doreios-four-rl-v31');gate=Path('balance-results/doreios-four-rl-v30/queue-finished.json');assert not (r/'queue.json').exists();(r/'queue.json').write_text(json.dumps(dict(pid=os.getpid(),gate=str(gate),time=time.time()))+'\n')
while not gate.exists():
 try:os.kill(99131,0)
 except ProcessLookupError:raise RuntimeError('Previous controller exited before report')
 time.sleep(5)
assert json.loads(gate.read_text())['completed']
while shutil.disk_usage('.').free<1024**3:time.sleep(30)
for script,label in [('search_rule_policy.py','search'),('report_rule_policy.py','report')]:
 with open(r/f'{label}.log','w') as log:subprocess.run([sys.executable,'scripts/rl/'+script,str(r)],stdout=log,stderr=subprocess.STDOUT,check=True)
(r/'queue-finished.json').write_text(json.dumps(dict(completed=True,time=time.time()))+'\n')
