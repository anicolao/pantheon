"""One-dimensional output-bias search, yielding a standard exportable checkpoint."""
import hashlib,json,shutil,subprocess,sys,time
from pathlib import Path
import torch
from anchored_ppo import AnchoredPPO
from native_evaluate import evaluate_native
from train_four import summary
r=Path(sys.argv[1]);c=json.loads((r/'config.json').read_text());assert not (r/'protocol.json').exists();torch.set_num_threads(1)
(r/'protocol.json').write_text(json.dumps(dict(c,time=time.time(),sourceHashes={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in Path('scripts/rl').glob('*') if p.is_file()}),indent=2)+'\n')
scores={};base=AnchoredPPO.load(r/'incumbent',device='cpu');original=base.policy.state_dict();paths={}
for i,bias in enumerate(c['biases']):
 name='incumbent' if bias==0 else f'bias-{i}';paths[name]=r/name
 if bias:
  model=AnchoredPPO.load(r/'incumbent',device='cpu')
  with torch.no_grad():model.policy.action_net.bias[c['slot']]+=bias
  for key,value in model.policy.state_dict().items():
   expected=original[key].clone()
   if key=='action_net.bias':expected[c['slot']]+=bias
   assert torch.equal(value,expected),key
  model.save(r/name)
 rows=evaluate_native(r/name,c['opponent'],c['prefix'],'screen',c['screenGames'],c['workers'],worker=c['nativeWorker']);(r/f'{name}-screen.json').write_text(json.dumps(rows)+'\n');scores[name]=dict(bias=bias,**summary(rows));print(json.dumps(dict(stage='screen',name=name,**scores[name])),flush=True)
 (r/'screening.json').write_text(json.dumps(scores,indent=2)+'\n')
best=max(scores,key=lambda k:scores[k]['share']);shutil.copyfile(paths[best].with_suffix('.zip'),r/'selected.zip');(r/'selection.json').write_text(json.dumps(dict(selected='selected',source=best,screen=scores[best],screening=scores,checkpointSHA256=hashlib.sha256((r/'selected.zip').read_bytes()).hexdigest()),indent=2)+'\n')
for script in ['confirm_selected_four.py','audit_four_campaign.py']:subprocess.run([sys.executable,'scripts/rl/'+script,str(r)],check=True)
