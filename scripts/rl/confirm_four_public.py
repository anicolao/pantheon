"""Independent public-information ablation confirmation."""
import hashlib,json,math,shutil,statistics,sys,time
from pathlib import Path
import torch
from anchored_ppo import AnchoredPPO
from train import vector,evaluate
from train_four import summary

def main():
    root=Path(sys.argv[1]);c=json.loads((root/'config.json').read_text())
    if (root/'selection.json').exists():raise RuntimeError('Selection already frozen')
    torch.set_num_threads(1);choices={};baseline=None
    for label,arm in [('control','control'),('public','public')]:
        config=json.loads((root/arm/'config.json').read_text());s=json.loads((root/arm/'selection.json').read_text())
        assert config['screenOnly'] and config['prefix']==c['prefix']
        assert config['opponent']==f'four:{root}/opponents-{label}.json'
        assert config['base']==str(root/'expanded-start')
        assert len(s['screening'])==1+config['steps']//config['checkpointEvery']
        rows=json.loads((root/arm/'incumbent-screen.json').read_text())
        if baseline is None:baseline=rows
        else:assert rows==baseline
        checkpoints={name:score for name,score in s['screening'].items() if name!='incumbent'}
        name=max(checkpoints,key=lambda name:checkpoints[name]['share']);source=root/arm/name
        shutil.copyfile(str(source)+'.zip',root/f'{label}-model.zip')
        choices[label]=dict(source=f'{arm}/{name}',screen=checkpoints[name],checkpointSHA256=hashlib.sha256((root/f'{label}-model.zip').read_bytes()).hexdigest())
    choices={'incumbent':dict(source='incumbent',screen=summary(baseline)),**choices}
    best=max(choices,key=lambda name:choices[name]['screen']['share'])
    selection=dict(selected=best,source=choices[best]['source'],choices=choices)
    (root/'selection.json').write_text(json.dumps(selection,indent=2)+'\n');print(json.dumps(dict(stage='selected',**selection)),flush=True)
    raw={};scores={};start=time.monotonic()
    for name in choices:
        model=AnchoredPPO.load(root/('incumbent.zip' if name=='incumbent' else f'{name}-model.zip'),device='cpu')
        ev=vector(c['workers'],'confirm',c['prefix'],leader=c['leader'],opponent=f'four:{root}/opponents-{name}.json')
        try:rows=evaluate(ev,model,'confirm',c['confirmationGames'])
        finally:ev.close()
        raw[name]=rows;scores[name]=summary(rows)
        (root/f'{name}-confirm.json').write_text(json.dumps(rows)+'\n');print(json.dumps(dict(stage='confirm',model=name,**scores[name])),flush=True)
    comparisons={}
    for a,b in [('public','incumbent'),('public','control'),('control','incumbent')]:
        blocks={}
        for x,y in zip(raw[a],raw[b],strict=True):
            assert (x['seed'],x['seat'],x['turnPosition'])==(y['seed'],y['seat'],y['turnPosition'])
            blocks.setdefault(x['block'],[]).append(x['share']-y['share'])
        values=[statistics.mean(v) for v in blocks.values()];mean=statistics.mean(values);se=statistics.stdev(values)/math.sqrt(len(values))
        comparisons[f'{a}-vs-{b}']=dict(delta=mean,paired95CI=[mean-1.96*se,mean+1.96*se],bonferroniTwoComparison95CI=[mean-2.2414027276*se,mean+2.2414027276*se])
    result=dict(selected=best,models=scores,comparisons=comparisons,informationImprovementConfirmed=all(comparisons[k]['bonferroniTwoComparison95CI'][0]>0 for k in ['public-vs-incumbent','public-vs-control']),confirmationSeconds=time.monotonic()-start)
    (root/'public-results.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result),flush=True)

if __name__=='__main__':main()
