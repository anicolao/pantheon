"""Test free Obol thinning on top of the independently confirmed Temple-order policy."""
import json,shutil,uuid
from pathlib import Path
r=Path('balance-results/doreios-four-rl-v31');assert not r.exists();r.mkdir();s=Path('balance-results/doreios-four-rl-v29');assert json.loads((s/'results.json').read_text())['improvementConfirmed'];shutil.copytree(s/'actors',r/'actors');m=json.loads((s/'opponents.json').read_text())
for leader,e in m['actors'].items():e['path']=str((r/'actors'/f'{leader}.json').resolve())
(r/'opponents.json').write_text(json.dumps(m,indent=2)+'\n')
c=dict(output=str(r),opponentManifest=str(r/'opponents.json'),worker=str(r/'temple-thin-worker.js'),prefix='d4r31-'+uuid.uuid4().hex[:12],workers=2,trainGames=128,screenGames=512,screenTop=2,confirmationGames=6400,baselineAdapter=dict(study=29,rule=dict(mode='last-action')),selection='Baseline is the confirmed v29 hybrid: frozen v19 actor plus Ares Temple before last-action terminal. Candidate adds otherwise-skipped Doreios free Obol trash when no Hamlet held, remaining owned treasure cash>=6/8/10, protect current cash6and8 or8only, stop whenAcropolis<=4 orfinalRound. Six rules plus unchanged Temple baseline. Probe128,best2 plus baseline screen512,freeze before6400 fresh matched games/model. Incremental overrides reported relative to Temple baseline. Exact full replay,no exclusions,no deployment.')
(r/'config.json').write_text(json.dumps(c,indent=2)+'\n');(r/'rules.json').write_text(json.dumps([None,*[dict(floor=floor,protect=protect,stopSupply=4) for floor in [6,8,10] for protect in [[6,8],[8]]]],indent=2)+'\n')
for source in ['scripts/rl','src/lib/bots','src/lib/game','standard-matrix','balance-checkpoint/equal-turns/source/scripts/balance']:
 shutil.copytree(source,r/'source'/source,ignore=shutil.ignore_patterns('__pycache__'),dirs_exist_ok=True)
