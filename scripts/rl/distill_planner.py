"""Learn confirmed planner interventions while anchoring all other decisions."""
import hashlib,json,shutil,subprocess,sys,time
from pathlib import Path
import numpy as np
import torch
from anchored_ppo import AnchoredPPO
from native_evaluate import evaluate_native
from train_four import summary

def main():
 r=Path(sys.argv[1]);c=json.loads((r/'config.json').read_text());teacher=Path(c['teacherStudy'])
 assert json.loads((teacher/'queue-finished.json').read_text())['completed']
 assert json.loads((teacher/'results.json').read_text())['improvementConfirmed']
 dataset=Path(c['dataset']);collection=json.loads((dataset.parent/'collection.json').read_text())
 demonstrations=json.loads((dataset.parent/'protocol.json').read_text());teacher_config=json.loads((teacher/'config.json').read_text());manifest=json.loads(Path(teacher_config['opponentManifest']).read_text())
 assert demonstrations['actorSHA256']=={k:v['sha256'] for k,v in manifest['actors'].items()}
 assert demonstrations['criticSHA256']==hashlib.sha256(Path(teacher_config['critic']).read_bytes()).hexdigest()
 assert demonstrations['selectionSHA256']==hashlib.sha256((teacher/'selection.json').read_bytes()).hexdigest()
 assert hashlib.sha256(dataset.read_bytes()).hexdigest()==collection['datasetSHA256']
 assert collection['actualFullReplaysVerified'] and collection['games']==512
 assert not (r/'protocol.json').exists();torch.set_num_threads(1);torch.manual_seed(c['seed']);np.random.seed(c['seed'])
 (r/'protocol.json').write_text(json.dumps(dict(c,time=time.time(),sourceHashes={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in Path('scripts/rl').glob('*') if p.is_file()}),indent=2)+'\n')
 data=np.load(dataset);x=torch.tensor(data['observations']);masks=torch.tensor(data['masks']);labels=torch.tensor(data['labels'],dtype=torch.long);overrides=torch.tensor(data['labels']!=data['baseLabels']);assert int(overrides.sum())==collection['overrides'];assert masks[torch.arange(len(labels)),labels].all();assert torch.isfinite(x).all()
 scores={};paths={}
 def assess(name):
  rows=evaluate_native(r/name,c['opponent'],c['prefix'],'screen',c['screenGames'],c['workers'],worker=c['nativeWorker']);(r/f'{name}-screen.json').write_text(json.dumps(rows)+'\n');scores[name]=summary(rows);paths[name]=r/name;print(json.dumps(dict(stage='screen',model=name,**scores[name])),flush=True);(r/'screening.json').write_text(json.dumps(scores,indent=2)+'\n')
 assess('incumbent')
 for arm,checkpoint in [('current','incumbent'),('teacher','teacher-base')]:
  torch.manual_seed(c['seed']);base=AnchoredPPO.load(r/checkpoint,device='cpu');base.policy.set_training_mode(False)
  for p in base.policy.parameters():p.requires_grad_(False)
  model=AnchoredPPO.load(r/checkpoint,device='cpu');optimizer=torch.optim.Adam(model.policy.parameters(),lr=c['learningRate']);model.policy.optimizer=optimizer
  for epoch in range(1,max(c['epochs'])+1):
   losses=[]
   for ids in torch.randperm(len(labels)).split(512):
    obs=x[ids];mask=masks[ids];target=labels[ids]
    with torch.no_grad():reference=base.policy.get_distribution(obs,action_masks=mask).distribution
    current=model.policy.get_distribution(obs,action_masks=mask).distribution
    ce=-current.log_prob(target);kl=(current.probs*(current.probs.clamp_min(1e-8).log()-reference.probs.clamp_min(1e-8).log())).sum(-1)
    loss=torch.where(overrides[ids],c['overrideWeight']*ce,kl).mean();assert torch.isfinite(loss);optimizer.zero_grad();loss.backward();torch.nn.utils.clip_grad_norm_(model.policy.parameters(),.5);optimizer.step();losses.append(loss.item())
   for key,value in model.policy.state_dict().items():
    if 'value_net' in key:assert torch.equal(value,base.policy.state_dict()[key]),'Critic changed'
   print(json.dumps(dict(stage='fit',arm=arm,epoch=epoch,loss=float(np.mean(losses)))),flush=True)
   if epoch in c['epochs']:
    name=f'{arm}-epoch-{epoch}';model.save(r/name);assess(name)
 best=max(scores,key=lambda k:scores[k]['share']);shutil.copyfile(paths[best].with_suffix('.zip'),r/'selected.zip');(r/'selection.json').write_text(json.dumps(dict(selected='selected',source=best,screen=scores[best],screening=scores,checkpointSHA256=hashlib.sha256((r/'selected.zip').read_bytes()).hexdigest()),indent=2)+'\n')
 for script in ['confirm_selected_four.py','audit_four_campaign.py']:subprocess.run([sys.executable,'scripts/rl/'+script,str(r)],check=True)

if __name__=='__main__':main()
