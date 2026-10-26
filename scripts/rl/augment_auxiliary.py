"""Add a zero-initialized training head, preserving all actor and critic outputs."""
import json,hashlib,sys
from pathlib import Path
import torch
from anchored_ppo import AnchoredPPO
from auxiliary_policy import AuxiliaryPolicy
from widen_four import ShapeEnv
src,dst=sys.argv[1:3];torch.set_num_threads(1)
if Path(dst+'.zip').exists():raise RuntimeError('Refusing overwrite')
old=AnchoredPPO.load(src,device='cpu');inputs=old.observation_space.shape[0]
model=AnchoredPPO(AuxiliaryPolicy,ShapeEnv(inputs,old.action_space.n),device='cpu',seed=8422,n_steps=1024,batch_size=512,n_epochs=4,learning_rate=1e-4,gamma=1.,gae_lambda=.95,ent_coef=.003,target_kl=.02,policy_kwargs=old.policy_kwargs,verbose=0)
missing,extra=model.policy.load_state_dict(old.policy.state_dict(),strict=False)
assert set(missing)=={'auxiliary_value_head.weight','auxiliary_value_head.bias'} and not extra
obs=torch.randn(2048,inputs)
with torch.no_grad():
 a=old.policy.action_net(old.policy.mlp_extractor.forward_actor(obs));b=model.policy.action_net(model.policy.mlp_extractor.forward_actor(obs))
 v=old.policy.predict_values(obs);w=model.policy.predict_values(obs)
assert torch.equal(a,b) and torch.equal(v,w)
model.save(dst);restored=AnchoredPPO.load(dst,device='cpu')
with torch.no_grad():assert torch.equal(b,restored.policy.action_net(restored.policy.mlp_extractor.forward_actor(obs)))
result=dict(sourceSHA256=hashlib.sha256(Path(src+'.zip').read_bytes()).hexdigest(),checkpointSHA256=hashlib.sha256(Path(dst+'.zip').read_bytes()).hexdigest(),oldParameters=sum(p.numel() for p in old.policy.parameters()),newParameters=sum(p.numel() for p in model.policy.parameters()),randomObservations=2048,exactActorAndCriticParity=True,checkpointRoundTrip=True)
Path(dst+'-augmentation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
