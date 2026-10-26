"""One-coordinate ordinary-network alternative to the Temple-order teacher."""
import json,shutil,uuid,subprocess
from pathlib import Path
r=Path('balance-results/doreios-four-rl-v30');assert not r.exists();r.mkdir();s=Path('balance-results/doreios-four-rl-v29');shutil.copytree(s/'actors',r/'actors');shutil.copyfile('balance-results/doreios-four-rl-v19/selected.zip',r/'incumbent.zip');shutil.copyfile('balance-results/doreios-four-rl-v23/native-evaluate-worker.js',r/'native-evaluate-worker.js')
m=json.loads((s/'opponents.json').read_text())
for leader,e in m['actors'].items():e['path']=str((r/'actors'/f'{leader}.json').resolve())
(r/'opponents.json').write_text(json.dumps(m,indent=2)+'\n')
slot=int(subprocess.check_output(['bun','-e',"import {slots} from './src/lib/bots/rl-schema';console.log(slots.findIndex(s=>s.kind==='play'&&s.ids[0]==='temple-of-ares'))"],text=True));assert slot>=0
c=dict(output=str(r),leader='doreios',base=str(r/'incumbent'),opponent='four:'+str(r/'opponents.json'),observationKind='public-v1',prefix='d4r30-'+uuid.uuid4().hex[:12],workers=2,screenGames=512,confirmationGames=6400,nativeEvaluation=True,nativeWorker=str(r/'native-evaluate-worker.js'),slot=slot,biases=[0,.5,1,2,4,8,16],selection='Only run if v29 Temple-order gain independently confirmed. Optimize one existing output bias for playing Ares Temple in the ordinary v19 network; no runtime rules/architecture changes. Seven fixed offsets including unchanged incumbent on512 matched screens;freeze best before6400 fresh games/model;exact actor/export action parity and independent full-replay audit. No deployment.')
(r/'config.json').write_text(json.dumps(c,indent=2)+'\n')
for source in ['scripts/rl','src/lib/bots','src/lib/game','standard-matrix','balance-checkpoint/equal-turns/source/scripts/balance']:
 shutil.copytree(source,r/'source'/source,ignore=shutil.ignore_patterns('__pycache__'),dirs_exist_ok=True)
