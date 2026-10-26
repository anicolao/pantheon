"""Drain the four-worker recovery, then use eight workers with identical chunks."""
import hashlib,json,os,signal,subprocess,sys,time
from pathlib import Path
def main():
 r=Path('balance-results/doreios-four-rl-v28');gate=Path('balance-results/doreios-four-rl-v38/queue-finished.json');assert not (r/'resource-scale.json').exists()
 while not gate.exists():time.sleep(10)
 assert json.loads(gate.read_text())['completed']
 if (r/'queue-finished.json').exists():return
 old=json.loads((r/'recovery.json').read_text());pid=old['pid'];command=subprocess.run(['ps','-p',str(pid),'-o','command='],capture_output=True,text=True).stdout
 assert 'resume_rollout_confirmation.py' in command and str(r) in command,'Expected live owned controller'
 record=dict(time=time.time(),pid=os.getpid(),previousController=pid,previousWorkers=old['workers'],workers=8,reason='Reuse CPU slots released by completed interpolation audit. Graceful interrupt drains active chunks; preserve every completed chunk, selection, model and seed. Fresh-process parity already passed.',selectionSHA256=hashlib.sha256((r/'selection.json').read_bytes()).hexdigest(),workerSHA256=old['workerSHA256'])
 (r/'resource-scale.json').write_text(json.dumps(record,indent=2)+'\n');os.kill(pid,signal.SIGINT)
 while True:
  status=subprocess.run(['ps','-p',str(pid),'-o','stat='],capture_output=True,text=True).stdout.strip()
  if not status or status.startswith('Z'):break
  time.sleep(5)
 assert hashlib.sha256((r/'selection.json').read_bytes()).hexdigest()==record['selectionSHA256']
 print(json.dumps(dict(stage='drained',previousController=pid,workers=8)),flush=True)
 subprocess.run([sys.executable,'scripts/rl/resume_rollout_confirmation.py',str(r),'8','--continue'],check=True)
if __name__=='__main__':main()
