"""Select and confirm league candidates without consulting final-test seeds."""
import argparse,json
from pathlib import Path
ROOT=Path('balance-results/league-rl-v1');LEADERS=['melia','nereon','thaleia','doreios']
def read(p):return json.loads(Path(p).read_text())
def write(p,x):Path(p).write_text(json.dumps(x,indent=2)+'\n')
p=argparse.ArgumentParser();p.add_argument('phase',choices=['select','gate']);p.add_argument('round',type=int);a=p.parse_args();r=a.round
incumbents=read(ROOT/'protocol.json')['champions'] if r==1 else read(ROOT/f'round-{r}/incumbents.json')
selection_path=ROOT/f'round-{r}/selection.json'
if a.phase=='select':
 selections={}
 for l in LEADERS:
  b=ROOT/f'baseline/{l}' if r==1 else ROOT/f'round-{r}/baseline-{l}'
  baseline=read(b/'results.json')['summary']['incumbent'];candidates=[(incumbents[l],baseline)]
  for name,score in read(ROOT/f'round-{r}/{l}/results.json')['checkpoints'].items():candidates.append((str(ROOT/f'round-{r}/{l}/{name}'),score))
  path,score=max(candidates,key=lambda c:(c[1]['share'],c[1]['wins']))
  selections[l]=dict(incumbent=incumbents[l],candidate=path,screen=score,incumbentScreen=baseline,changed=path!=incumbents[l])
  if path!=incumbents[l]:
   c=dict(leader=l,teacher='mm' if l=='melia' else 'classic-engine',opponent=f'league:{ROOT}/manifests/reference.json',prefix=f'league-v1:{l}',namespace=f'confirm-r{r}',workers=8,games=1536,models={'incumbent':incumbents[l],'candidate':path},baselines=['incumbent'],output=str(ROOT/f'round-{r}/confirm-{l}'))
   write(ROOT/f'configs/confirm-r{r}-{l}.json',c)
 write(selection_path,selections);print(json.dumps({l:dict(changed=s['changed'],candidate=s['candidate'],share=s['screen']['share'],baseline=s['incumbentScreen']['share']) for l,s in selections.items()},indent=2))
else:
 selections=read(selection_path);gates={}
 for l,s in selections.items():
  if not s['changed']:gates[l]=dict(referencePassed=False,reason='Incumbent retained by screening');continue
  result=read(ROOT/f'round-{r}/confirm-{l}/results.json');delta=result['comparisons']['candidate-vs-incumbent'];scores=result['summary']
  per={k:scores['candidate']['matchups'][k]['share']-old['share'] for k,old in scores['incumbent']['matchups'].items()}
  passed=delta['pairedApprox95CI'][0]>0 and min(per.values())>=-.03
  gates[l]=dict(referencePassed=passed,comparison=delta,matchupShareDeltas=per)
  if passed:
   c=dict(leader=l,teacher='mm' if l=='melia' else 'classic-engine',opponent=f'league:{ROOT}/manifests/money-guard.json',prefix=f'league-v1:{l}',namespace=f'money-guard-r{r}',workers=16,games=256,models={'incumbent':s['incumbent'],'candidate':s['candidate']},output=str(ROOT/f'round-{r}/money-{l}'))
   write(ROOT/f'configs/money-r{r}-{l}.json',c)
 write(ROOT/f'round-{r}/reference-gates.json',gates);print(json.dumps(gates,indent=2))
