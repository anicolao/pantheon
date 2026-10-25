"""Export only learned actor tensors, losslessly, for the browser runtime."""
import argparse,base64,hashlib,json,subprocess
from pathlib import Path
import torch
from anchored_ppo import AnchoredPPO
p=argparse.ArgumentParser();p.add_argument('checkpoint');p.add_argument('leader');p.add_argument('output');args=p.parse_args()
torch.set_num_threads(1);model=AnchoredPPO.load(args.checkpoint,device='cpu');state=model.policy.state_dict();layers=[]
for name in ['mlp_extractor.policy_net.0','mlp_extractor.policy_net.2','action_net']:
 w=state[name+'.weight'].cpu().numpy().astype('<f4');b=state[name+'.bias'].cpu().numpy().astype('<f4')
 layers.append(dict(input=w.shape[1],output=w.shape[0],weights=base64.b64encode(w.tobytes()).decode(),bias=base64.b64encode(b.tobytes()).decode()))
assert [x['input'] for x in layers]==[171,128,128] and [x['output'] for x in layers]==[128,128,349]
checkpoint=Path(args.checkpoint if args.checkpoint.endswith('.zip') else args.checkpoint+'.zip')
schema=subprocess.check_output(['bun','-e',"import {schemaSignature} from './src/lib/bots/rl-schema'; console.log(schemaSignature)"],text=True).strip()
Path(args.output).write_text(json.dumps(dict(version=1,leader=args.leader,schemaSignature=schema,checkpointSHA256=hashlib.sha256(checkpoint.read_bytes()).hexdigest(),dtype='float32-le',activation='tanh',layers=layers),separators=(',',':'))+'\n')
