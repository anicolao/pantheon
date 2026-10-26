"""Rerun disk-interrupted training from identical initialization and seeds."""
import hashlib,json,os,shutil,subprocess,sys,time
from pathlib import Path
def state(pid):return subprocess.run(['ps','-p',str(pid),'-o','stat='],capture_output=True,text=True).stdout.strip()
def main():
 r=Path('balance-results/doreios-four-rl-v35');old=r/'failed-margin-disk-full';assert not old.exists() and not (r/'recovery.json').exists()
 assert not state(14435) or state(14435).startswith('Z')
 protocol=json.loads((r/'margin/protocol.json').read_text());assert protocol['sourceHashes']['scripts/rl/train_four.py']==hashlib.sha256(Path('scripts/rl/train_four.py').read_bytes()).hexdigest()
 (r/'margin').rename(old);(r/'margin.log').rename(r/'failed-margin-disk-full.log');(r/'margin').mkdir()
 for name in ['config.json','opponents-training.json']:shutil.copyfile(old/name,r/'margin'/name)
 (r/'recovery.json').write_text(json.dumps(dict(pid=os.getpid(),time=time.time(),reason='ENOSPC saving checkpoint1310720. Rerun exact original arm; compare earlier complete checkpoint tensors and screening outcomes. Failed evidence retained.',originalController=77766,originalFailedPID=14435),indent=2)+'\n')
 while shutil.disk_usage('.').free<1024**3:time.sleep(30)
 with (r/'margin.log').open('w') as log:subprocess.run([sys.executable,'scripts/rl/train_four.py',str(r/'margin/config.json')],stdout=log,stderr=subprocess.STDOUT,check=True)
 import torch
 from anchored_ppo import AnchoredPPO
 torch.set_num_threads(1);checks=[]
 for name in ['initial','checkpoint-262144','checkpoint-524288','checkpoint-786432','checkpoint-1048576']:
  before=AnchoredPPO.load(old/name,device='cpu').policy.state_dict();after=AnchoredPPO.load(r/'margin'/name,device='cpu').policy.state_dict();assert before.keys()==after.keys();assert all(torch.equal(before[k],after[k]) for k in before),name;checks.append(name)
 for p in old.glob('*-screen.json'):assert json.loads(p.read_text())==json.loads((r/'margin'/p.name).read_text()),p.name
 (r/'recovery-parity.json').write_text(json.dumps(dict(exactCheckpointTensors=checks,exactPriorScreeningOutcomes=True,failedPartialCheckpointExcluded='failed-margin-disk-full/checkpoint-1310720.zip'),indent=2)+'\n')
 while state(77766) and not state(77766).startswith('Z'):time.sleep(5)
 assert (r/'win/selection.json').exists() and not (r/'selection.json').exists()
 for script,label in [('confirm_four_campaign.py','confirm'),('audit_four_campaign.py','audit')]:
  with (r/f'{label}.log').open('w') as log:subprocess.run([sys.executable,'scripts/rl/'+script,str(r)],stdout=log,stderr=subprocess.STDOUT,check=True)
 (r/'queue-finished.json').write_text(json.dumps(dict(completed=True,recovered=True,time=time.time()))+'\n')
if __name__=='__main__':main()
