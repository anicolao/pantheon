import json,os,subprocess,sys,time,shutil
from pathlib import Path
r=Path('balance-results/doreios-four-rl-v33');gates=[Path(f'balance-results/doreios-four-rl-v{n}/queue-finished.json') for n in [23,30]];assert not (r/'queue.json').exists();(r/'queue.json').write_text(json.dumps(dict(pid=os.getpid(),gates=[str(p) for p in gates],time=time.time()))+'\n')
while not all(p.exists() for p in gates):time.sleep(5)
assert all(json.loads(p.read_text())['completed'] for p in gates)
while shutil.disk_usage('.').free<1024**3:time.sleep(30)
with open(r/'search.log','w') as log:subprocess.run([sys.executable,'scripts/rl/search_temple_bias.py',str(r)],stdout=log,stderr=subprocess.STDOUT,check=True)
(r/'queue-finished.json').write_text(json.dumps(dict(completed=True,time=time.time()))+'\n')
