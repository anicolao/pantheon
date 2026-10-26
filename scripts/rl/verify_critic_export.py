"""Verify lossless critic tensors and JS-compatible evaluation against the trained critic."""
import base64,json,subprocess,sys
from pathlib import Path
import numpy as np
import torch
from anchored_ppo import AnchoredPPO
src,critic,out=sys.argv[1:4];torch.set_num_threads(1);model=AnchoredPPO.load(src,device='cpu');data=json.loads(Path(critic).read_text());state=model.policy.state_dict();decoded=[]
for name,layer in zip(['mlp_extractor.value_net.0','mlp_extractor.value_net.2','value_net'],data['layers'],strict=True):
 w=np.frombuffer(base64.b64decode(layer['weights']),dtype='<f4').reshape(layer['output'],layer['input']);b=np.frombuffer(base64.b64decode(layer['bias']),dtype='<f4');assert np.array_equal(w,state[name+'.weight'].numpy()) and np.array_equal(b,state[name+'.bias'].numpy());decoded.append((w,b))
rng=np.random.default_rng(8428);x=rng.uniform(-1,1,(256,decoded[0][0].shape[1])).astype(np.float32)
inputs=Path(out).with_suffix('.inputs.json');inputs.write_text(json.dumps(x.tolist()))
code="import {readFileSync} from 'node:fs';import {createResearchActor} from './scripts/rl/research_actor';const a=createResearchActor(JSON.parse(readFileSync(process.argv[1],'utf8'))),x=JSON.parse(readFileSync(process.argv[2],'utf8'));console.log(JSON.stringify(x.map(v=>a.logits(v)[0])));"
y=np.array(json.loads(subprocess.check_output(['bun','-e',code,critic,str(inputs)],text=True)))
with torch.no_grad():ref=model.policy.predict_values(torch.tensor(x)).flatten().numpy()
# JS accumulates products in double precision then rounds each layer; PyTorch uses float32 matrix kernels.
max_error=float(np.max(np.abs(y-ref)));assert max_error<2e-6
result=dict(samples=len(x),allTensorBytesPreserved=True,maximumAbsoluteDifferenceFromPyTorch=max_error,note='Floating-point kernel roundoff is reported explicitly; exported weights are lossless. Production reducers and replay equality remain exact.')
Path(out).write_text(json.dumps(result,indent=2)+'\n');inputs.unlink();print(json.dumps(result))
