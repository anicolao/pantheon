import unittest
import numpy as np
import torch
from gymnasium import Env,spaces
from anchored_ppo import AnchoredPPO

class Toy(Env):
    observation_space=spaces.Box(-1,1,(3,),dtype=np.float32)
    action_space=spaces.Discrete(3)
    def reset(self,**kwargs):return np.zeros(3,dtype=np.float32),{}
    def step(self,a):return np.zeros(3,dtype=np.float32),0.,True,False,{}
    def action_masks(self):return np.array([True,True,False])

class AnchorTests(unittest.TestCase):
    def test_frozen_reference_and_kl(self):
        torch.set_num_threads(1)
        model=AnchoredPPO('MlpPolicy',Toy(),n_steps=4,batch_size=4,seed=42)
        model.freeze_reference()
        x=torch.zeros((2,3));mask=torch.tensor([[True,True,False]]*2)
        self.assertAlmostEqual(model.anchor_kl(x,mask).item(),0.,places=6)
        old={k:v.clone() for k,v in model.reference.state_dict().items()}
        with torch.no_grad():model.policy.action_net.bias[0]+=2
        self.assertGreater(model.anchor_kl(x,mask).item(),0.1)
        model.policy.optimizer.zero_grad();model.anchor_kl(x,mask).backward()
        self.assertGreater(model.policy.action_net.bias.grad[0].item(),0.)
        self.assertTrue(all(p.grad is None for p in model.reference.parameters()))
        self.assertTrue(all(torch.equal(old[k],v) for k,v in model.reference.state_dict().items()))
        probs=model.policy.get_distribution(x,action_masks=mask).distribution.probs
        self.assertTrue(torch.all(probs[:,2]==0))

if __name__=='__main__':unittest.main()
