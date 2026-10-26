"""Verify that auxiliary regression trains actor features without changing its action head."""
import sys
import torch
from anchored_ppo import AnchoredPPO
torch.set_num_threads(1);m=AnchoredPPO.load(sys.argv[1],device='cpu');p=m.policy
obs=torch.randn(32,m.observation_space.shape[0]);target=torch.linspace(0,1,32)
# First regression step learns a nonzero readout from zero initialization.
optimizer=torch.optim.SGD(p.parameters(),lr=.1)
loss=torch.nn.functional.mse_loss(p.auxiliary_values(obs),target);optimizer.zero_grad();loss.backward();optimizer.step()
optimizer.zero_grad();torch.nn.functional.mse_loss(p.auxiliary_values(obs),target).backward()
assert p.mlp_extractor.policy_net[0].weight.grad.abs().sum()>0
assert p.action_net.weight.grad is None
assert p.mlp_extractor.value_net[0].weight.grad is None
assert p.auxiliary_value_head.weight.grad.abs().sum()>0
print('Auxiliary gradient reaches actor features and auxiliary head only; saved checkpoint was not modified.')
