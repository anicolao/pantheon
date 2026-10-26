"""Optimize win credit after the margin-trained actor has acquired a stronger policy."""
import json,shutil,uuid
from pathlib import Path
r=Path('balance-results/doreios-four-rl-v27');assert not r.exists();r.mkdir()
s=Path('balance-results/doreios-four-rl-v23')
shutil.copyfile(s/'incumbent.zip',r/'incumbent.zip');shutil.copyfile(s/'training-base.zip',r/'training-base.zip');shutil.copytree(s/'actors',r/'actors');shutil.copyfile(s/'native-evaluate-worker.js',r/'native-evaluate-worker.js')
m=json.loads((s/'opponents-evaluation.json').read_text())
for leader,entry in m['actors'].items():entry['path']=str((r/'actors'/f'{leader}.json').resolve())
(r/'opponents-evaluation.json').write_text(json.dumps(m,indent=2)+'\n')
c=json.loads((s/'config.json').read_text());c.update(output=str(r),base=str(r/'incumbent'),trainingBase=str(r/'training-base'),opponent='four:'+str(r/'opponents-evaluation.json'),nativeWorker=str(r/'native-evaluate-worker.js'),prefix='d4r27-'+uuid.uuid4().hex[:12],steps=4194304,seed=8427,reward='Refine margin-trained v19 with win-share or half-win/half-margin reward',selection='Frozen v19 initialization, validated v14 comparison. Two2097152-decision arms with terminal winWeight1 or.5, margin scale8. Same PPO settings/GAE.95; inherited critic adapts, optimizer reset. Include unchanged training base. Common512 screen; freeze before6400 fresh paired games/model, independent runtime/replay audit. No deployment.')
(r/'config.json').write_text(json.dumps(c,indent=2)+'\n');(r/'campaign.json').write_text(json.dumps(dict(arms=['win','mixed']),indent=2)+'\n')
for name,weight in [('win',1),('mixed',.5)]:
 a=r/name;a.mkdir();manifest=dict(m,reward=dict(kind='score-margin',scale=8,winWeight=weight));(a/'opponents-training.json').write_text(json.dumps(manifest,indent=2)+'\n')
 cfg=dict(c,output=str(a),opponent='four:'+str(a/'opponents-training.json'),evaluationOpponent=c['opponent'],workers=4,steps=2097152,screenOnly=True,includeTrainingBase=True)
 (a/'config.json').write_text(json.dumps(cfg,indent=2)+'\n')
for source in ['scripts/rl','src/lib/bots','src/lib/game','standard-matrix','balance-checkpoint/equal-turns/source/scripts/balance']:
 shutil.copytree(source,r/'source'/source,ignore=shutil.ignore_patterns('__pycache__'),dirs_exist_ok=True)
