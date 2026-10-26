"""Small PyTorch-derived regression fixtures for the browser's learned actor."""
import argparse,json,hashlib
from pathlib import Path
import torch
from anchored_ppo import AnchoredPPO
from train import Game

torch.set_num_threads(1)
parser=argparse.ArgumentParser()
parser.add_argument('--checkpoints',required=True,help='JSON mapping each leader to its exact checkpoint path')
parser.add_argument('--output',default='tests/tooling/fixtures/rl-actors.json')
args=parser.parse_args();checkpoints=json.loads(Path(args.checkpoints).read_text())
fixtures=[]
for leader in ['melia','nereon','thaleia','doreios']:
 path=Path(checkpoints[leader]);path=path if path.suffix=='.zip' else Path(str(path)+'.zip')
 model=AnchoredPPO.load(path,device='cpu');digest=hashlib.sha256(path.read_bytes()).hexdigest()
 assert json.loads(Path(f'src/lib/bots/models/{leader}.json').read_text())['checkpointSHA256']==digest,'Fixture checkpoint does not match shipped actor'
 env=Game(namespace='fixtures',seed_prefix='rl-runtime-v1',leader=leader,teacher='mm' if leader=='melia' else 'classic-engine',opponent='rl-pool' if leader=='melia' else 'mm')
 seen=set()
 try:
  for game in range(12):
   obs,_=env.reset();done=False
   while not done:
    mask=env.action_masks();action,_=model.predict(obs,action_masks=mask,deterministic=True);action=int(action)
    if action not in seen and mask.sum()>1 and len(seen)<16:
     fixtures.append(dict(leader=leader,checkpointSHA256=digest,observation=obs.tolist(),mask=mask.tolist(),action=action));seen.add(action)
    obs,_,done,_,_=env.step(action)
 finally:env.close()
 assert len(seen)>=6,(leader,len(seen))
Path(args.output).write_text(json.dumps(fixtures,separators=(',',':'))+'\n')
print(json.dumps(dict(fixtures=len(fixtures),source='PyTorch deterministic masked actor, independent fixture seeds')))
