"""Collect complete on-policy episodes independently, avoiding cross-game step barriers."""
import hashlib,json,sys
from pathlib import Path
import numpy as np
import torch
from anchored_ppo import AnchoredPPO
from train import Game

def collect(job):
 torch.set_num_threads(1)
 model=AnchoredPPO.load(job['checkpoint'],device='cpu');model.policy.set_training_mode(False)
 env=Game(leader='nereon',opponent='planning:'+job['manifest'])
 obs=[];masks=[];actions=[];values=[];logp=[];rewards=[];starts=[];rows=[]
 try:
  for index in range(job['start'],job['start']+job['games']):
   seed=f"{job['prefix']}:{index}";torch.manual_seed(int.from_bytes(hashlib.sha256((seed+':policy').encode()).digest()[:4],'little'))
   state=env.call(dict(op='reset',seed=seed,first=True));first=True
   while not state['done']:
    o=np.asarray(state['observation'],dtype=np.float32);mask=np.asarray(state['mask'],dtype=bool)
    assert o.shape==(171,) and mask.shape==(349,) and np.all(np.isfinite(o))
    with torch.no_grad():
     x=torch.tensor(o).unsqueeze(0);d=model.policy.get_distribution(x,action_masks=mask[None]);a=d.get_actions(deterministic=False);v=model.policy.predict_values(x);lp=d.log_prob(a)
    action=int(a.item());assert mask[action]
    obs.append(o);masks.append(mask);actions.append(action);values.append(float(v.item()));logp.append(float(lp.item()));starts.append(first);first=False
    state=env.call(dict(op='step',action=action));rewards.append(float(state['reward']) if state['done'] else 0.)
   assert state['info']['replayVerified'] and state['reward']==2*state['info']['share']-1
   rows.append(state['info'])
 finally:env.close()
 out=Path(job['output']);assert not out.exists()
 np.savez_compressed(out,observations=np.asarray(obs,dtype=np.float32),masks=np.asarray(masks,dtype=bool),actions=np.asarray(actions,dtype=np.int64),values=np.asarray(values,dtype=np.float32),logp=np.asarray(logp,dtype=np.float32),rewards=np.asarray(rewards,dtype=np.float32),starts=np.asarray(starts,dtype=bool))
 meta=dict(job,decisions=len(actions),rows=rows,checkpointSHA256=hashlib.sha256(Path(job['checkpoint']).read_bytes()).hexdigest(),trajectorySHA256=hashlib.sha256(out.read_bytes()).hexdigest())
 out.with_suffix('.json').write_text(json.dumps(meta)+'\n');return meta

if __name__=='__main__':
 print(json.dumps(collect(json.loads(Path(sys.argv[1]).read_text()))))
