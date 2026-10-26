"""Frozen-opponent four-player adaptation, with independent paired confirmation."""
import hashlib
import json
import math
from pathlib import Path
import statistics
import subprocess
import sys
import time
import numpy as np
import torch
from anchored_ppo import AnchoredPPO
from train import vector, evaluate, Progress


def summary(rows):
    blocks = {}
    for row in rows:
        assert row['replayVerified']
        blocks.setdefault(row['block'], []).append(row)
    for group in blocks.values():
        assert len(group) == 4
        assert {r['seat'] for r in group} == set(range(4))
        assert {r['turnPosition'] for r in group} == set(range(4))
    values = [statistics.mean(r['share'] for r in group) for group in blocks.values()]
    mean = statistics.mean(values)
    half = 1.96 * statistics.stdev(values) / math.sqrt(len(values))
    return dict(games=len(rows), share=mean, CI95=[max(0, mean-half), min(1, mean+half)],
                meanVP=statistics.mean(r['score'] for r in rows),
                soleWins=sum(r['share'] == 1 for r in rows), sharedWins=sum(0 < r['share'] < 1 for r in rows))


def main():
    c = json.loads(Path(sys.argv[1]).read_text());out=Path(c['output'])
    if (out/'protocol.json').exists():raise RuntimeError('Refusing to overwrite study')
    protocol=dict(c,sourceCommit=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),
                  sourceHashes={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in Path('scripts/rl').glob('*') if p.is_file()},
                  incumbentSHA256=hashlib.sha256(Path(c['base']+'.zip').read_bytes()).hexdigest(),
                  trainingBaseSHA256=hashlib.sha256(Path(c.get('trainingBase',c['base'])+'.zip').read_bytes()).hexdigest())
    (out/'protocol.json').write_text(json.dumps(protocol,indent=2)+'\n')
    torch.set_num_threads(1);torch.manual_seed(c['seed']);np.random.seed(c['seed'])
    start=time.monotonic()
    def env(namespace):
        opponent=c['opponent'] if namespace==c.get('trainNamespace','train') else c.get('evaluationOpponent',c['opponent'])
        return vector(c['workers'],namespace,c['prefix'],leader=c.get('leader','doreios'),opponent=opponent)
    def assess(model,namespace,label,n):
        if c.get('nativeEvaluation',False):
            from native_evaluate import evaluate_native
            checkpoint=c['base'] if label=='incumbent' else out/label
            rows=evaluate_native(checkpoint,c.get('evaluationOpponent',c['opponent']),c['prefix'],namespace,n,c['workers'],leader=c.get('leader','doreios'),observation_kind=c.get('observationKind'),worker=c.get('nativeWorker','scripts/rl/native_evaluate_worker.ts'))
        else:
            ev=env(namespace)
            try:rows=evaluate(ev,model,namespace,n)
            finally:ev.close()
        (out/f'{label}-{namespace}.json').write_text(json.dumps(rows)+'\n')
        result=summary(rows);print(json.dumps(dict(stage=namespace,model=label,elapsedSeconds=time.monotonic()-start,**result)),flush=True)
        return rows,result
    incumbent=AnchoredPPO.load(c['base'],device='cpu')
    _,base=assess(incumbent,'screen','incumbent',c['screenGames'])
    scores={'incumbent':base};best='incumbent';best_share=base['share']
    if c.get('includeTrainingBase',False):
        initial=AnchoredPPO.load(c.get('trainingBase',c['base']),device='cpu');initial.save(out/'initial')
        _,score=assess(initial,'screen','initial',c['screenGames']);scores['initial']=score
        if score['share']>best_share:best,best_share='initial',score['share']
    vec=env(c.get('trainNamespace','train'))
    try:
        model=AnchoredPPO.load(c.get('trainingBase',c['base']),env=vec,device='cpu',learning_rate=c['learningRate'],n_steps=1024,batch_size=512,gae_lambda=c.get('gaeLambda',1.),gamma=1.,ent_coef=c['entropy'],target_kl=.02,n_epochs=4)
        assert model.rollout_buffer.gae_lambda==c.get('gaeLambda',1.) and model.gamma==1.
        model.reference=incumbent.policy;model.reference.set_training_mode(False)
        for p in model.reference.parameters():p.requires_grad_(False)
        model.anchor_coefficient=c['anchor'];model.auxiliary_coefficient=c.get('auxiliaryCoefficient',0.);model.set_random_seed(c['seed'])
        if not math.isfinite(model.auxiliary_coefficient) or model.auxiliary_coefficient<0:raise ValueError('Invalid auxiliary coefficient')
        if model.auxiliary_coefficient and not hasattr(model.policy,'auxiliary_values'):raise ValueError('Auxiliary policy required')
        if c.get('logitScale',1.)!=1.:
            with torch.no_grad():
                model.policy.action_net.weight.mul_(c['logitScale'])
                model.policy.action_net.bias.mul_(c['logitScale'])
        model.policy.optimizer=torch.optim.Adam(model.policy.parameters(),lr=c['learningRate'],eps=1e-5)
        progress=Progress()
        for stage in range(c['steps']//c['checkpointEvery']):
            model.learn(total_timesteps=c['checkpointEvery'],reset_num_timesteps=stage==0,callback=progress)
            label=f'checkpoint-{model.num_timesteps}';model.save(out/label)
            _,score=assess(model,'screen',label,c['screenGames']);scores[label]=score
            if score['share']>best_share:best,best_share=label,score['share']
            (out/'screening.json').write_text(json.dumps(scores,indent=2)+'\n')
    finally:vec.close()
    (out/'selection.json').write_text(json.dumps(dict(selected=best,screening=scores),indent=2)+'\n')
    if c.get('screenOnly',False):
        print(json.dumps(dict(stage='screen-complete',selected=best,screeningShare=best_share,elapsedSeconds=time.monotonic()-start)),flush=True)
        return
    before,before_summary=assess(incumbent,'confirm','incumbent',c['confirmationGames'])
    if best=='incumbent':after,after_summary=before,before_summary
    else:after,after_summary=assess(AnchoredPPO.load(out/best,device='cpu'),'confirm',best,c['confirmationGames'])
    delta={}
    for a,b in zip(after,before,strict=True):
        assert a['seed']==b['seed'] and a['seat']==b['seat'] and a['turnPosition']==b['turnPosition']
        delta.setdefault(a['block'],[]).append(a['share']-b['share'])
    values=[statistics.mean(v) for v in delta.values()];mean=statistics.mean(values);half=1.96*statistics.stdev(values)/math.sqrt(len(values))
    result=dict(selected=best,incumbent=before_summary,candidate=after_summary,pairedShareDelta=mean,paired95CI=[mean-half,mean+half],improvementConfirmed=mean-half>0,elapsedSeconds=time.monotonic()-start)
    (out/'results.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result),flush=True)


if __name__=='__main__':main()
