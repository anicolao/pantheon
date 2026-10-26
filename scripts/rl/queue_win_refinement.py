"""Run the fixed next study when v23 releases its workers; never duplicate a study."""
import json,os,subprocess,sys,time,shutil
from pathlib import Path
r=Path('balance-results/doreios-four-rl-v27');gate=Path('balance-results/doreios-four-rl-v23/queue-finished.json')
assert not (r/'queue.json').exists()
(r/'queue.json').write_text(json.dumps(dict(pid=os.getpid(),gate=str(gate),time=time.time()))+'\n')
while not gate.exists():time.sleep(5)
assert json.loads(gate.read_text())['completed']
audit_gate=Path('balance-results/doreios-four-rl-v30/queue-finished.json')
while not audit_gate.exists():time.sleep(5)
assert json.loads(audit_gate.read_text())['completed']
combination_gate=Path('balance-results/doreios-four-rl-v33/queue-finished.json')
while not combination_gate.exists():time.sleep(5)
assert json.loads(combination_gate.read_text())['completed']
subprocess.run([sys.executable,'scripts/rl/amend_win_base.py'],check=True)
while shutil.disk_usage('.').free<1024**3:time.sleep(30)
processes=[]
for arm in ['win','mixed']:
 log=open(r/f'{arm}.log','w');p=subprocess.Popen([sys.executable,'scripts/rl/train_four.py',str(r/arm/'config.json')],stdout=log,stderr=subprocess.STDOUT);processes.append((p,log));print(json.dumps(dict(stage='training',arm=arm,pid=p.pid)),flush=True)
errors=[]
for p,log in processes:
 code=p.wait();log.close()
 if code:errors.append(dict(pid=p.pid,code=code))
if errors:raise RuntimeError(str(errors))
for script,label in [('confirm_four_campaign.py','confirm'),('audit_four_campaign.py','audit')]:
 with open(r/f'{label}.log','w') as log:subprocess.run([sys.executable,'scripts/rl/'+script,str(r)],stdout=log,stderr=subprocess.STDOUT,check=True)
(r/'queue-finished.json').write_text(json.dumps(dict(time=time.time(),completed=True))+'\n')
