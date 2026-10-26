"""Combine independently successful exploration training and Temple output correction."""
import json,shutil,uuid
from pathlib import Path
r=Path('balance-results/doreios-four-rl-v33');assert not r.exists();r.mkdir();s=Path('balance-results/doreios-four-rl-v23');assert json.loads((s/'results.json').read_text())['improvementConfirmed'];shutil.copytree(s/'actors',r/'actors');shutil.copyfile(s/'candidate.json',r/'actors/doreios.json');shutil.copyfile(s/'selected.zip',r/'incumbent.zip');shutil.copyfile(s/'native-evaluate-worker.js',r/'native-evaluate-worker.js')
import hashlib
m=json.loads((s/'opponents-evaluation.json').read_text())
for leader,e in m['actors'].items():e.update(path=str((r/'actors'/f'{leader}.json').resolve()),sha256=hashlib.sha256((r/'actors'/f'{leader}.json').read_bytes()).hexdigest())
(r/'opponents.json').write_text(json.dumps(m,indent=2)+'\n');c=json.loads(Path('balance-results/doreios-four-rl-v30/config.json').read_text());c.update(output=str(r),base=str(r/'incumbent'),opponent='four:'+str(r/'opponents.json'),nativeWorker=str(r/'native-evaluate-worker.js'),prefix='d4r33-'+uuid.uuid4().hex[:12],workers=4,biases=[0,16],selection='Fixed combination of two independently successful changes: v23 exploratory-trained actor plus the +16 Ares Temple output-bias correction established in v30. No other tensors change. Wait for both source runtime audits. Compare unchanged and +16 on512 common screens;freeze best before6400 fresh pairedgames/model;independent actor/export parity andfull replayaudit. No deployment.')
(r/'config.json').write_text(json.dumps(c,indent=2)+'\n')
for source in ['scripts/rl','src/lib/bots','src/lib/game','standard-matrix','balance-checkpoint/equal-turns/source/scripts/balance']:
 shutil.copytree(source,r/'source'/source,ignore=shutil.ignore_patterns('__pycache__'),dirs_exist_ok=True)
