"""Exact command parity between PyTorch checkpoints and the shipped JS actor."""
import argparse,json,time,subprocess,hashlib
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import torch
from anchored_ppo import AnchoredPPO
from train import Game

def main():
 p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--games',type=int,default=256);p.add_argument('--leaders',nargs='+',default=['nereon','thaleia','doreios']);p.add_argument('--checkpoint-root',default='balance-results/leader-rl-v1');p.add_argument('--opponent',default='mm');p.add_argument('--checkpoint',help='Explicit checkpoint for a single leader');p.add_argument('--actor',help='Frozen research actor JSON instead of the shipped actor');p.add_argument('--reference',help='Also require exact action parity with this initialization checkpoint');p.add_argument('--reference-prefix',action='store_true',help='Reference uses only its original observation prefix');args=p.parse_args()
 if args.checkpoint and len(args.leaders)!=1:raise ValueError('--checkpoint requires exactly one leader')
 if args.actor:
  if not args.checkpoint:raise ValueError('--actor requires --checkpoint')
  actor=json.loads(Path(args.actor).read_text())
  assert actor['checkpointSHA256']==hashlib.sha256(Path(args.checkpoint+'.zip').read_bytes()).hexdigest()
 torch.set_num_threads(1);start=time.monotonic();workers=8;assert args.games%workers==0
 def worker(job):
  leader,rank=job;model=AnchoredPPO.load(args.checkpoint or f'{args.checkpoint_root}/{leader}/champion',device='cpu')
  reference=AnchoredPPO.load(args.reference,device='cpu') if args.reference else None
  env=Game(rank,workers,'export-parity','rl-runtime-v1',leader=leader,teacher='mm' if leader=='melia' else 'classic-engine',opponent=args.opponent)
  runtime=subprocess.Popen(['bun','scripts/rl/actor_bridge.ts',args.actor,leader],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,bufsize=1) if args.actor else None
  decisions=0;rows=[]
  try:
   for i in range(args.games//workers):
    obs,_=env.reset();done=False
    while not done:
     action,_=model.predict(obs,action_masks=env.action_masks(),deterministic=True)
     if reference is not None:
      reference_obs=obs[:reference.observation_space.shape[0]] if args.reference_prefix else obs
      original,_=reference.predict(reference_obs,action_masks=env.action_masks(),deterministic=True)
      if int(action)!=int(original):raise AssertionError(f'Initialization policy mismatch rank={rank} game={i} decision={decisions}')
     if runtime:
      runtime.stdin.write(json.dumps(dict(observation=obs.tolist(),mask=env.action_masks().tolist()))+'\n');runtime.stdin.flush();native=json.loads(runtime.stdout.readline())
     else:native=env.call(dict(op='runtime'))
     if int(action)!=native:raise AssertionError(f'Actor mismatch {leader} rank={rank} game={i} decision={decisions}: torch={action} runtime={native}')
     obs,reward,done,_,info=env.step(native);decisions+=1
    assert env.call(dict(op='verify'));rows.append(dict(**info,reward=reward))
  finally:
   env.close()
   if runtime:runtime.stdin.close();runtime.wait(timeout=10);runtime.stdout.close()
  return dict(leader=leader,rank=rank,decisions=decisions,games=rows)
 with ThreadPoolExecutor(max_workers=workers) as pool:rows=list(pool.map(worker,[(l,r) for l in args.leaders for r in range(workers)]))
 result=dict(exactCommandParity=True,replayVerified=True,elapsedSeconds=time.monotonic()-start,decisions=sum(r['decisions'] for r in rows),games=sum(len(r['games']) for r in rows),workers=rows)
 if args.actor:result.update(actorSHA256=hashlib.sha256(Path(args.actor).read_bytes()).hexdigest(),checkpointSHA256=actor['checkpointSHA256'])
 if args.reference:result.update(initializationPolicyPreserved=True,referenceCheckpointSHA256=hashlib.sha256(Path(args.reference+'.zip').read_bytes()).hexdigest())
 Path(args.output).write_text(json.dumps(result,indent=2));print(json.dumps({k:v for k,v in result.items() if k!='workers'}))
if __name__=='__main__':main()
