"""Confirm a previously frozen four-player selection on untouched paired deals."""
import json,math,statistics,sys,time
from pathlib import Path
import torch
from anchored_ppo import AnchoredPPO
from train import vector,evaluate
from train_four import summary

def main():
    root=Path(sys.argv[1]);c=json.loads((root/'config.json').read_text());selection=json.loads((root/'selection.json').read_text())
    if (root/'results.json').exists():raise RuntimeError('Refusing to replace confirmation')
    torch.set_num_threads(1);start=time.monotonic()
    def assess(name):
        if c.get('nativeEvaluation',False):
            from native_evaluate import evaluate_native
            rows=evaluate_native(root/name,c['opponent'],c['prefix'],'confirm',c['confirmationGames'],c['workers'],leader=c['leader'],observation_kind=c.get('observationKind'),worker=c.get('nativeWorker','scripts/rl/native_evaluate_worker.ts'))
        else:
            model=AnchoredPPO.load(root/name,device='cpu')
            ev=vector(c['workers'],'confirm',c['prefix'],leader=c['leader'],opponent=c['opponent'])
            try:rows=evaluate(ev,model,'confirm',c['confirmationGames'])
            finally:ev.close()
        (root/f'{name}-confirm.json').write_text(json.dumps(rows)+'\n')
        score=summary(rows);print(json.dumps(dict(stage='confirm',model=name,**score)),flush=True)
        return rows,score
    before,before_summary=assess('incumbent');after,after_summary=assess(selection['selected'])
    blocks={}
    for a,b in zip(after,before,strict=True):
        assert (a['seed'],a['seat'],a['turnPosition'])==(b['seed'],b['seat'],b['turnPosition'])
        blocks.setdefault(a['block'],[]).append(a['share']-b['share'])
    values=[statistics.mean(v) for v in blocks.values()];mean=statistics.mean(values);half=1.96*statistics.stdev(values)/math.sqrt(len(values))
    result=dict(selected=selection['selected'],source=selection.get('source',selection['selected']),incumbent=before_summary,candidate=after_summary,pairedShareDelta=mean,paired95CI=[mean-half,mean+half],improvementConfirmed=mean-half>0,confirmationSeconds=time.monotonic()-start)
    (root/'results.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result),flush=True)

if __name__=='__main__':main()
