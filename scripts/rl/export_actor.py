"""Export only learned actor tensors, losslessly, for the browser runtime."""
import argparse,base64,hashlib,json,subprocess
from pathlib import Path
import torch
from anchored_ppo import AnchoredPPO
p=argparse.ArgumentParser();p.add_argument('checkpoint');p.add_argument('leader');p.add_argument('output');p.add_argument('--observation-kind',choices=['public-v1','zero-public-v1']);args=p.parse_args()
torch.set_num_threads(1);model=AnchoredPPO.load(args.checkpoint,device='cpu');state=model.policy.state_dict();layers=[]
for name in ['mlp_extractor.policy_net.0','mlp_extractor.policy_net.2','action_net']:
 w=state[name+'.weight'].cpu().numpy().astype('<f4');b=state[name+'.bias'].cpu().numpy().astype('<f4')
 layers.append(dict(input=w.shape[1],output=w.shape[0],weights=base64.b64encode(w.tobytes()).decode(),bias=base64.b64encode(b.tobytes()).decode()))
assert len(layers)==3 and layers[-1]['output']==349
assert all(a['output']==b['input'] for a,b in zip(layers,layers[1:]))
checkpoint=Path(args.checkpoint if args.checkpoint.endswith('.zip') else args.checkpoint+'.zip')
if args.observation_kind:
 metadata=json.loads(subprocess.check_output(['bun','-e',"import {publicSchemaSignature,publicObservationSize} from './scripts/rl/public_features'; console.log(JSON.stringify({schema:publicSchemaSignature("+json.dumps(args.observation_kind)+"),size:publicObservationSize}))"],text=True))
 schema=metadata['schema'];assert layers[0]['input']==metadata['size']
else:
 assert layers[0]['input']==171
 schema=subprocess.check_output(['bun','-e',"import {schemaSignature} from './src/lib/bots/rl-schema'; console.log(schemaSignature)"],text=True).strip()
payload=dict(version=1,leader=args.leader,schemaSignature=schema,checkpointSHA256=hashlib.sha256(checkpoint.read_bytes()).hexdigest(),dtype='float32-le',activation='tanh',layers=layers)
if args.observation_kind:payload['observationKind']=args.observation_kind
Path(args.output).write_text(json.dumps(payload,separators=(',',':'))+'\n')
