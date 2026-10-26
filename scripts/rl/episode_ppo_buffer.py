"""Use the standard masked PPO buffer with complete-episode boundaries."""
import numpy as np
import torch
from sb3_contrib.common.maskable.buffers import MaskableRolloutBuffer
def episode_buffer(model,data):
 n=len(data['actions']);assert n and data['starts'][0] and all(len(v)==n for v in data.values())
 b=MaskableRolloutBuffer(n,model.observation_space,model.action_space,device='cpu',gamma=1.,gae_lambda=.95,n_envs=1)
 for i in range(n):
  assert data['masks'][i,data['actions'][i]]
  b.add(data['observations'][i:i+1],data['actions'][i:i+1],data['rewards'][i:i+1],data['starts'][i:i+1],torch.tensor(data['values'][i:i+1]),torch.tensor(data['logp'][i:i+1]),action_masks=data['masks'][i:i+1])
 b.compute_returns_and_advantage(last_values=torch.zeros(1),dones=np.array([True]));assert b.full and np.all(np.isfinite(b.returns))
 return b
