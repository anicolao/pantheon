import json,os,subprocess,sys,time
from pathlib import Path
r=Path('balance-results/doreios-four-rl-v29');assert not (r/'queue.json').exists();(r/'queue.json').write_text(json.dumps(dict(pid=os.getpid(),time=time.time()))+'\n')
for script,label in [('search_rule_policy.py','search'),('report_rule_policy.py','report')]:
 with open(r/f'{label}.log','w') as log:subprocess.run([sys.executable,'scripts/rl/'+script,str(r)],stdout=log,stderr=subprocess.STDOUT,check=True)
(r/'queue-finished.json').write_text(json.dumps(dict(completed=True,time=time.time()))+'\n')
