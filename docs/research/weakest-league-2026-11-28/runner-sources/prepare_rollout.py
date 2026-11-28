import sys,json,base64,hashlib
from pathlib import Path
sys.path.insert(0,str(Path.cwd()/'scripts/rl/expansion'))
from common import *
root=ROOT/'balance-diagnostics/weakest-eight-house-20261128';out=root/'rollout-probe';out.mkdir();field=json.loads((root/'status.json').read_text())['field'];(out/'field.json').write_text(json.dumps(field,indent=2));p=Path(field['checkpoints']['achilles']);model=MaskablePPO.load(p,device='cpu');state=model.policy.state_dict();actor=json.loads(Path(field['actors']['achilles']['path']).read_text());layers=[]
for key in ['mlp_extractor.value_net.0','mlp_extractor.value_net.2','value_net']:
 w=state[key+'.weight'].cpu().numpy().astype('<f4');b=state[key+'.bias'].cpu().numpy().astype('<f4');layers.append(dict(input=w.shape[1],output=w.shape[0],weights=base64.b64encode(w.tobytes()).decode(),bias=base64.b64encode(b.tobytes()).decode()))
actor['layers']=layers;actor['purpose']='research-critic';(out/'critic.json').write_text(json.dumps(actor))
(out/'protocol.json').write_text(json.dumps(dict(worlds=2,ownTurnStarts=2,candidates=5,games=112,publicBelief='shuffle own deck; shuffle opponent hand+deck preserving public zone counts; replace future shuffle seed; retain visible zones',selection='first purchase/worship decision per turn, top 4 logits plus incumbent',evaluation='same paired game seeds; all actual games replay verified'),indent=2))
