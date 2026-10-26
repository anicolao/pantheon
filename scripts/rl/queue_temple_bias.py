import json,os,subprocess,sys,time,shutil
from pathlib import Path
r=Path('balance-results/doreios-four-rl-v30');gate=Path('balance-results/doreios-four-rl-v29/queue-finished.json');assert not (r/'queue.json').exists();(r/'queue.json').write_text(json.dumps(dict(pid=os.getpid(),gate=str(gate),time=time.time()))+'\n')
while not gate.exists():
 try:os.kill(97864,0)
 except ProcessLookupError:raise RuntimeError('Temple-order controller exited before report')
 time.sleep(5)
assert json.loads(gate.read_text())['completed'];result=json.loads(gate.with_name('results.json').read_text())
if not result['improvementConfirmed']:
 (r/'queue-finished.json').write_text(json.dumps(dict(completed=True,skipped=True,reason='Temple-order improvement did not confirm',time=time.time()))+'\n');sys.exit(0)
while shutil.disk_usage('.').free<1024**3:time.sleep(30)
with open(r/'search.log','w') as log:subprocess.run([sys.executable,'scripts/rl/search_temple_bias.py',str(r)],stdout=log,stderr=subprocess.STDOUT,check=True)
(r/'queue-finished.json').write_text(json.dumps(dict(completed=True,time=time.time()))+'\n')
