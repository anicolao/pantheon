"""Fresh leader-specific imitation and DAgger initialization; no RL or final tests."""
import argparse,json,time,hashlib,subprocess
from pathlib import Path
import numpy as np
import torch
from anchored_ppo import AnchoredPPO
from train import ROOT,vector,evaluate,stats
from train_v2 import collect,fit
from collect_independent import collect_independent

def run(config):
    out=Path(config['output']);out.mkdir(parents=True,exist_ok=True)
    if (out/'protocol.json').exists():raise RuntimeError('Fresh output directory required')
    torch.set_num_threads(1);torch.manual_seed(config['seed']);np.random.seed(config['seed'])
    protocol=dict(config,sourceCommit=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),
        initialization='Fresh independent random 128x128 actor and critic; no transferred model weights',
        sourceHashes={str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for f in (ROOT/'scripts/rl').rglob('*') if f.is_file() and '__pycache__' not in str(f)})
    (out/'protocol.json').write_text(json.dumps(protocol,indent=2))
    start=time.monotonic();vec=vector(config.get('workers',8),'imitation',config['prefix'],leader=config['leader'],teacher=config['teacher'])
    try:
        model=AnchoredPPO('MlpPolicy',vec,seed=config['seed'],device='cpu',n_steps=1024,batch_size=512,n_epochs=4,
            learning_rate=1e-4,gamma=1.,gae_lambda=1.,ent_coef=.003,target_kl=.02,
            policy_kwargs=dict(net_arch=dict(pi=[128,128],vf=[128,128])),verbose=0)
        data,n=collect_independent(config,model,'imitation',1.,out) if config.get('independentCollection') else collect(vec,model,config.get('imitationGames',1024),'imitation');counts=[n];screen={}
        for stage in range(3):
            label='bc' if stage==0 else f'dagger-{stage}'
            if stage:
                more,n=collect_independent(config,model,label,[.5,.2][stage-1],out) if config.get('independentCollection') else collect(vec,model,config.get('daggerGames',256),label,[.5,.2][stage-1]);counts.append(n)
                data=tuple(np.concatenate([old,new]) for old,new in zip(data,more))
            fit(model,data,20 if stage==0 else 10,label)
            model.save(out/label)
            rows=evaluate(vec,model,'screen',config.get('screenGames',512));screen[label]=stats(rows)
            (out/f'{label}-screen.json').write_text(json.dumps(rows))
            print(json.dumps(dict(stage='screen',checkpoint=label,**screen[label])),flush=True)
        # Select on outright wins first; ties break an equal win count.
        best=max(screen,key=lambda k:(screen[k]['wins'],screen[k]['share']))
        np.savez_compressed(out/'supervised-data.npz',observations=data[0],masks=data[1],labels=data[2])
        (out/'results.json').write_text(json.dumps(dict(selected=best,screen=screen,collectionGames=counts,supervisedSamples=len(data[2]),elapsedSeconds=time.monotonic()-start),indent=2))
    finally:vec.close()
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('config');args=p.parse_args();run(json.loads(Path(args.config).read_text()))
