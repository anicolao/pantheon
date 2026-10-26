import json,shutil,uuid
from pathlib import Path
r=Path('balance-results/doreios-four-rl-v29');assert not r.exists();r.mkdir();s=Path('balance-results/doreios-four-rl-v26');shutil.copytree(s/'actors',r/'actors');m=json.loads((s/'opponents.json').read_text())
for leader,e in m['actors'].items():e['path']=str((r/'actors'/f'{leader}.json').resolve())
(r/'opponents.json').write_text(json.dumps(m,indent=2)+'\n')
c=dict(output=str(r),opponentManifest=str(r/'opponents.json'),worker=str(r/'temple-order-worker.js'),prefix='d4r29-'+uuid.uuid4().hex[:12],workers=2,trainGames=128,screenGames=512,screenTop=2,confirmationGames=6400,selection='Action-order audit found551 last-action terminal plays with Ares Temple still held across400 frozen v19 games. Compare Temple-first always, only when Hamlet held, or only before spending lastAction on terminal. No changes to purchases or trash choices. Probe128,best2 plus incumbent screen512,freeze before6400 fresh paired games/model. Actual reducers/full replay,no exclusions,no deployment.')
(r/'config.json').write_text(json.dumps(c,indent=2)+'\n');(r/'rules.json').write_text(json.dumps([None,*[dict(mode=m) for m in ['always','hamlet','last-action']]],indent=2)+'\n')
for source in ['scripts/rl','src/lib/bots','src/lib/game','standard-matrix','balance-checkpoint/equal-turns/source/scripts/balance']:
 shutil.copytree(source,r/'source'/source,ignore=shutil.ignore_patterns('__pycache__'),dirs_exist_ok=True)
