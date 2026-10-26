"""Install a searched bias vector into a normal, exportable PyTorch checkpoint."""
import json,sys,hashlib
from pathlib import Path
import torch
from anchored_ppo import AnchoredPPO
src,choice,dst=sys.argv[1:4];torch.set_num_threads(1)
if Path(dst+'.zip').exists():raise RuntimeError('Refusing overwrite')
row=json.loads(Path(choice).read_text());model=AnchoredPPO.load(src,device='cpu')
with torch.no_grad():model.policy.action_net.bias.add_(torch.tensor(row['vector'],dtype=torch.float32))
model.save(dst)
Path(dst+'-bias.json').write_text(json.dumps(dict(source=src,choice=choice,sourceSHA256=hashlib.sha256(Path(src+'.zip').read_bytes()).hexdigest(),checkpointSHA256=hashlib.sha256(Path(dst+'.zip').read_bytes()).hexdigest(),parameters=row['parameters'],vector=row['vector']),indent=2)+'\n')
