"""Reuse the completed strategic-teacher workers for a matched representation experiment."""
import json,os,subprocess,sys,time
from pathlib import Path
r=Path('balance-results/doreios-four-rl-v22');gate=Path('balance-results/doreios-four-rl-v21/results.json')
if (r/'queue.json').exists():raise RuntimeError('Auxiliary study already queued; inspect its live handle')
(r/'queue.json').write_text(json.dumps(dict(pid=os.getpid(),gate=str(gate),time=time.time()))+'\n')
while not gate.exists():
 try:os.kill(47003,0)
 except ProcessLookupError:raise RuntimeError('Preceding queue ended before teacher report')
 time.sleep(5)
processes=[]
for arm in ['control','auxiliary']:
 log=open(f'/tmp/d4r22-{arm}.log','w');p=subprocess.Popen([sys.executable,'scripts/rl/train_four.py',str(r/arm/'config.json')],stdout=log,stderr=subprocess.STDOUT);processes.append((p,log));print(json.dumps(dict(stage='training',arm=arm,pid=p.pid)),flush=True)
errors=[]
for p,log in processes:
 code=p.wait();log.close()
 if code:errors.append(dict(pid=p.pid,code=code))
if errors:raise RuntimeError(str(errors))
for script,label in [('confirm_four_campaign.py','confirm'),('audit_four_campaign.py','audit')]:
 with open(f'/tmp/d4r22-{label}.log','w') as log:subprocess.run([sys.executable,'scripts/rl/'+script,str(r)],stdout=log,stderr=subprocess.STDOUT,check=True)
(r/'queue-finished.json').write_text(json.dumps(dict(time=time.time(),completed=True))+'\n')
