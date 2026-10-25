"""Expanded imitation + DAgger + KL-anchored PPO, frozen MM opponent."""
import argparse,json,time,subprocess,hashlib
from pathlib import Path
import numpy as np
import torch
from sb3_contrib import MaskablePPO
from sb3_contrib.common.maskable.utils import get_action_masks
from anchored_ppo import AnchoredPPO
from train import ROOT,vector,evaluate,stats,paired,Progress
PREFIX="rl-doreios-v2-pilot"

def collect(vec,model,games,namespace,teacher_probability=1.):
    vec.env_method("schedule",namespace);obs=vec.reset();completed=0;xs=[];ms=[];ys=[]
    while completed<games:
        mask=get_action_masks(vec)
        labels=np.array(vec.env_method("teacher" if teacher_probability==1 else "teacher_preview"))
        assert mask[np.arange(vec.num_envs),labels].all()
        if teacher_probability==1:actions=labels
        else:
            predicted,_=model.predict(obs,action_masks=mask,deterministic=False)
            actions=np.where(np.random.random(vec.num_envs)<teacher_probability,labels,predicted)
        xs.append(obs.copy());ms.append(mask.copy());ys.append(labels)
        obs,_,done,_=vec.step(actions);completed+=int(done.sum())
    data=(np.concatenate(xs),np.concatenate(ms),np.concatenate(ys))
    assert np.isfinite(data[0]).all()
    print(json.dumps(dict(stage="collection",namespace=namespace,games=completed,samples=len(data[2]),teacherProbability=teacher_probability)),flush=True)
    return data,completed

def fit(model,data,epochs,stage):
    x=torch.tensor(data[0]);mask=torch.tensor(data[1]);y=torch.tensor(data[2],dtype=torch.long)
    optimizer=torch.optim.Adam(model.policy.parameters(),lr=3e-4)
    for epoch in range(epochs):
        losses=[];correct=0
        for ids in torch.randperm(len(y)).split(1024):
            dist=model.policy.get_distribution(x[ids],action_masks=mask[ids])
            loss=-dist.log_prob(y[ids]).mean()
            assert torch.isfinite(loss)
            optimizer.zero_grad();loss.backward();torch.nn.utils.clip_grad_norm_(model.policy.parameters(),.5);optimizer.step()
            losses.append(loss.item());correct+=int((dist.distribution.probs.argmax(-1)==y[ids]).sum())
        print(json.dumps(dict(stage=stage,epoch=epoch+1,loss=float(np.mean(losses)),trainingAccuracy=correct/len(y))),flush=True)

