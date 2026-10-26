"""Map expected 2*share-1 to expected share; leave every actor tensor unchanged."""
import json,hashlib,sys
from pathlib import Path
import torch
from anchored_ppo import AnchoredPPO

torch.set_num_threads(1)
src,dst=sys.argv[1:3]
if Path(dst+'.zip').exists():raise RuntimeError('Refusing overwrite')
model=AnchoredPPO.load(src,device='cpu')
before={k:v.clone() for k,v in model.policy.state_dict().items()}
with torch.no_grad():
 model.policy.value_net.weight.mul_(.5)
 model.policy.value_net.bias.mul_(.5).add_(.5)
for key,value in model.policy.state_dict().items():
 if key not in ['value_net.weight','value_net.bias']:assert torch.equal(value,before[key]),key
model.save(dst)
Path(dst+'-rescale.json').write_text(json.dumps(dict(sourceSHA256=hashlib.sha256(Path(src+'.zip').read_bytes()).hexdigest(),checkpointSHA256=hashlib.sha256(Path(dst+'.zip').read_bytes()).hexdigest(),actorUnchanged=True,criticTransform='V_new = (V_old + 1) / 2; same initialization in every reward arm'),indent=2)+'\n')
