"""Apply the predeclared plateau rule, then test only if no candidate is promoted."""
import json,subprocess,sys,hashlib
from pathlib import Path
import numpy as np
from train import ROOT
root=ROOT/'balance-results/doreios-rl-v3'
rule=json.loads((root/'plateau-rule.json').read_text())
models={'incumbent':rule['incumbent']};screen_selection={}
for name in rule['directions']:
 result=json.loads((root/name/'results.json').read_text())
 checkpoints=sorted(result['checkpoints'],key=lambda s:int(s.rsplit('-',1)[1]))
 best=max(checkpoints,key=lambda ck:result['checkpoints'][ck]['share'])
 models[name]=str(Path('balance-results/doreios-rl-v3')/name/best)
 screen_selection[name]=dict(checkpoint=models[name],screen=result['checkpoints'][best])
(root/'plateau-candidates.json').write_text(json.dumps(screen_selection,indent=2))
config=dict(output='balance-results/doreios-rl-v3/plateau-confirm',prefix=rule['confirmationPrefix'],namespace=rule['confirmationNamespace'],games=rule['confirmationGames'],workers=8,models=models,baselines=['incumbent'])
path=root/'configs/plateau-confirm.json';path.write_text(json.dumps(config,indent=2))
subprocess.run([sys.executable,str(ROOT/'scripts/rl/evaluate_checkpoints.py'),str(path)],cwd=ROOT,check=True)
rows={name:json.loads((root/'plateau-confirm'/f'{name}.json').read_text()) for name in models}
comparisons={};promoted=[]
for name in rule['directions']:
 assert [r['seed'] for r in rows[name]]==[r['seed'] for r in rows['incumbent']]
 d=np.array([(a['reward']-b['reward'])/2 for a,b in zip(rows[name],rows['incumbent'])])
 delta=float(d.mean());half=2.5758293035489004*float(d.std(ddof=1))/len(d)**.5
 comparisons[name]=dict(delta=delta,pairedApprox99CI=[delta-half,delta+half],promoted=bool(delta-half>0))
 if delta-half>0:promoted.append(name)
selected=max(promoted,key=lambda name:comparisons[name]['delta']) if promoted else 'incumbent'
decision=dict(selected=selected,checkpoint=models[selected],comparisons=comparisons,practicalPlateau=not promoted,
 checkpointSHA256=hashlib.sha256((ROOT/(models[selected]+'.zip')).read_bytes()).hexdigest())
(root/'plateau-decision.json').write_text(json.dumps(decision,indent=2));print(json.dumps(decision),flush=True)
if promoted:sys.exit(0)
# The model is frozen before the untouched final test.
final=dict(output='balance-results/doreios-rl-v3/final',prefix=rule['finalPrefix'],namespace=rule['finalNamespace'],games=rule['finalGames'],workers=16,
 models={'champion':models[selected],'classic':'classic-engine','previous_rl':'balance-results/doreios-rl-v2/ppo-524288'},baselines=['classic','previous_rl'])
path=root/'configs/final.json';path.write_text(json.dumps(final,indent=2))
subprocess.run([sys.executable,str(ROOT/'scripts/rl/evaluate_checkpoints.py'),str(path)],cwd=ROOT,check=True)
