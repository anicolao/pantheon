"""Reuse the completed planning workers for continued training and exploration."""
import json,os,subprocess,sys,time
from pathlib import Path
r=Path('balance-results/doreios-four-rl-v23');gate=Path('balance-results/doreios-four-rl-v26/queue-finished.json')
if (r/'queue.json').exists():raise RuntimeError('Exploration study already queued; inspect its live handle')
(r/'queue.json').write_text(json.dumps(dict(pid=os.getpid(),gate=str(gate),time=time.time()))+'\n')
processes=[]
for arm in ['continue','explore']:
 if arm=='explore':
  while not gate.exists():time.sleep(5)
  assert json.loads(gate.read_text())['completed']
 log=open(f'/tmp/d4r23-{arm}.log','w');p=subprocess.Popen([sys.executable,'scripts/rl/train_four.py',str(r/arm/'config.json')],stdout=log,stderr=subprocess.STDOUT);processes.append((p,log));print(json.dumps(dict(stage='training',arm=arm,pid=p.pid)),flush=True)
errors=[]
for p,log in processes:
 code=p.wait();log.close()
 if code:errors.append(dict(pid=p.pid,code=code))
if errors:raise RuntimeError(str(errors))
for script,label in [('confirm_four_campaign.py','confirm'),('audit_four_campaign.py','audit')]:
 with open(f'/tmp/d4r23-{label}.log','w') as log:subprocess.run([sys.executable,'scripts/rl/'+script,str(r)],stdout=log,stderr=subprocess.STDOUT,check=True)
(r/'queue-finished.json').write_text(json.dumps(dict(time=time.time(),completed=True))+'\n')
