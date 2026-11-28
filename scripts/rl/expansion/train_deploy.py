"""Queue-aware Achilles pilot. Rules are recorded by source hash; no deployed weight changes or opponent training."""
import argparse,json,hashlib,subprocess,time
from pathlib import Path
from common import *
from weakest_league import write,paired
class QueueGame(gym.Wrapper):
 def step(self,action):
  obs,reward,done,truncated,info=self.env.step(action)
  if done and self.env.namespace.startswith('train-'):
   info['outcome']=reward
   margin=info['score']-max(r['score'] for r in info['field'] if r['leader']!=info['leader'])
   reward+=.5*max(-1.,min(1.,margin/30))
  return obs,reward,done,truncated,info
 def schedule(self,name):return self.env.schedule(name)
 def action_masks(self):return self.env.action_masks()
def vector_queue(workers,prefix,field):
 return SubprocVecEnv([lambda i=i:QueueGame(Game(i,workers,prefix,'achilles',field,deploy_queue=True)) for i in range(workers)],start_method='spawn')
def main():
 p=argparse.ArgumentParser();p.add_argument('--field',required=True);p.add_argument('--checkpoint');p.add_argument('--output',required=True);p.add_argument('--prefix',required=True);p.add_argument('--ruleset',default='recorded-engine');p.add_argument('--eval-prefix',default='independent-deploy-learner-eval-v1');p.add_argument('--workers',type=int,default=16);p.add_argument('--steps',type=int,default=4194304);p.add_argument('--lr',type=float,default=.0001);p.add_argument('--entropy',type=float,default=.003);p.add_argument('--temperature',type=float,default=1.);args=p.parse_args()
 assert args.steps%8==0 and 896%args.workers==3584%args.workers==0
 torch.set_num_threads(1);torch.manual_seed(281129);np.random.seed(281129)
 out=Path(args.output).resolve();out.mkdir(parents=True);field=json.loads(Path(args.field).read_text());field['focusNewest']=False;frozen=out/'field.json';write(frozen,field)
 meta=json.loads(subprocess.check_output(['bun','scripts/rl/expansion/deploy_metadata.ts'],text=True))
 source_files=[*sorted((ROOT/'scripts/rl/expansion').glob('*.py')),*sorted((ROOT/'scripts/rl/expansion').glob('*.ts')),*sorted((ROOT/'src/lib/game').glob('*.ts')),ROOT/'src/lib/bots/expansion-schema.ts',ROOT/'src/lib/bots/rl-runtime.ts',ROOT/'flake.nix',ROOT/'flake.lock']
 write(out/'protocol.json',dict(args=vars(args),startedAt=time.time(),field=field,schema=meta,reward='win/tie/loss +1/0/-1 plus training-only 0.5*clipped score margin; evaluation raw win share',selection='8 checkpoints on 896 screen games; fresh 3584 paired confirmation games vs untrained port; lower 95% bound must exceed zero',sources={str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for f in source_files},queue='first 32 ordered grants plus unbounded total length, counts of 1/2/3 and total resolutions',deployedWeightsChanged=False))
 train=vector_queue(args.workers,args.prefix+':train',str(frozen));evaluation=vector_queue(args.workers,args.eval_prefix,str(frozen))
 try:
  source_checkpoint=args.checkpoint or field['checkpoints']['achilles'];old=MaskablePPO.load(source_checkpoint,device='cpu')
  model=MaskablePPO('MlpPolicy',train,seed=281129,device='cpu',n_steps=256,batch_size=256,n_epochs=4,learning_rate=args.lr,gamma=1.,gae_lambda=1.,ent_coef=args.entropy,target_kl=.02,policy_kwargs=dict(net_arch=dict(pi=[128,128],vf=[128,128])))
  original=old.policy.state_dict();ported=model.policy.state_dict()
  for key in ported:
   if key in ['mlp_extractor.policy_net.0.weight','mlp_extractor.value_net.0.weight']:
    assert original[key].shape[1] in [meta['baseFeatures'],meta['features']];ported[key].zero_();ported[key][:,:original[key].shape[1]]=original[key]
   else:
    assert ported[key].shape==original[key].shape;ported[key]=original[key].clone()
  model.policy.load_state_dict(ported)
  with torch.no_grad():
   x=torch.randn(128,meta['features']);a=old.policy.get_distribution(x[:,:old.observation_space.shape[0]]).distribution.logits;b=model.policy.get_distribution(x).distribution.logits
   delta=float((a-b).abs().max());assert torch.allclose(a,b,atol=1e-5,rtol=1e-5)
  write(out/'migration.json',dict(oldFeatures=old.observation_space.shape[0],newFeatures=meta['features'],zeroInitializedExtraInputs=old.observation_space.shape[0]!=meta['features'],maxLogProbabilityDifference=delta,sourceCheckpoint=source_checkpoint))
  model.save(out/'incumbent');incumbent=MaskablePPO.load(out/'incumbent',device='cpu')
  with torch.no_grad():model.policy.action_net.weight.mul_(args.temperature);model.policy.action_net.bias.mul_(args.temperature)
  def assess(m,label,namespace,n):
   rows=evaluate(evaluation,m,namespace,n);write(out/f'{label}-{namespace}.json',rows)
   result={**summary(rows),'nikeMarketActions':sum(r['nikeMarketActions'] for r in rows),'nikeWorships':sum(r['nikeWorships'] for r in rows),'gamesUsingNikeMarketActions':sum(r['nikeMarketActions']>0 for r in rows),'territoryDeploys':sum(r.get('territoryDeploys',0) for r in rows),'territoryDeployDraws':sum(r.get('territoryDeployDraws',0) for r in rows),'treasureDeploys':sum(r.get('treasureDeploys',0) for r in rows),'treasureDeployResolutions':sum(r.get('treasureDeployResolutions',0) for r in rows),'treasureDeployBonusCoins':sum(r.get('treasureDeployBonusCoins',0) for r in rows)}
   print(json.dumps(dict(stage=namespace,label=label,**result)),flush=True);return rows,result
  _,base=assess(incumbent,'incumbent','screen',896);scores={'incumbent':base}
  for segment in range(8):
   write(out/'status.json',dict(state='training',segment=segment+1,steps=segment*args.steps//8,scores=scores))
   train.env_method('schedule','train-'+str(segment));model._last_obs=None;model.learn(total_timesteps=args.steps//8,reset_num_timesteps=segment==0,callback=Progress());label='ppo-'+str(segment+1);model.save(out/label)
   _,scores[label]=assess(model,label,'screen',896);write(out/'screens.json',scores)
  best=max(scores,key=lambda name:scores[name]['share']);write(out/'selection.json',dict(selected=best,scores=scores));write(out/'status.json',dict(state='confirming',selected=best,steps=args.steps))
  a,baseline=assess(incumbent,'incumbent','confirm',3584);candidate=MaskablePPO.load(out/best,device='cpu');b,result=assess(candidate,best,'confirm',3584);comparison=paired(a,b)
  actor=export(candidate,'achilles',out/'selected.json',meta['schema'],out/(best+'.zip'))
  write(out/'result.json',dict(selected=best,accepted=best!='incumbent' and comparison['CI95'][0]>0,baseline=baseline,candidate=result,paired=comparison,actor=actor,checkpoint=str(out/(best+'.zip')),researchOnly=True));write(out/'status.json',dict(state='complete',selected=best,steps=args.steps,accepted=best!='incumbent' and comparison['CI95'][0]>0))
 finally:close_vector(train);close_vector(evaluation)
if __name__=='__main__':main()
