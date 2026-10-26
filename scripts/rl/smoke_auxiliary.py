"""Exercise auxiliary PPO updates and checkpoint reload on real replay-verified games."""
import sys,json
from pathlib import Path
import torch
from anchored_ppo import AnchoredPPO
from train import vector
def main():
    r=Path(sys.argv[1]);torch.set_num_threads(1)
    v=vector(1,'smoke','d4r22-auxiliary-smoke',leader='doreios',opponent='four:'+str(r/'opponents-training.json'))
    try:
     m=AnchoredPPO.load(r/'auxiliary-initial',env=v,device='cpu',n_steps=128,batch_size=64,n_epochs=1)
     m.reference=AnchoredPPO.load(r/'incumbent',device='cpu').policy;m.reference.set_training_mode(False);m.anchor_coefficient=0.;m.auxiliary_coefficient=.2
     before=m.policy.auxiliary_value_head.weight.detach().clone();m.learn(total_timesteps=1024)
     assert not torch.equal(before,m.policy.auxiliary_value_head.weight)
     m.save(r/'smoke-model');again=AnchoredPPO.load(r/'smoke-model',device='cpu');assert again.auxiliary_coefficient==.2
     assert torch.equal(m.policy.auxiliary_value_head.weight,again.policy.auxiliary_value_head.weight)
     (r/'smoke.json').write_text(json.dumps(dict(decisions=1024,auxiliaryWeightsUpdated=True,checkpointRoundTrip=True,usedForSelection=False))+'\n')
     print('Real-game auxiliary PPO smoke passed; checkpoint retained separately from study candidates.')
    finally:v.close()
    

if __name__=='__main__':main()
