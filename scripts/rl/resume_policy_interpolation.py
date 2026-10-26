"""Resume after a filename/export failure that occurred before candidate games."""
import hashlib,json,os,shutil,subprocess,sys,time
from pathlib import Path
import torch
from anchored_ppo import AnchoredPPO
from native_evaluate import evaluate_native
from train_four import summary
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p,v):p.write_text(json.dumps(v,indent=2)+'\n')
r=Path('balance-results/doreios-four-rl-v38');c=json.loads((r/'config.json').read_text());protocol=json.loads((r/'protocol.json').read_text());assert not (r/'recovery.json').exists() and not (r/'selection.json').exists()
assert sha(r/'incumbent.zip')==protocol['baseSHA256'] and sha(r/'endpoint.zip')==protocol['endpointSHA256']
for k,v in c.items():assert protocol[k]==v
assert sorted(json.loads((r/'screening.json').read_text()))==['incumbent']
baseline_hash=sha(r/'incumbent-screen.json');write(r/'recovery.json',dict(pid=os.getpid(),time=time.time(),reason='Decimal filename treated as suffix by checkpoint writer; export failed before candidate evaluation. Use integer-percent names, preserve original baseline, checkpoint tensors, alpha values and seeds.',baselineScreenSHA256=baseline_hash,failedCheckpoint='blend-0.25',originalProtocolSHA256=sha(r/'protocol.json')))
torch.set_num_threads(1);original=AnchoredPPO.load(r/'incumbent',device='cpu').policy.state_dict();target=AnchoredPPO.load(r/'endpoint',device='cpu').policy.state_dict();assert original.keys()==target.keys();keys=[k for k in original if k.startswith('mlp_extractor.policy_net.') or k.startswith('action_net.')];assert len(keys)==6
scores={'incumbent':dict(alpha=0,**summary(json.loads((r/'incumbent-screen.json').read_text())))};paths={'incumbent':r/'incumbent'}
for alpha in c['alphas'][1:]:
 name=f'blend-{int(alpha*100)}';paths[name]=r/name;assert not (r/name).with_suffix('.zip').exists();model=AnchoredPPO.load(r/'incumbent',device='cpu');state={k:((1-alpha)*value+alpha*target[k] if k in keys else value.clone()) for k,value in original.items()};assert all(torch.isfinite(v).all() for v in state.values());model.policy.load_state_dict(state)
 for k,value in model.policy.state_dict().items():
  if k not in keys:assert torch.equal(value,original[k])
 if alpha==.25:
  prior=AnchoredPPO.load(r/'blend-0.25',device='cpu').policy.state_dict();assert all(torch.equal(state[k],prior[k]) for k in state);write(r/'recovery-parameter-parity.json',dict(exactOriginalQuarterBlendTensors=True,criticUnchanged=True))
 model.save(r/name);rows=evaluate_native(r/name,c['opponent'],c['prefix'],'screen',c['screenGames'],c['workers'],worker=c['nativeWorker']);write(r/f'{name}-screen.json',rows);scores[name]=dict(alpha=alpha,**summary(rows));print(json.dumps(dict(stage='screen',model=name,**scores[name])),flush=True);write(r/'screening.json',scores)
assert sha(r/'incumbent-screen.json')==baseline_hash
best=max(scores,key=lambda k:scores[k]['share']);shutil.copyfile(paths[best].with_suffix('.zip'),r/'selected.zip');write(r/'selection.json',dict(selected='selected',source=best,screen=scores[best],screening=scores,checkpointSHA256=sha(r/'selected.zip')))
for script,label in [('confirm_selected_four.py','confirm'),('audit_four_campaign.py','audit')]:
 with (r/f'{label}.log').open('w') as log:subprocess.run([sys.executable,'scripts/rl/'+script,str(r)],stdout=log,stderr=subprocess.STDOUT,check=True)
write(r/'queue-finished.json',dict(completed=True,recovered=True,time=time.time()))
