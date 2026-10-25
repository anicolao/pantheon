"""Public-state action traces for a fixed checkpoint, separate from test seeds."""
import argparse,json
from pathlib import Path
import torch
from anchored_ppo import AnchoredPPO
from train import Game
p=argparse.ArgumentParser();p.add_argument('checkpoint');p.add_argument('output');p.add_argument('--games',type=int,default=16);args=p.parse_args()
torch.set_num_threads(1);model=AnchoredPPO.load(args.checkpoint,device='cpu');env=Game(namespace='behavior',seed_prefix='rl-doreios-v3')
rows=[]
try:
 for i in range(args.games):
  obs,_=env.reset();actions=[];done=False
  while not done:
   action,_=model.predict(obs,action_masks=env.action_masks(),deterministic=True);actions.append(int(action))
   obs,reward,done,_,info=env.step(action)
  rows.append(dict(checkpoint=args.checkpoint,actions=actions,reward=reward,info=info))
finally:env.close()
Path(args.output).write_text(json.dumps(rows))
