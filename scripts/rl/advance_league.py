"""Apply preregistered promotion gates and freeze the next round's opponent pool."""
import argparse,json,hashlib,shutil,subprocess,sys
from pathlib import Path
root=Path('balance-results/league-rl-v1');leaders=['melia','nereon','thaleia','doreios']
def read(p):return json.loads(Path(p).read_text())
def write(p,x):Path(p).parent.mkdir(parents=True,exist_ok=True);Path(p).write_text(json.dumps(x,indent=2)+'\n')
p=argparse.ArgumentParser();p.add_argument('round',type=int);r=p.parse_args().round
if (root/f'round-{r}/promotions.json').exists():raise RuntimeError('Round already advanced')
selections=read(root/f'round-{r}/selection.json');gates=read(root/f'round-{r}/reference-gates.json');promotions={};paths={};actors={}
for l in leaders:
 s=selections[l];passed=False;guard=None
 if gates[l]['referencePassed']:
  guard=read(root/f'round-{r}/money-{l}/results.json')['comparisons']['candidate-vs-incumbent'];passed=guard['shareDelta']>=-.03
 source=s['candidate'] if passed else s['incumbent'];dest=root/f'champions/round-{r}/{l}';dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source+'.zip',str(dest)+'.zip');paths[l]=str(dest)
 export=root/f'actors/r{r}-{l}.json';subprocess.run([sys.executable,'scripts/rl/export_actor.py',str(dest),l,str(export)],check=True);actor=read(export)
 actors[l]=dict(id=f'r{r}-{l}',leader=l,group='current',weight=4,actor=str(export),actorSHA256=hashlib.sha256(export.read_bytes()).hexdigest(),checkpointSHA256=actor['checkpointSHA256'])
 promotions[l]=dict(promoted=passed,source=source,checkpoint=str(dest),checkpointSHA256=actor['checkpointSHA256'],referenceGate=gates[l],moneyGuard=guard)
write(root/f'round-{r}/promotions.json',promotions)
if r==1:
 initial=read(root/'manifests/round-1.json')['learners'];train={}
 for l in leaders:
  old=[dict(e,group='historical',weight=1) for e in initial[l] if e['group'] in ['current','historical']]
  heuristics=[dict(e,weight=2) for e in initial[l] if e['group']=='heuristic']
  train[l]=[actors[o] for o in leaders if o!=l]+old+heuristics
 write(root/'manifests/round-2.json',dict(version=1,learners=train));write(root/'round-2/incumbents.json',paths)
 for i,l in enumerate(leaders):
  c=read(root/f'configs/train-r1-{l}.json');c.update(base=selections[l]['candidate'],reference=paths[l],trainOpponent=f'league:{root}/manifests/round-2.json',seed=3200+i,trainNamespace='train-r2',output=str(root/f'round-2/{l}'))
  write(root/f'configs/train-r2-{l}.json',c)
  b=read(root/f'configs/baseline-{l}.json');b.update(models={'incumbent':paths[l]},output=str(root/f'round-2/baseline-{l}'));write(root/f'configs/baseline-r2-{l}.json',b)
else:
 for l in leaders:
  c=read(root/f'configs/baseline-{l}.json');c.update(namespace='test',prefix=f'league-v1-final:{l}',games=3072,models={'v1':read(root/'protocol.json')['champions'][l],'selected':paths[l]},baselines=['v1'],output=str(root/f'final/{l}'));write(root/f'configs/final-{l}.json',c)
print(json.dumps({l:dict(promoted=x['promoted'],source=x['source']) for l,x in promotions.items()},indent=2))
