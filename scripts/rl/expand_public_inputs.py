"""Append zero-weight public inputs, preserving the accepted policy and critic."""
import hashlib,json,subprocess,sys
from pathlib import Path
import gymnasium as gym
import numpy as np
import torch
from anchored_ppo import AnchoredPPO

def main():
    src,dst=sys.argv[1:3];torch.set_num_threads(1)
    if Path(dst+'.zip').exists():raise RuntimeError('Refusing overwrite')
    meta=json.loads(subprocess.check_output(['bun','-e',"import {publicObservationSize,extraFeatureNames} from './scripts/rl/public_features';console.log(JSON.stringify({size:publicObservationSize,extraFeatureNames}))"],text=True))
    class ShapeEnv(gym.Env):
        observation_space=gym.spaces.Box(-np.inf,np.inf,shape=(meta['size'],),dtype=np.float32)
        action_space=gym.spaces.Discrete(349)
        def reset(self,seed=None,options=None):return np.zeros(meta['size'],dtype=np.float32),{}
        def step(self,action):raise RuntimeError('Shape-only environment')
    old=AnchoredPPO.load(src,device='cpu');state=old.policy.state_dict()
    new=AnchoredPPO('MlpPolicy',ShapeEnv(),seed=8409,device='cpu',n_steps=1024,batch_size=512,n_epochs=4,learning_rate=1e-4,gamma=1.,gae_lambda=1.,ent_coef=.003,target_kl=.02,policy_kwargs=dict(net_arch=dict(pi=[128,128],vf=[128,128])),verbose=0)
    expanded=new.policy.state_dict()
    for name,value in state.items():
        if name in ['mlp_extractor.policy_net.0.weight','mlp_extractor.value_net.0.weight']:
            assert value.shape==(128,171);expanded[name].zero_();expanded[name][:,:171]=value
        else:expanded[name]=value.clone()
    new.policy.load_state_dict(expanded,strict=True);new.save(dst)
    result=dict(**meta,originalInputs=171,parameters=sum(p.numel() for p in new.policy.parameters()),sourceSHA256=hashlib.sha256(Path(src+'.zip').read_bytes()).hexdigest(),checkpointSHA256=hashlib.sha256(Path(dst+'.zip').read_bytes()).hexdigest(),initialization='Original weights copied exactly; appended actor and critic input columns zero. Hidden layers remain 128x128.')
    Path(dst+'-expansion.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k!='extraFeatureNames'}))

if __name__=='__main__':main()
