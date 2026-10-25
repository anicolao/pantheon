"""Public-state action traces for a fixed checkpoint, separate from test seeds."""
import argparse,json
from pathlib import Path
import torch
from anchored_ppo import AnchoredPPO
from train import Game
p=argparse.ArgumentParser();p.add_argument('checkpoint');p.add_argument('output');p.add_argument('--games',type=int,default=16);p.add_argument('--leader',default='doreios');p.add_argument('--teacher',default='classic-engine');p.add_argument('--prefix',default='rl-doreios-v3');args=p.parse_args()
torch.set_num_threads(1);model=AnchoredPPO.load(args.checkpoint,device='cpu');env=Game(namespace='behavior',seed_prefix=args.prefix,leader=args.leader,teacher=args.teacher)
rows=[]
try:
 for i in range(args.games):
  obs,_=env.reset();actions=[];done=False
  while not done:
   action,_=model.predict(obs,action_masks=env.action_masks(),deterministic=True);actions.append(int(action))
   obs,reward,done,_,info=env.step(action)
  rows.append(dict(checkpoint=args.checkpoint,leader=args.leader,teacher=args.teacher,actions=actions,reward=reward,info=info))
finally:env.close()
Path(args.output).write_text(json.dumps(rows))
