"""Smoke-test the complete-episode PPO update and checkpoint round trip, not game strength."""
import copy,sys,tempfile
from pathlib import Path
import numpy as np
import torch
from stable_baselines3.common.logger import configure
from anchored_ppo import AnchoredPPO
from episode_ppo_buffer import episode_buffer
torch.set_num_threads(1);torch.manual_seed(8541);np.random.seed(8541)
m=AnchoredPPO.load(sys.argv[1],device='cpu',learning_rate=.0001,n_epochs=2,batch_size=16,gamma=1.,gae_lambda=.95)
m.freeze_reference();m.anchor_coefficient=0.;m.auxiliary_coefficient=0.;m.policy.optimizer=torch.optim.Adam(m.policy.parameters(),lr=.0001,eps=1e-5);m.set_logger(configure(None,[]));m._current_progress_remaining=1.
obs=np.zeros((32,171),np.float32);masks=np.zeros((32,349),bool);masks[:,:2]=True
with torch.no_grad():
 x=torch.tensor(obs);d=m.policy.get_distribution(x,action_masks=masks);actions=d.get_actions(deterministic=False);values=m.policy.predict_values(x).flatten().numpy();lp=d.log_prob(actions).numpy()
rewards=np.zeros(32,np.float32);rewards[3::8]=1;rewards[7::8]=-1;starts=np.zeros(32,bool);starts[::4]=True
data=dict(observations=obs,masks=masks,actions=actions.numpy(),values=values,logp=lp,rewards=rewards,starts=starts)
before=copy.deepcopy(m.policy.state_dict());m.rollout_buffer=episode_buffer(m,data);m.train()
assert all(torch.isfinite(v).all() for v in m.policy.state_dict().values())
assert any(not torch.equal(v,before[k]) for k,v in m.policy.state_dict().items() if 'policy_net' in k or 'action_net' in k)
def same(a,b):
 if torch.is_tensor(a):assert torch.equal(a,b)
 elif isinstance(a,dict):
  assert a.keys()==b.keys()
  for k in a:same(a[k],b[k])
 elif isinstance(a,(tuple,list)):
  assert len(a)==len(b)
  for x,y in zip(a,b):same(x,y)
 else:assert a==b
with tempfile.TemporaryDirectory() as td:
 p=Path(td)/'model';m.save(p);restored=AnchoredPPO.load(p,device='cpu');same(m.policy.state_dict(),restored.policy.state_dict());same(m.policy.optimizer.state_dict(),restored.policy.optimizer.state_dict())
print('PPO update finite; actor changed; policy and optimizer checkpoint round trip exact')
