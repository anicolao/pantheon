"""Export a frozen signed-win critic using its matching actor's exact schema."""
import base64,hashlib,json,sys
from pathlib import Path
import numpy as np
import torch
from anchored_ppo import AnchoredPPO
checkpoint,actor_path,out=sys.argv[1:];torch.set_num_threads(1)
actor=json.loads(Path(actor_path).read_text());digest=hashlib.sha256(Path(checkpoint).read_bytes()).hexdigest()
assert digest==actor['checkpointSHA256'],'Critic must come from the exact actor checkpoint'
model=AnchoredPPO.load(checkpoint,device='cpu');state=model.policy.state_dict();layers=[]
for name in ['mlp_extractor.value_net.0','mlp_extractor.value_net.2','value_net']:
 w=state[name+'.weight'].cpu().numpy().astype('<f4');b=state[name+'.bias'].cpu().numpy().astype('<f4')
 encode=lambda x:base64.b64encode(x.tobytes()).decode()
 row=dict(input=w.shape[1],output=w.shape[0],weights=encode(w),bias=encode(b))
 assert np.array_equal(np.frombuffer(base64.b64decode(row['weights']),dtype='<f4').reshape(w.shape),w)
 assert np.array_equal(np.frombuffer(base64.b64decode(row['bias']),dtype='<f4'),b)
 layers.append(row)
assert layers[0]['input']==actor['layers'][0]['input'] and layers[-1]['output']==1
result={k:actor[k] for k in ['version','leader','schemaSignature','checkpointSHA256','dtype','activation']}
if 'observationKind' in actor:result['observationKind']=actor['observationKind']
result.update(purpose='research-value',reward=dict(kind='signed-split-win',normalization='(value + 1) / 2'),layers=layers)
Path(out).write_text(json.dumps(result,separators=(',',':'))+'\n')
