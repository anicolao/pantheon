"""Seeded independent collection workers for expensive demonstration teachers."""
from concurrent.futures import ProcessPoolExecutor
import multiprocessing
import json
import numpy as np
import torch
from anchored_ppo import AnchoredPPO
from train import Game

def worker(args):
    c,namespace,probability,path,rank=args
    torch.set_num_threads(1)
    model=AnchoredPPO.load(path,device='cpu') if probability<1 else None
    # Each process has its own RNG: scheduling cannot change trajectories.
    seed=c['seed']+10000+rank+(0 if probability==1 else 1000 if probability==.5 else 2000)
    torch.manual_seed(seed);np.random.seed(seed)
    n=c['imitationGames'] if probability==1 else c['daggerGames'];workers=c.get('workers',8)
    assert n%workers==0
    env=Game(rank,workers,namespace,c['prefix'],leader=c['leader'],teacher=c['teacher'])
    xs=[];ms=[];ys=[]
    try:
        for i in range(n//workers):
            obs,_=env.reset();done=False
            while not done:
                mask=env.action_masks();label=env.teacher() if probability==1 else env.teacher_preview()
                assert mask[label]
                xs.append(obs.copy());ms.append(mask.copy());ys.append(label)
                if probability==1:action=label
                else:
                    predicted,_=model.predict(obs,action_masks=mask,deterministic=False)
                    action=label if np.random.random()<probability else int(predicted)
                obs,_,done,_,_=env.step(action)
            if (i+1)%32==0:print(json.dumps(dict(stage='independent-collection',namespace=namespace,worker=rank,games=i+1)),flush=True)
    finally:env.close()
    return np.stack(xs),np.stack(ms),np.array(ys)

def collect_independent(c,model,namespace,probability,out):
    path=str(out/f'collector-{namespace}')
    model.save(path)
    workers=c.get('workers',8)
    with ProcessPoolExecutor(max_workers=workers,mp_context=multiprocessing.get_context('spawn')) as pool:
        chunks=list(pool.map(worker,[(c,namespace,probability,path,i) for i in range(workers)]))
    data=tuple(np.concatenate([chunk[i] for chunk in chunks]) for i in range(3))
    n=c['imitationGames'] if probability==1 else c['daggerGames']
    print(json.dumps(dict(stage='collection',namespace=namespace,games=n,samples=len(data[2]),teacherProbability=probability,independentWorkers=True)),flush=True)
    return data,n
