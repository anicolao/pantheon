"""Test smaller actor-parameter steps toward a non-improving PPO refinement."""
import hashlib,json,os,shutil,subprocess,sys,time,uuid
from pathlib import Path
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p,v):p.write_text(json.dumps(v,indent=2)+'\n')
def main():
 r=Path('balance-results/doreios-four-rl-v38');r.mkdir(exist_ok=False);base=Path('balance-results/doreios-four-rl-v32');endpoint=Path('balance-results/doreios-four-rl-v35')
 write(r/'queue.json',dict(pid=os.getpid(),time=time.time(),gate=str(endpoint/'queue-finished.json'),plan='Actor parameter interpolation at alpha0,.25,.5,.75 between retainedv32 and selectedv35. Preservev32 critic. Frozen512screen then6400freshpairedgames/model andfullaudit. No deployment.'))
 while not (endpoint/'queue-finished.json').exists():time.sleep(10)
 assert json.loads((endpoint/'queue-finished.json').read_text())['completed']
 for source in [base,endpoint]:
  a=json.loads((source/'audit.json').read_text());assert a['browserRuntimeMatchesReferenceOutcomes'] and a['replaysVerified']==12800
 while shutil.disk_usage('.').free<1024**3:time.sleep(30)
 import torch
 from anchored_ppo import AnchoredPPO
 from native_evaluate import evaluate_native
 from train_four import summary
 torch.set_num_threads(1)
 shutil.copyfile(base/'selected.zip',r/'incumbent.zip');shutil.copyfile(endpoint/'selected.zip',r/'endpoint.zip');shutil.copytree(base/'actors',r/'actors');shutil.copyfile(base/'candidate.json',r/'actors/doreios.json');shutil.copyfile(base/'native-evaluate-worker.js',r/'native-evaluate-worker.js');manifest=json.loads((base/'opponents.json').read_text())
 for leader,entry in manifest['actors'].items():
  p=r/'actors'/f'{leader}.json'
  if leader!='doreios':assert sha(p)==entry['sha256']
  entry.update(path=str(p.resolve()),sha256=sha(p))
 write(r/'opponents.json',manifest)
 c=dict(output=str(r),leader='doreios',base=str(r/'incumbent'),opponent='four:'+str(r/'opponents.json'),observationKind='public-v1',prefix='d4r38-'+uuid.uuid4().hex[:12],workers=8,screenGames=512,confirmationGames=6400,nativeEvaluation=True,nativeWorker=str(r/'native-evaluate-worker.js'),alphas=[0,.25,.5,.75],selection='The full low-rate PPO refinement did not improve fresh win share. Test smaller actor-parameter steps fromv32 towardselectedv35 at alpha.25/.5/.75;keepv32 critic unchanged. Interpolate only policyMLP andactionhead in float32. Include unchangedv32. Common512screen;freeze before6400freshpairedgames/model.64exportparity and12800independent runtime/fullreplay audit. No deployment.')
 write(r/'config.json',c);write(r/'protocol.json',dict(c,time=time.time(),baseSHA256=sha(r/'incumbent.zip'),endpointSHA256=sha(r/'endpoint.zip'),sourceHashes={str(p):sha(p) for p in Path('scripts/rl').glob('*') if p.is_file()}))
 for path in ['scripts/rl','src/lib/bots','src/lib/game','standard-matrix','balance-checkpoint/equal-turns/source/scripts/balance']:shutil.copytree(path,r/'source'/path,ignore=shutil.ignore_patterns('__pycache__'),dirs_exist_ok=True)
 original=AnchoredPPO.load(r/'incumbent',device='cpu').policy.state_dict();target=AnchoredPPO.load(r/'endpoint',device='cpu').policy.state_dict();assert original.keys()==target.keys()
 keys=[k for k in original if k.startswith('mlp_extractor.policy_net.') or k.startswith('action_net.')];assert len(keys)==6
 scores={};paths={}
 for alpha in c['alphas']:
  name='incumbent' if alpha==0 else f'blend-{int(alpha*100)}';paths[name]=r/name
  if alpha:
   model=AnchoredPPO.load(r/'incumbent',device='cpu');state={k:((1-alpha)*value+alpha*target[k] if k in keys else value.clone()) for k,value in original.items()};assert all(torch.isfinite(v).all() for v in state.values());model.policy.load_state_dict(state)
   for k,value in model.policy.state_dict().items():
    if k not in keys:assert torch.equal(value,original[k]),'Non-actor tensor changed'
   model.save(r/name)
  rows=evaluate_native(r/name,c['opponent'],c['prefix'],'screen',512,8,worker=c['nativeWorker']);write(r/f'{name}-screen.json',rows);scores[name]=dict(alpha=alpha,**summary(rows));print(json.dumps(dict(stage='screen',model=name,**scores[name])),flush=True);write(r/'screening.json',scores)
 best=max(scores,key=lambda k:scores[k]['share']);shutil.copyfile(paths[best].with_suffix('.zip'),r/'selected.zip');write(r/'selection.json',dict(selected='selected',source=best,screen=scores[best],screening=scores,checkpointSHA256=sha(r/'selected.zip')))
 for script,label in [('confirm_selected_four.py','confirm'),('audit_four_campaign.py','audit')]:
  with (r/f'{label}.log').open('w') as log:subprocess.run([sys.executable,'scripts/rl/'+script,str(r)],stdout=log,stderr=subprocess.STDOUT,check=True)
 write(r/'queue-finished.json',dict(completed=True,time=time.time()))
if __name__=='__main__':main()
