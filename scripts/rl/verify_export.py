"""Exact command parity between PyTorch checkpoints and the shipped JS actor."""
import argparse,json,time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import torch
from anchored_ppo import AnchoredPPO
from train import Game

def main():
 p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--games',type=int,default=256);p.add_argument('--leaders',nargs='+',default=['nereon','thaleia','doreios']);p.add_argument('--checkpoint-root',default='balance-results/leader-rl-v1');p.add_argument('--opponent',default='mm');args=p.parse_args()
 torch.set_num_threads(1);start=time.monotonic();workers=8;assert args.games%workers==0
 def worker(job):
  leader,rank=job;model=AnchoredPPO.load(f'{args.checkpoint_root}/{leader}/champion',device='cpu')
  env=Game(rank,workers,'export-parity','rl-runtime-v1',leader=leader,teacher='mm' if leader=='melia' else 'classic-engine',opponent=args.opponent)
  decisions=0;rows=[]
  try:
   for i in range(args.games//workers):
    obs,_=env.reset();done=False
    while not done:
     action,_=model.predict(obs,action_masks=env.action_masks(),deterministic=True);native=env.call(dict(op='runtime'))
     if int(action)!=native:raise AssertionError(f'Actor mismatch {leader} rank={rank} game={i} decision={decisions}: torch={action} runtime={native}')
     obs,reward,done,_,info=env.step(native);decisions+=1
    assert env.call(dict(op='verify'));rows.append(dict(**info,reward=reward))
  finally:env.close()
  return dict(leader=leader,rank=rank,decisions=decisions,games=rows)
 with ThreadPoolExecutor(max_workers=workers) as pool:rows=list(pool.map(worker,[(l,r) for l in args.leaders for r in range(workers)]))
 result=dict(exactCommandParity=True,replayVerified=True,elapsedSeconds=time.monotonic()-start,decisions=sum(r['decisions'] for r in rows),games=sum(len(r['games']) for r in rows),workers=rows)
 Path(args.output).write_text(json.dumps(result,indent=2));print(json.dumps({k:v for k,v in result.items() if k!='workers'}))
if __name__=='__main__':main()