def main():
    p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--seed-prefix',default=PREFIX);p.add_argument('--workers',type=int,default=8)
    p.add_argument('--imitation-games',type=int,default=1024);p.add_argument('--dagger-games',type=int,default=256)
    p.add_argument('--steps',type=int,default=524288);p.add_argument('--validation-games',type=int,default=256)
    p.add_argument('--evaluation-games',type=int,default=1000);p.add_argument('--epochs',type=int,default=20)
    args=p.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
    if (out/'protocol.json').exists():raise RuntimeError('Use a fresh output directory')
    torch.set_num_threads(1);torch.manual_seed(1702);np.random.seed(1702)
    protocol=dict(vars(args),seed=1702,seedPrefix=args.seed_prefix,opponent="frozen MM v3 Melia",leader="Doreios",
      algorithm="MaskablePPO plus KL(current || frozen best imitation), coefficient 1.0",
      reward="terminal loss=-1 tie=0 win=1; zero intermediate reward",architecture="128x128 tanh actor and critic",
      dagger="two rounds, expert action probability 0.5 then 0.2; labels queried without mutating teacher memory",
      learningRate=3e-5,selection="best validation share among supervised stages, then four RL checkpoints; earliest wins ties",
      heldOut="disjoint namespaces for demonstrations, DAgger rounds, train, validation and test; no v1 test seeds reused",
      sourceCommit=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),
      sourceHashes={str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for f in (ROOT/'scripts/rl').glob('*') if f.is_file()})
    (out/'protocol.json').write_text(json.dumps(protocol,indent=2))
    start=time.monotonic();vec=vector(args.workers,'imitation',args.seed_prefix);ev=None
    try:
        model=AnchoredPPO('MlpPolicy',vec,seed=1702,device='cpu',n_steps=256,batch_size=256,n_epochs=4,
          learning_rate=3e-5,gamma=1.,gae_lambda=.95,ent_coef=.001,target_kl=.01,
          policy_kwargs=dict(net_arch=dict(pi=[128,128],vf=[128,128])),verbose=0)
        data,imitation_games=collect(vec,model,args.imitation_games,'imitation')
        validation={};best=None;best_share=-1;collections=[imitation_games]
        for stage in range(3):
            label='bc' if stage==0 else f'dagger-{stage}'
            if stage:
                added,n=collect(vec,model,args.dagger_games,f'dagger-{stage}',[.5,.2][stage-1]);collections.append(n)
                data=tuple(np.concatenate([old,new]) for old,new in zip(data,added))
            fit(model,data,args.epochs if stage==0 else max(2,args.epochs//2),label)
            model.save(out/label)
            rows=evaluate(vec,model,'validation',args.validation_games)
            validation[label]=stats(rows);(out/f'validation-{label}.json').write_text(json.dumps(rows))
            print(json.dumps(dict(stage='validation',checkpoint=label,**validation[label])),flush=True)
            if validation[label]['share']>best_share:best,best_share=label,validation[label]['share']
        np.savez_compressed(out/'supervised-data.npz',observations=data[0],masks=data[1],labels=data[2])
        best_imitation=best
        model=AnchoredPPO.load(out/best,env=vec,device='cpu');model.freeze_reference()
        vec.env_method('schedule','train');model.set_env(vec)
        progress=Progress();train_start=time.monotonic()
        for stage in range(4):
            model.learn(total_timesteps=args.steps//4,reset_num_timesteps=stage==0,callback=progress)
            label=f'ppo-{model.num_timesteps}';model.save(out/label)
            ev=vector(args.workers,'validation',args.seed_prefix)
            try:rows=evaluate(ev,model,'validation',args.validation_games)
            finally:ev.close();ev=None
            validation[label]=stats(rows);(out/f'validation-{label}.json').write_text(json.dumps(rows))
            if validation[label]['share']>best_share:best,best_share=label,validation[label]['share']
            print(json.dumps(dict(stage='validation',checkpoint=label,referenceKL=model.logger.name_to_value.get('train/reference_kl'),**validation[label])),flush=True)
        training_seconds=time.monotonic()-train_start
        (out/'selection.json').write_text(json.dumps(dict(selected=best,imitation=best_imitation,validation=validation),indent=2))
        # The selection is now frozen. Test outcomes never influence checkpoint selection.
        ev=vector(args.workers,'test',args.seed_prefix)
        baseline=evaluate(ev,None,'test',args.evaluation_games,teacher=True)
        old=evaluate(ev,MaskablePPO.load(ROOT/'balance-results/doreios-rl-v1/bc',device='cpu'),'test',args.evaluation_games)
        imitation=evaluate(ev,AnchoredPPO.load(out/best_imitation,device='cpu'),'test',args.evaluation_games)
        selected=imitation if best==best_imitation else evaluate(ev,AnchoredPPO.load(out/best,device='cpu'),'test',args.evaluation_games)
        results=dict(selected=best,bestImitation=best_imitation,classic=stats(baseline),v1Imitation=stats(old),imitation=stats(imitation),selectedModel=stats(selected),
          selectedVsClassic=paired(selected,baseline),selectedVsImitation=paired(selected,imitation),imitationVsV1=paired(imitation,old),
          collectionGames=collections,supervisedSamples=len(data[2]),trainingGames=progress.games,trainingSteps=model.num_timesteps,
          trainingAndValidationSeconds=training_seconds,elapsedSeconds=time.monotonic()-start)
        for name,rows in [('classic',baseline),('v1-bc',old),('imitation',imitation),('selected',selected)]:
            (out/f'test-{name}.json').write_text(json.dumps(rows))
        (out/'results.json').write_text(json.dumps(results,indent=2));print(json.dumps(results),flush=True)
    finally:
        if ev is not None:ev.close()
        vec.close()

if __name__=='__main__':main()
