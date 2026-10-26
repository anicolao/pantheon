"""Finish already-running studies and reuse their workers for frozen next experiments."""
import json,subprocess,sys,time,threading,os
from pathlib import Path
root=Path('balance-results/doreios-overnight-v1');loglock=threading.Lock()
def note(**data):
 with loglock:
  with (root/'queue-events.jsonl').open('a') as f:f.write(json.dumps(dict(time=time.time(),**data))+'\n')
  print(json.dumps(data),flush=True)
def waitfile(path,pid):
 while not Path(path).exists():
  try:os.kill(pid,0)
  except ProcessLookupError:raise RuntimeError(f'Expected producer {pid} stopped without {path}')
  time.sleep(5)
def run(args,log):
 note(stage='starting',args=args,log=log)
 with open(log,'w') as f:p=subprocess.Popen(args,stdout=f,stderr=subprocess.STDOUT)
 note(stage='running',pid=p.pid,args=args)
 code=p.wait()
 if code:raise RuntimeError(f'{args} failed with exit {code}; see {log}')
 note(stage='finished',args=args)
def training_chain():
 for n,arms,pids in [(18,['scale2','scale4'],[33360,33520]),(19,['control','wide'],[41569,41574])]:
  r=Path(f'balance-results/doreios-four-rl-v{n}')
  for a,pid in zip(arms,pids):waitfile(r/a/'selection.json',pid)
  run([sys.executable,'scripts/rl/confirm_four_campaign.py',str(r)],f'/tmp/d4r{n}-confirm.log')
  run([sys.executable,'scripts/rl/audit_four_campaign.py',str(r)],f'/tmp/d4r{n}-audit.log')
 r=Path('balance-results/doreios-four-rl-v21')
 run([sys.executable,'scripts/rl/search_rule_policy.py',str(r)],'/tmp/d4r21-search.log')
 run([sys.executable,'scripts/rl/report_rule_policy.py',str(r)],'/tmp/d4r21-report.log')
def rollout_chain():
 r=Path('balance-results/doreios-four-rl-v17');waitfile(r/'confirmation.json',27710)
 run([sys.executable,'scripts/rl/report_rule_policy.py',str(r)],'/tmp/d4r17-report.log')
 r=Path('balance-results/doreios-four-rl-v20')
 run([sys.executable,'scripts/rl/search_rollout.py',str(r)],'/tmp/d4r20-search.log')
 run([sys.executable,'scripts/rl/report_rule_policy.py',str(r)],'/tmp/d4r20-report.log')
errors=[]
def guarded(fn):
 try:fn()
 except Exception as e:errors.append(str(e));note(stage='error',error=str(e))
if (root/'queue-started.json').exists():raise RuntimeError('Queue already started; inspect its live process instead of restarting')
(root/'queue-started.json').write_text(json.dumps(dict(pid=os.getpid(),time=time.time()))+'\n')
threads=[threading.Thread(target=guarded,args=(f,)) for f in [training_chain,rollout_chain]]
for t in threads:t.start()
for t in threads:t.join()
(root/'queue-finished.json').write_text(json.dumps(dict(errors=errors,time=time.time()))+'\n')
if errors:raise RuntimeError(str(errors))
