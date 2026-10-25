"""Refine a fresh imitation checkpoint; save every stage and keep final seeds untouched."""
import argparse,json
from pathlib import Path
from continue_training import run

def main():
    p=argparse.ArgumentParser();p.add_argument('config');args=p.parse_args()
    c=json.loads(Path(args.config).read_text());root=Path(c['root'])
    initial=json.loads((root/'imitation/results.json').read_text())
    base=str(root/'imitation'/initial['selected'])
    config=dict(base=base,reference=base,leader=c['leader'],teacher=c['teacher'],seed=c['seed'],prefix=c['prefix'],
      trainNamespace='rl-a',screenNamespace='screen',screenGames=512,workers=8,steps=2097152,stages=4,
      lr=1e-4,rollout=1024,batch=512,gae=1.,anchor=0.,entropy=.003,reset_optimizer=True,output=str(root/'rl-a'))
    (root/'rl-a-config.json').write_text(json.dumps(config,indent=2));run(config)
if __name__=='__main__':main()
