"""Lossless research-only critic export for public-information leaf evaluation."""
import base64,hashlib,json,subprocess,sys
from pathlib import Path
import torch
from anchored_ppo import AnchoredPPO
src,out=sys.argv[1:3];torch.set_num_threads(1);model=AnchoredPPO.load(src,device='cpu');state=model.policy.state_dict();layers=[]
for name in ['mlp_extractor.value_net.0','mlp_extractor.value_net.2','value_net']:
 w=state[name+'.weight'].cpu().numpy().astype('<f4');b=state[name+'.bias'].cpu().numpy().astype('<f4');layers.append(dict(input=w.shape[1],output=w.shape[0],weights=base64.b64encode(w.tobytes()).decode(),bias=base64.b64encode(b.tobytes()).decode()))
meta=json.loads(subprocess.check_output(['bun','-e',"import {publicSchemaSignature,publicObservationSize} from './scripts/rl/public_features';console.log(JSON.stringify({schema:publicSchemaSignature('public-v1'),size:publicObservationSize}))"],text=True))
assert layers[0]['input']==meta['size'] and layers[-1]['output']==1
path=Path(src if src.endswith('.zip') else src+'.zip')
result=dict(version=1,leader='doreios',schemaSignature=meta['schema'],checkpointSHA256=hashlib.sha256(path.read_bytes()).hexdigest(),dtype='float32-le',activation='tanh',observationKind='public-v1',purpose='research-value',reward=dict(kind='score-margin',scale=8,winWeight=0),layers=layers)
Path(out).write_text(json.dumps(result,separators=(',',':'))+'\n')
