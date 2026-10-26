"""Public-belief planning with a frozen learned value at a short rollout horizon."""
import json,shutil,uuid,hashlib
from pathlib import Path
r=Path('balance-results/doreios-four-rl-v28');assert not r.exists();r.mkdir()
s=Path('balance-results/doreios-four-rl-v26');shutil.copytree(s/'actors',r/'actors');m=json.loads((s/'opponents.json').read_text())
for leader,e in m['actors'].items():e['path']=str((r/'actors'/f'{leader}.json').resolve())
(r/'opponents.json').write_text(json.dumps(m,indent=2)+'\n');shutil.copyfile('balance-results/doreios-overnight-v1/v19-critic.json',r/'critic.json')
critic=json.loads((r/'critic.json').read_text());actor=json.loads((r/'actors/doreios.json').read_text());assert critic['checkpointSHA256']==actor['checkpointSHA256']
c=dict(output=str(r),opponentManifest=str(r/'opponents.json'),worker=str(r/'rollout-worker.js'),critic=str(r/'critic.json'),prefix='d4r28-'+uuid.uuid4().hex[:12],workers=8,chunkGames=8,trainGames=128,screenGames=512,screenTop=2,confirmationGames=3200,selection='Public-belief short-horizon planning on frozen v19 actor/critic. At next Doreios decision after1/2/4 completed own turns, stop simulation and evaluate frozen public-v1 critic trained on terminal margin8. Clamp leaf value to reward range[0,1]; terminal games use exact margin reward.16 sampled public beliefs,4 candidates,risk0/1. Probe128,best2 plus incumbent screen512,freeze before3200 fresh games/model. Hypothetical logs omitted, sparse/masked inference verified; actual games retain full exact replay. Teacher only,no deployment.')
(r/'config.json').write_text(json.dumps(c,indent=2)+'\n');rules=[None]+[dict(samples=16,candidates=4,risk=risk,trash=False,utility='margin',maskedInference=True,leafHorizon=horizon) for horizon in [1,2,4] for risk in [0,1]];(r/'rules.json').write_text(json.dumps(rules,indent=2)+'\n')
for source in ['scripts/rl','src/lib/bots','src/lib/game','standard-matrix','balance-checkpoint/equal-turns/source/scripts/balance']:
 shutil.copytree(source,r/'source'/source,ignore=shutil.ignore_patterns('__pycache__'),dirs_exist_ok=True)
