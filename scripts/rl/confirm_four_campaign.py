"""Select across frozen training arms before opening a new confirmation set."""
import hashlib
import json
from pathlib import Path
import shutil
import statistics
import math
import sys
import time
import torch
from anchored_ppo import AnchoredPPO
from train import vector,evaluate
from train_four import summary


def main():
    root=Path(sys.argv[1]);c=json.loads((root/'config.json').read_text());campaign=json.loads((root/'campaign.json').read_text())
    if (root/'selection.json').exists():raise RuntimeError('Refusing to overwrite selection')
    torch.set_num_threads(1)
    options=[];baseline_rows=None
    for arm in campaign['arms']:
        config=json.loads((root/arm/'config.json').read_text());selection=json.loads((root/arm/'selection.json').read_text())
        assert config['screenOnly'] and config['prefix']==c['prefix'] and config.get('evaluationOpponent',config['opponent'])==c['opponent'] and config['base']==c['base']
        assert len(selection['screening'])==1+config['steps']//config['checkpointEvery']+int(config.get('includeTrainingBase',False))
        assert config.get('nativeEvaluation',False)==c.get('nativeEvaluation',False)
        rows=json.loads((root/arm/'incumbent-screen.json').read_text())
        if baseline_rows is None:
            baseline_rows=rows;options.append(dict(path=c['base'],source='incumbent',screen=summary(rows)))
        else:assert rows==baseline_rows
        for name,score in selection['screening'].items():
            if name!='incumbent':options.append(dict(path=str(root/arm/name),source=f'{arm}/{name}',screen=score))
    best=max(options,key=lambda x:x['screen']['share'])
    shutil.copyfile(best['path']+'.zip',root/'selected.zip')
    chosen=dict(selected='selected',source=best['source'],screen=best['screen'],options=options,
                checkpointSHA256=hashlib.sha256((root/'selected.zip').read_bytes()).hexdigest())
    (root/'selection.json').write_text(json.dumps(chosen,indent=2)+'\n')
    print(json.dumps(dict(stage='selected',**chosen)),flush=True)
    start=time.monotonic()
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
    before,before_summary=assess('incumbent');after,after_summary=assess('selected')
    blocks={}
    for a,b in zip(after,before,strict=True):
        assert (a['seed'],a['seat'],a['turnPosition'])==(b['seed'],b['seat'],b['turnPosition'])
        blocks.setdefault(a['block'],[]).append(a['share']-b['share'])
    values=[statistics.mean(v) for v in blocks.values()];mean=statistics.mean(values);half=1.96*statistics.stdev(values)/math.sqrt(len(values))
    result=dict(selected='selected',source=best['source'],incumbent=before_summary,candidate=after_summary,pairedShareDelta=mean,paired95CI=[mean-half,mean+half],improvementConfirmed=mean-half>0,confirmationSeconds=time.monotonic()-start)
    (root/'results.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result),flush=True)


if __name__=='__main__':main()
