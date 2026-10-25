"""Freeze the initial four-model league and predeclare the two-round pilot."""
import hashlib,json,shutil,subprocess,sys
from pathlib import Path
root=Path('balance-results/league-rl-v1');root.mkdir(exist_ok=True)
if (root/'protocol.json').exists():raise RuntimeError('League already initialized')
for folder in ['actors','configs','manifests']:(root/folder).mkdir(exist_ok=True)
leaders=['melia','nereon','thaleia','doreios']
champions={l:('balance-results/melia-rl-v1/champion' if l=='melia' else f'balance-results/leader-rl-v1/{l}/champion') for l in leaders}
history={'melia':'balance-results/melia-rl-v1/explore/checkpoint-1572864','nereon':'balance-results/leader-rl-v1/nereon/faster/checkpoint-524288','thaleia':'balance-results/leader-rl-v1/thaleia/rl-a/checkpoint-1572864','doreios':'balance-results/doreios-rl-v3/long-credit-free/checkpoint-524288'}
for l in leaders:
 shutil.copyfile(f'src/lib/bots/models/{l}.json',root/f'actors/v1-{l}.json')
 subprocess.run([sys.executable,'scripts/rl/export_actor.py',history[l],l,str(root/f'actors/historical-{l}.json')],check=True)
def actor(l,group,weight):
 path=root/f"actors/{'v1' if group=='current' else 'historical'}-{l}.json";data=json.loads(path.read_text())
 return dict(id=path.stem,leader=l,group=group,weight=weight,actor=str(path),actorSHA256=hashlib.sha256(path.read_bytes()).hexdigest(),checkpointSHA256=data['checkpointSHA256'])
heuristics={'melia':[('owl','nereon'),('fleet','nereon'),('classic-engine','thaleia')],'nereon':[('classic-engine','thaleia'),('owl','thaleia'),('mm','melia')],'thaleia':[('engine','nereon'),('owl','melia'),('classic-engine','doreios')],'doreios':[('classic-engine','thaleia'),('owl','thaleia'),('mm','melia')]}
train={};fixed={};guard={}
for l in leaders:
 h=[dict(id=f'{p}-{o}',leader=o,group='heuristic',weight=1,policy=p) for p,o in heuristics[l]]
 train[l]=[actor(o,'current',2) for o in leaders if o!=l]+[actor(o,'historical',1) for o in leaders if o!=l]+h
 fixed[l]=[actor(o,'current',1) for o in leaders if o!=l]+h
 o='nereon' if l in ['melia','thaleia'] else 'thaleia'
 guard[l]=[dict(id=f'money-{o}',leader=o,group='heuristic',weight=1,policy='money')]
for name,entries in [('round-1',train),('reference',fixed),('money-guard',guard)]:
 (root/f'manifests/{name}.json').write_text(json.dumps(dict(version=1,learners=entries),indent=2)+'\n')
protocol=dict(version=1,rounds=2,stepsPerLeaderPerRound=524288,checkpointsEvery=262144,trainingMix='50% current RL, 25% historical RL, 25% fast native heuristics; balanced starting seats',slowHeuristics='Native Money held out from synchronous rollout collection and evaluated separately with independent whole-game workers; no approximated Money policy',champions=champions,historical=history,referenceLeague='manifests/reference.json',selection='Highest screening tie-adjusted share, then outright wins; compare incumbent and both checkpoints on same screening seeds',promotion='Candidate paired 95% lower bound on share improvement > 0 on 1536 fresh reference games; no observed per-reference-opponent share regression greater than 3 percentage points; must also pass 256-game matched native Money guard with observed share regression no greater than 3 points. Guard is a regression screen, not proof of 3-point statistical noninferiority.',final='Freeze after round two; 3072 fresh reference games per leader for v1 versus selected champion, and final current-model cross-play. All final games replay verified; no exclusions.',production='Do not replace shipped weights until independent final evidence supports promotion',seeds='league-v1:<leader>:<namespace>:<index>, disjoint train/screen/confirm/final namespaces; same seeds between candidate and incumbent',concurrency='Two learners with eight environment workers each; independent whole-game workers for expensive native guard')
(root/'protocol.json').write_text(json.dumps(protocol,indent=2)+'\n')
for i,l in enumerate(leaders):
 c=dict(base=champions[l],reference=champions[l],leader=l,teacher='mm' if l=='melia' else 'classic-engine',opponent=f'league:{root}/manifests/reference.json',trainOpponent=f'league:{root}/manifests/round-1.json',seed=3100+i,prefix=f'league-v1:{l}',trainNamespace='train-r1',screenNamespace='screen',screenGames=384,workers=8,steps=524288,stages=2,lr=.0001,rollout=1024,batch=512,gae=1.,anchor=0.,entropy=.003,reset_optimizer=True,output=str(root/f'round-1/{l}'))
 (root/f'configs/train-r1-{l}.json').write_text(json.dumps(c,indent=2)+'\n')
 b=dict(leader=l,teacher=c['teacher'],opponent=c['opponent'],prefix=c['prefix'],namespace='screen',workers=8,games=384,models={'incumbent':champions[l]},output=str(root/f'baseline/{l}'))
 (root/f'configs/baseline-{l}.json').write_text(json.dumps(b,indent=2)+'\n')
