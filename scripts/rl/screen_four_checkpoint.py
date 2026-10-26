"""Screen an alternative initialization in the actual learner's game state."""
import json,sys,hashlib
from pathlib import Path
import torch
from anchored_ppo import AnchoredPPO
from train import vector,evaluate
from train_four import summary

def main():
    root=Path(sys.argv[1]);checkpoint=sys.argv[2];label=sys.argv[3];c=json.loads((root/'config.json').read_text())
    target=root/f'{label}-screen.json'
    if target.exists():raise RuntimeError('Screen already exists')
    torch.set_num_threads(1);model=None if checkpoint=='teacher' else AnchoredPPO.load(checkpoint,device='cpu')
    ev=vector(c['workers'],'screen',c['prefix'],leader=c['leader'],opponent=c['opponent'])
    try:rows=evaluate(ev,model,'screen',c['screenGames'],teacher=checkpoint=='teacher')
    finally:ev.close()
    target.write_text(json.dumps(rows)+'\n')
    result=dict(checkpoint=checkpoint,checkpointSHA256=None if checkpoint=='teacher' else hashlib.sha256(Path(checkpoint+'.zip').read_bytes()).hexdigest(),**summary(rows))
    (root/f'{label}-summary.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result),flush=True)

if __name__=='__main__':main()
