"""Freeze narrower-margin reward studies after the previous campaign confirms."""
import json,shutil,uuid,sys
from pathlib import Path
root=Path(sys.argv[1]);previous=Path(sys.argv[2]);old=json.loads((previous/'results.json').read_text());assert not root.exists()
base=previous/'selected.zip' if old['improvementConfirmed'] else previous/'incumbent.zip'
root.mkdir();shutil.copyfile(base,root/'incumbent.zip');shutil.copytree(previous/'actors',root/'actors')
# Actor file must represent the new baseline even if the preceding model improves.
import subprocess
subprocess.run([sys.executable,'scripts/rl/export_actor.py',str(root/'incumbent'),'doreios',str(root/'actors/doreios.json'),'--observation-kind','public-v1'],check=True)
import hashlib
manifest=json.loads((previous/'opponents-evaluation.json').read_text())
for l,e in manifest['actors'].items():
 p=root/'actors'/f'{l}.json';e.update(path=str(p.resolve()),sha256=hashlib.sha256(p.read_bytes()).hexdigest())
(root/'opponents-evaluation.json').write_text(json.dumps(manifest,indent=2)+'\n')
selection='Narrower terminal margin scales 2 and 4, starting from the preceding independently accepted model (otherwise its incumbent). Two 1048576-decision arms, GAE .95, gamma 1; screen ordinary win share on 512 common fresh games; freeze before 3200 untouched matched games/model. Production unchanged.'
c=dict(output=str(root),leader='doreios',base=str(root/'incumbent'),trainingBase=str(root/'incumbent'),opponent='four:'+str(root/'opponents-evaluation.json'),prefix='d4r18-'+uuid.uuid4().hex[:12],workers=8,steps=2097152,checkpointEvery=262144,screenGames=512,confirmationGames=3200,seed=8418,learningRate=.0001,entropy=.003,anchor=0.,selection=selection,observationKind='public-v1',trainNamespace='train',gaeLambda=.95,reward='Pure terminal score margin; narrower tanh scale',architecture='670 inputs, 128x128 tanh actor and critic')
(root/'config.json').write_text(json.dumps(c,indent=2)+'\n');(root/'campaign.json').write_text(json.dumps(dict(arms=['scale2','scale4']),indent=2)+'\n')
for scale in [2,4]:
 name=f'scale{scale}';arm=root/name;arm.mkdir();m=dict(manifest,reward=dict(kind='score-margin',scale=scale,winWeight=0));path=root/f'opponents-{name}.json';path.write_text(json.dumps(m,indent=2)+'\n')
 config=dict(c,output=str(arm),opponent='four:'+str(path),evaluationOpponent=c['opponent'],workers=4,steps=1048576,screenOnly=True)
 (arm/'config.json').write_text(json.dumps(config,indent=2)+'\n')
for source in ['scripts/rl','src/lib/bots','src/lib/game','standard-matrix','balance-checkpoint/equal-turns/source/scripts/balance']:
 shutil.copytree(source,root/'source'/source,ignore=shutil.ignore_patterns('__pycache__'),dirs_exist_ok=True)
print(json.dumps(dict(base=str(base),previousConfirmed=old['improvementConfirmed'],selection=selection)))
