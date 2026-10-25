"""Small PyTorch-derived regression fixtures for the browser's learned actor."""
import json,hashlib
from pathlib import Path
import torch
from anchored_ppo import AnchoredPPO
from train import Game

torch.set_num_threads(1)
fixtures=[]
for leader in ['melia','nereon','thaleia','doreios']:
 path=Path('balance-results/melia-rl-v1/champion.zip') if leader=='melia' else Path(f'balance-results/leader-rl-v1/{leader}/champion.zip')
 model=AnchoredPPO.load(path,device='cpu');digest=hashlib.sha256(path.read_bytes()).hexdigest()
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
Path('tests/tooling/fixtures/rl-actors.json').write_text(json.dumps(fixtures,separators=(',',':'))+'\n')
print(json.dumps(dict(fixtures=len(fixtures),source='PyTorch deterministic masked actor, independent fixture seeds')))
