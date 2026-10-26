"""Warm-start conditional Temple-order imitation, anchoring unmodified decisions to v19."""
import hashlib,json,shutil,subprocess,sys,time
from pathlib import Path
import numpy as np
import torch
from sb3_contrib.common.maskable.utils import get_action_masks
from anchored_ppo import AnchoredPPO
from train import vector
from train_v2 import collect
from train_four import summary
from native_evaluate import evaluate_native
from select_distillation_teacher import select_teacher
def main():
 r=Path(sys.argv[1]);c=select_teacher(r);assert not (r/'protocol.json').exists();torch.set_num_threads(1);torch.manual_seed(c['seed']);np.random.seed(c['seed'])
 (r/'protocol.json').write_text(json.dumps(dict(c,time=time.time(),sourceHashes={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in Path('scripts/rl').glob('*') if p.is_file()}),indent=2)+'\n')
 base=AnchoredPPO.load(r/'incumbent',device='cpu');base.policy.set_training_mode(False)
 for p in base.policy.parameters():p.requires_grad_(False)
 model=AnchoredPPO.load(r/'incumbent',device='cpu')
 vec=vector(c['workers'],'demonstrations',c['prefix'],leader='doreios',opponent='four:'+str(r/'opponents-teacher.json'))
 try:data,n=collect(vec,model,c['demonstrationGames'],'demonstrations')
 finally:vec.close()
 np.savez_compressed(r/'demonstrations.npz',observations=data[0],masks=data[1],labels=data[2]);(r/'collection.json').write_text(json.dumps(dict(games=n,samples=len(data[2])))+'\n')
 x=torch.tensor(data[0]);masks=torch.tensor(data[1]);labels=torch.tensor(data[2],dtype=torch.long);del data
 optimizer=torch.optim.Adam(model.policy.parameters(),lr=c['learningRate']);scores={};paths={}
 def assess(name):
  rows=evaluate_native(r/name,c['opponent'],c['prefix'],'screen',c['screenGames'],c['workers'],worker=c['nativeWorker']);(r/f'{name}-screen.json').write_text(json.dumps(rows)+'\n');scores[name]=summary(rows);paths[name]=r/name;print(json.dumps(dict(stage='screen',model=name,**scores[name])),flush=True);(r/'screening.json').write_text(json.dumps(scores,indent=2)+'\n')
 assess('incumbent')
 for epoch in range(1,max(c['epochs'])+1):
  losses=[];changed=0;correct=0
  for ids in torch.randperm(len(labels)).split(512):
   obs=x[ids];mask=masks[ids];target=labels[ids]
   with torch.no_grad():reference=base.policy.get_distribution(obs,action_masks=mask).distribution;override=reference.probs.argmax(-1)!=target
   current=model.policy.get_distribution(obs,action_masks=mask).distribution
   ce=-current.log_prob(target);kl=(current.probs*(current.probs.clamp_min(1e-8).log()-reference.probs.clamp_min(1e-8).log())).sum(-1)
   loss=torch.where(override,c['overrideWeight']*ce,kl).mean();assert torch.isfinite(loss)
   optimizer.zero_grad();loss.backward();torch.nn.utils.clip_grad_norm_(model.policy.parameters(),.5);optimizer.step();losses.append(loss.item());changed+=int(override.sum());correct+=int((current.probs.argmax(-1)==target).sum())
  print(json.dumps(dict(stage='fit',epoch=epoch,loss=float(np.mean(losses)),overrides=changed,samples=len(labels),trainingAccuracy=correct/len(labels))),flush=True)
  for key,value in model.policy.state_dict().items():
   if 'value_net' in key:assert torch.equal(value,base.policy.state_dict()[key]),'Critic changed during actor distillation'
  if epoch in c['epochs']:
   name=f'epoch-{epoch}';model.save(r/name);assess(name)
 best=max(scores,key=lambda k:scores[k]['share']);shutil.copyfile(paths[best].with_suffix('.zip'),r/'selected.zip');(r/'selection.json').write_text(json.dumps(dict(selected='selected',source=best,screen=scores[best],screening=scores,checkpointSHA256=hashlib.sha256((r/'selected.zip').read_bytes()).hexdigest()),indent=2)+'\n')
 for script in ['confirm_selected_four.py','audit_four_campaign.py']:subprocess.run([sys.executable,'scripts/rl/'+script,str(r)],check=True)

if __name__=='__main__':main()
