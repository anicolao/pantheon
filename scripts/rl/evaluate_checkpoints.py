"""Matched checkpoint evaluation, with separate seed namespace chosen by caller."""
import argparse,json,time,hashlib
from pathlib import Path
import torch
from anchored_ppo import AnchoredPPO
from train import vector,evaluate,stats,paired

def main():
    p=argparse.ArgumentParser();p.add_argument('config');args=p.parse_args()
    config=json.loads(Path(args.config).read_text());out=Path(config['output']);out.mkdir(parents=True,exist_ok=True)
    if (out/'results.json').exists():raise RuntimeError('Refusing to overwrite evaluation')
    torch.set_num_threads(1);start=time.monotonic();rows={};summaries={}
    (out/'protocol.json').write_text(json.dumps(config,indent=2))
    vec=vector(config.get('workers',8),config['namespace'],config['prefix'],leader=config.get('leader','doreios'),teacher=config.get('teacher','classic-engine'))
    try:
        for name,path in config['models'].items():
            teacher=path in ['classic-engine','teacher']
            model=None if teacher else AnchoredPPO.load(path,device='cpu')
            rows[name]=evaluate(vec,model,config['namespace'],config['games'],teacher=teacher)
            (out/f'{name}.json').write_text(json.dumps(rows[name]));summaries[name]=stats(rows[name])
            print(json.dumps(dict(model=name,elapsedSeconds=time.monotonic()-start,**summaries[name])),flush=True)
        baselines=config.get('baselines',[])
        comparisons={f'{name}-vs-{base}':paired(rows[name],rows[base]) for name in rows for base in baselines if name!=base}
        hashes={name:hashlib.sha256(Path(path+'.zip').read_bytes()).hexdigest() for name,path in config['models'].items() if path not in ['classic-engine','teacher']}
        (out/'results.json').write_text(json.dumps(dict(summary=summaries,comparisons=comparisons,checkpointSHA256=hashes,elapsedSeconds=time.monotonic()-start),indent=2))
    finally:vec.close()
if __name__=='__main__':main()
