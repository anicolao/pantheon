"""Double hidden widths while preserving the represented actor and critic functions."""
import json,hashlib,sys
from pathlib import Path
import gymnasium as gym
import numpy as np
import torch
from anchored_ppo import AnchoredPPO

class ShapeEnv(gym.Env):
    def __init__(self,inputs,actions):
        self.observation_space=gym.spaces.Box(-np.inf,np.inf,shape=(inputs,),dtype=np.float32)
        self.action_space=gym.spaces.Discrete(actions)
    def reset(self,seed=None,options=None):return np.zeros(self.observation_space.shape,dtype=np.float32),{}
    def step(self,action):raise RuntimeError('Shape-only environment must never be played')

def main():
    src,dst=sys.argv[1:3];torch.set_num_threads(1)
    if Path(dst+'.zip').exists():raise RuntimeError('Refusing to overwrite widened model')
    old=AnchoredPPO.load(src,device='cpu');state=old.policy.state_dict();inputs=old.observation_space.shape[0]
    model=AnchoredPPO('MlpPolicy',ShapeEnv(inputs,old.action_space.n),seed=8408,device='cpu',n_steps=1024,batch_size=512,n_epochs=4,learning_rate=1e-4,gamma=1.,gae_lambda=1.,ent_coef=.003,target_kl=.02,policy_kwargs=dict(net_arch=dict(pi=[256,256],vf=[256,256])),verbose=0)
    widened=model.policy.state_dict()
    for branch,head in [('policy_net','action_net'),('value_net','value_net')]:
        prefix='mlp_extractor.'+branch
        assert state[prefix+'.0.weight'].shape==(128,inputs)
        widened[prefix+'.0.weight']=state[prefix+'.0.weight'].repeat(2,1)
        widened[prefix+'.0.bias']=state[prefix+'.0.bias'].repeat(2)
        # Duplicate each activation and split its outgoing weights 75/25.
        # Their sum preserves the function; unequal splits break gradient symmetry.
        second=state[prefix+'.2.weight'].repeat(2,1)
        widened[prefix+'.2.weight']=torch.cat([second*.75,second*.25],dim=1)
        widened[prefix+'.2.bias']=state[prefix+'.2.bias'].repeat(2)
        widened[head+'.weight']=torch.cat([state[head+'.weight']*.75,state[head+'.weight']*.25],dim=1)
        widened[head+'.bias']=state[head+'.bias'].clone()
    model.policy.load_state_dict(widened,strict=True)
    torch.manual_seed(8408);obs=torch.randn(2048,inputs)
    with torch.no_grad():
        old_logits=old.policy.action_net(old.policy.mlp_extractor.forward_actor(obs));new_logits=model.policy.action_net(model.policy.mlp_extractor.forward_actor(obs))
        old_value=old.policy.predict_values(obs);new_value=model.policy.predict_values(obs)
    torch.testing.assert_close(old_logits,new_logits,atol=1e-4,rtol=1e-5)
    torch.testing.assert_close(old_value,new_value,atol=1e-4,rtol=1e-5)
    model.save(dst)
    result=dict(method='Duplicate hidden activations; split outgoing weights 75/25, preserving functions in exact arithmetic and breaking gradient symmetry.',sourceSHA256=hashlib.sha256(Path(src+'.zip').read_bytes()).hexdigest(),widenedSHA256=hashlib.sha256(Path(dst+'.zip').read_bytes()).hexdigest(),oldParameters=sum(p.numel() for p in old.policy.parameters()),newParameters=sum(p.numel() for p in model.policy.parameters()),randomObservationCount=len(obs),maximumLogitDifference=float((old_logits-new_logits).abs().max()),maximumValueDifference=float((old_value-new_value).abs().max()))
    Path(dst+'-widening.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))

if __name__=='__main__':main()
