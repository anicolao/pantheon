"""Fresh Grove imitation and four-player refinement; independent final confirmation."""
import hashlib,json,shutil,subprocess,sys,time
from pathlib import Path
import numpy as np
import torch
from anchored_ppo import AnchoredPPO
from train import vector,evaluate,Progress
from train_v2 import collect,fit
from train_four import summary

def main():
    out=Path(sys.argv[1]);c=json.loads((out/'config.json').read_text())
    if (out/'protocol.json').exists():raise RuntimeError('Fresh study required')
    protocol=dict(c,sourceCommit=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),sourceHashes={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in Path('scripts/rl').glob('*') if p.is_file()},teacherSourceSHA256=hashlib.sha256(Path('src/lib/bots/doreios-grove.ts').read_bytes()).hexdigest())
    (out/'protocol.json').write_text(json.dumps(protocol,indent=2)+'\n')
    torch.set_num_threads(1);torch.manual_seed(c['seed']);np.random.seed(c['seed']);start=time.monotonic()
    def env(namespace):return vector(c['workers'],namespace,c['prefix'],leader=c['leader'],opponent=c['opponent'])
    def assess(model,name,teacher=False):
        ev=env('screen')
        try:rows=evaluate(ev,model,'screen',c['screenGames'],teacher=teacher)
        finally:ev.close()
        (out/f'{name}-screen.json').write_text(json.dumps(rows)+'\n')
        score=summary(rows);print(json.dumps(dict(stage='screen',model=name,elapsedSeconds=time.monotonic()-start,**score)),flush=True)
        return score
    incumbent=AnchoredPPO.load(out/'incumbent',device='cpu');scores={'incumbent':assess(incumbent,'incumbent')}
    teacher_score=assess(None,'grove-teacher',True)
    (out/'teacher-summary.json').write_text(json.dumps(teacher_score,indent=2)+'\n')
    vec=env('imitation');imitation={}
    try:
        model=AnchoredPPO('MlpPolicy',vec,seed=c['seed'],device='cpu',n_steps=1024,batch_size=512,n_epochs=4,learning_rate=c['learningRate'],gamma=1.,gae_lambda=1.,ent_coef=c['entropy'],target_kl=.02,policy_kwargs=dict(net_arch=dict(pi=[128,128],vf=[128,128])),verbose=0)
        data,n=collect(vec,model,c['imitationGames'],'imitation');counts=[n]
        for stage in range(3):
            label='bc' if stage==0 else f'dagger-{stage}'
            if stage:
                more,n=collect(vec,model,c['daggerGames'],label,[.5,.2][stage-1]);counts.append(n)
                data=tuple(np.concatenate([old,new]) for old,new in zip(data,more))
            fit(model,data,20 if stage==0 else 10,label);model.save(out/label)
            scores[label]=imitation[label]=assess(model,label)
            (out/'screening.json').write_text(json.dumps(scores,indent=2)+'\n')
        np.savez_compressed(out/'supervised-data.npz',observations=data[0],masks=data[1],labels=data[2])
        (out/'collection.json').write_text(json.dumps(dict(games=counts,samples=len(data[2])),indent=2)+'\n')
    finally:vec.close()
    best_imitation=max(imitation,key=lambda name:imitation[name]['share'])
    vec=env('train')
    try:
        model=AnchoredPPO.load(out/best_imitation,env=vec,device='cpu');model.freeze_reference();model.anchor_coefficient=0.
        model.set_random_seed(c['seed']+1);model.policy.optimizer=torch.optim.Adam(model.policy.parameters(),lr=c['learningRate'],eps=1e-5)
        progress=Progress()
        for stage in range(c['steps']//c['checkpointEvery']):
            model.learn(total_timesteps=c['checkpointEvery'],reset_num_timesteps=stage==0,callback=progress)
            label=f'checkpoint-{model.num_timesteps}';model.save(out/label);scores[label]=assess(model,label)
            (out/'screening.json').write_text(json.dumps(scores,indent=2)+'\n')
    finally:vec.close()
    best=max(scores,key=lambda name:scores[name]['share']);shutil.copyfile(out/f'{best}.zip',out/'selected.zip')
    selection=dict(selected='selected',source=best,imitation=best_imitation,screening=scores,checkpointSHA256=hashlib.sha256((out/'selected.zip').read_bytes()).hexdigest(),elapsedSeconds=time.monotonic()-start)
    (out/'selection.json').write_text(json.dumps(selection,indent=2)+'\n');print(json.dumps(dict(stage='selected',source=best)),flush=True)
    subprocess.run([sys.executable,'scripts/rl/confirm_selected_four.py',str(out)],check=True)

if __name__=='__main__':main()
