"""Frozen matched auxiliary actor-feature regression experiment."""
import json,shutil,uuid,sys,subprocess,hashlib
from pathlib import Path
r=Path(sys.argv[1]);previous=Path(sys.argv[2]);assert not r.exists();r.mkdir()
assert json.loads((previous/'results.json').read_text())['improvementConfirmed']
shutil.copyfile(previous/'selected.zip',r/'incumbent.zip');shutil.copytree(previous/'actors',r/'actors')
subprocess.run([sys.executable,'scripts/rl/export_actor.py',str(r/'incumbent'),'doreios',str(r/'actors/doreios.json'),'--observation-kind','public-v1'],check=True)
subprocess.run([sys.executable,'scripts/rl/augment_auxiliary.py',str(r/'incumbent'),str(r/'auxiliary-initial')],check=True)
subprocess.run([sys.executable,'scripts/rl/export_actor.py',str(r/'auxiliary-initial'),'doreios',str(r/'auxiliary-initial.json'),'--observation-kind','public-v1'],check=True)
m=json.loads((previous/'opponents-evaluation.json').read_text())
for l,e in m['actors'].items():
 p=r/'actors'/f'{l}.json';e.update(path=str(p.resolve()),sha256=hashlib.sha256(p.read_bytes()).hexdigest())
(r/'opponents-evaluation.json').write_text(json.dumps(m,indent=2)+'\n');m['reward']=dict(kind='score-margin',scale=8,winWeight=0);(r/'opponents-training.json').write_text(json.dumps(m,indent=2)+'\n')
c=dict(output=str(r),leader='doreios',base=str(r/'incumbent'),trainingBase=str(r/'incumbent'),opponent='four:'+str(r/'opponents-evaluation.json'),prefix='d4r22-'+uuid.uuid4().hex[:12],workers=8,steps=2097152,checkpointEvery=262144,screenGames=512,confirmationGames=3200,seed=8422,learningRate=.0001,entropy=.003,anchor=0.,observationKind='public-v1',trainNamespace='train',gaeLambda=.95,reward='Pure terminal score-margin scale8',architecture='670-input128x128 actor/critic; auxiliary arm adds training-only linear return head on actor features',selection='Matched control versus extra .2*MSE(actor-feature return prediction, GAE return target). Zero-initialized head, unchanged initial actor/critic.1048576 decisions per arm;512 common fresh screen games; freeze best before3200 fresh matched confirmation games/model. Export ignores training-only head. Production unchanged.')
(r/'config.json').write_text(json.dumps(c,indent=2)+'\n');(r/'campaign.json').write_text(json.dumps(dict(arms=['control','auxiliary']),indent=2)+'\n')
for name in ['control','auxiliary']:
 arm=r/name;arm.mkdir();a=dict(c,output=str(arm),opponent='four:'+str(r/'opponents-training.json'),evaluationOpponent=c['opponent'],workers=4,steps=1048576,screenOnly=True)
 if name=='auxiliary':a.update(trainingBase=str(r/'auxiliary-initial'),auxiliaryCoefficient=.2)
 (arm/'config.json').write_text(json.dumps(a,indent=2)+'\n')
for source in ['scripts/rl','src/lib/bots','src/lib/game','standard-matrix','balance-checkpoint/equal-turns/source/scripts/balance']:
 shutil.copytree(source,r/'source'/source,ignore=shutil.ignore_patterns('__pycache__'),dirs_exist_ok=True)
