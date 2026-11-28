import sys,json,argparse,copy
from pathlib import Path
sys.path.insert(0,str(Path.cwd()/'scripts/rl/expansion'))
from common import *
from weakest_league import paired,write
class RewardGame(gym.Wrapper):
 def step(self,action):
  obs,reward,done,truncated,info=self.env.step(action)
  if done and self.env.namespace.startswith('train-'):
   gap=info['score']-max(r['score'] for r in info['field'] if r['leader']!=info['leader'])
   info['outcome']=reward;reward+=.5*max(-1.,min(1.,gap/30))
  return obs,reward,done,truncated,info
def envs(workers,prefix,leader,field):
 return SubprocVecEnv([lambda i=i:RewardGame(Game(i,workers,prefix,leader,field)) for i in range(workers)],start_method='spawn')
def main():
 p=argparse.ArgumentParser();p.add_argument('name');p.add_argument('--wide',action='store_true');p.add_argument('--lr',type=float,default=.0001);p.add_argument('--entropy',type=float,default=.005);p.add_argument('--rival');p.add_argument('--temperature',type=float,default=1);args=p.parse_args()
 torch.set_num_threads(1);torch.manual_seed(2811202601+int(args.wide))
 root=ROOT/'balance-diagnostics/weakest-eight-house-20261128';state=json.loads((root/'status.json').read_text());field=copy.deepcopy(state['field']);leader='achilles';folder=root/args.name;folder.mkdir()
 frozen=folder/'field.json';write(frozen,field);trainfield=copy.deepcopy(field)
 if args.rival:trainfield['focusNewest']=True;trainfield['newest']=args.rival
 training=folder/'training-field.json';write(training,trainfield)
 write(folder/'protocol.json',dict(args=vars(args),initialField=field,trainingReward='terminal outcome +0.5*clipped score margin',screen=448,confirmation=1792,decisions=1048576,gaeLambda=.95))
 train=envs(8,'weakest-side-'+args.name,leader,str(training));evaluation=envs(8,'weakest-side-'+args.name,leader,str(frozen))
 try:
  old=MaskablePPO.load(field['checkpoints'][leader],device='cpu')
  if args.wide:
   model=MaskablePPO('MlpPolicy',train,seed=2811202601,device='cpu',n_steps=256,batch_size=256,n_epochs=4,learning_rate=args.lr,gamma=1.,gae_lambda=1.,ent_coef=args.entropy,target_kl=.02,policy_kwargs=dict(net_arch=dict(pi=[256,256],vf=[256,256])))
   a=old.policy.state_dict();b=model.policy.state_dict()
   with torch.no_grad():
    for branch in ['policy_net','value_net']:
     k='mlp_extractor.'+branch+'.0';b[k+'.weight'][:128]=a[k+'.weight'];b[k+'.bias'][:128]=a[k+'.bias']
     k='mlp_extractor.'+branch+'.2';b[k+'.weight'][:128,:128]=a[k+'.weight'];b[k+'.weight'][:128,128:]=0;b[k+'.bias'][:128]=a[k+'.bias']
    for k in ['action_net','value_net']:
     b[k+'.weight'][:,:128]=a[k+'.weight'];b[k+'.weight'][:,128:]=0;b[k+'.bias']=a[k+'.bias'].clone()
    model.policy.load_state_dict(b)
  else:
   model=MaskablePPO.load(field['checkpoints'][leader],env=train,device='cpu',learning_rate=args.lr,ent_coef=args.entropy,gae_lambda=.95)
   with torch.no_grad():model.policy.action_net.weight.mul_(args.temperature);model.policy.action_net.bias.mul_(args.temperature)
   model.policy.optimizer=torch.optim.Adam(model.policy.parameters(),lr=args.lr,eps=1e-5)
  def assess(m,label,namespace,n):
   rows=evaluate(evaluation,m,namespace,n);write(folder/f'{label}-{namespace}.json',rows);print(json.dumps(dict(label=label,namespace=namespace,**summary(rows))),flush=True);return rows
  scores={'incumbent':summary(assess(old,'incumbent','screen',448))['share']}
  for segment in range(4):
   train.env_method('schedule','train-'+str(segment));model._last_obs=None
   model.learn(total_timesteps=262144,reset_num_timesteps=segment==0,callback=Progress());label='ppo-'+str(segment+1);model.save(folder/label)
   scores[label]=summary(assess(model,label,'screen',448))['share']
  best=max(scores,key=scores.get);write(folder/'selection.json',dict(selected=best,scores=scores))
  if best=='incumbent':write(folder/'result.json',dict(accepted=False,selected=best));return
  candidate=MaskablePPO.load(folder/best,device='cpu');a=assess(old,'incumbent','confirm',1792);b=assess(candidate,best,'confirm',1792)
  original=json.loads((root/'initial-field.json').read_text());c=assess(MaskablePPO.load(original['checkpoints'][leader],device='cpu'),'original','confirm',1792)
  vsInc=paired(a,b);vsOrig=paired(c,b);accepted=vsInc['CI95'][0]>0 and vsOrig['CI95'][0]>0
  meta=json.loads(subprocess.check_output(['bun','scripts/rl/expansion/metadata.ts'],text=True))
  actor=export(candidate,leader,folder/'selected.json',meta['schema'],folder/(best+'.zip'))
  write(folder/'result.json',dict(accepted=accepted,selected=best,vsIncumbent=vsInc,vsOriginal=vsOrig,actor=actor,checkpoint=str(folder/(best+'.zip')),baseline=summary(a),candidate=summary(b)))
 finally:close_vector(train);close_vector(evaluation)
if __name__=='__main__':main()
