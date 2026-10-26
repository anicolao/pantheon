"""Freeze reward-arm checkpoints before independent paired confirmation."""
import hashlib,json,math,shutil,statistics,sys,time
from pathlib import Path
import torch
from anchored_ppo import AnchoredPPO
from train import vector,evaluate
from train_four import summary

def metrics(rows):
 result=summary(rows);credit=sum(r['share'] for r in rows)
 result.update(meanRounds=statistics.mean(r['turns'] for r in rows),winningRound=sum(r['share']*r['turns'] for r in rows)/credit if credit else None,
  discounted99=statistics.mean(r['share']*.99**(r['turns']-1) for r in rows),discounted98=statistics.mean(r['share']*.98**(r['turns']-1) for r in rows))
 return result

def main():
 root=Path(sys.argv[1]);c=json.loads((root/'config.json').read_text())
 if (root/'selection.json').exists():raise RuntimeError('Selection already frozen')
 torch.set_num_threads(1);choices={};baseline=None
 for arm,checkpoint in c['confirmationModels'].items():
  config=json.loads((root/arm/'config.json').read_text());s=json.loads((root/arm/'selection.json').read_text())
  assert config['screenOnly'] and config['prefix']==c['prefix'] and config['base']==c['base'] and config['evaluationOpponent']==c['opponent']
  assert len(s['screening'])==1+config['steps']//config['checkpointEvery']
  rows=json.loads((root/arm/'incumbent-screen.json').read_text())
  if baseline is None:baseline=rows
  else:assert rows==baseline
  scores={k:v for k,v in s['screening'].items() if k!='incumbent'}
  name=max(scores,key=lambda k:scores[k]['share']);shutil.copyfile(root/arm/(name+'.zip'),root/(checkpoint+'.zip'))
  choices[arm]=dict(source=f'{arm}/{name}',checkpoint=checkpoint,screen=scores[name],checkpointSHA256=hashlib.sha256((root/(checkpoint+'.zip')).read_bytes()).hexdigest())
 choices={'incumbent':dict(source='incumbent',checkpoint='incumbent',screen=summary(baseline)),**choices}
 best=max(choices,key=lambda k:choices[k]['screen']['share'])
 (root/'selection.json').write_text(json.dumps(dict(selected=choices[best]['checkpoint'],bestScreenArm=best,choices=choices),indent=2)+'\n')
 print(json.dumps(dict(stage='selected',bestScreenArm=best,choices=choices)),flush=True)
 raw={};scores={};start=time.monotonic()
 for name,choice in choices.items():
  model=AnchoredPPO.load(root/(choice['checkpoint']+'.zip'),device='cpu');ev=vector(c['workers'],'confirm',c['prefix'],leader=c['leader'],opponent=c['opponent'])
  try:rows=evaluate(ev,model,'confirm',c['confirmationGames'])
  finally:ev.close()
  raw[name]=rows;scores[name]=metrics(rows)
  (root/f'{name}-confirm.json').write_text(json.dumps(rows)+'\n');print(json.dumps(dict(stage='confirm',model=name,**scores[name])),flush=True)
 comparisons={}
 for a,b in [(a,b) for a in ['discount01','discount02'] for b in ['incumbent','control']]+[('control','incumbent')]:
  blocks={}
  for x,y in zip(raw[a],raw[b],strict=True):
   assert (x['seed'],x['seat'],x['turnPosition'])==(y['seed'],y['seat'],y['turnPosition'])
   blocks.setdefault(x['block'],[]).append(x['share']-y['share'])
  values=[statistics.mean(v) for v in blocks.values()];mean=statistics.mean(values);se=statistics.stdev(values)/math.sqrt(len(values))
  comparisons[f'{a}-vs-{b}']=dict(delta=mean,paired95CI=[mean-1.96*se,mean+1.96*se],adjusted95CI=[mean-2.4977054744*se,mean+2.4977054744*se])
 result=dict(models=scores,comparisons=comparisons,confirmed={a:all(comparisons[f'{a}-vs-{b}']['adjusted95CI'][0]>0 for b in ['incumbent','control']) for a in ['discount01','discount02']},confirmationSeconds=time.monotonic()-start)
 (root/'reward-results.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result),flush=True)
if __name__=='__main__':main()
