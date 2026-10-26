import json,shutil,uuid
from pathlib import Path
r=Path('balance-results/doreios-four-rl-v32');assert not r.exists();r.mkdir();s=Path('balance-results/doreios-four-rl-v30');shutil.copytree(s/'actors',r/'actors');shutil.copyfile(s/'incumbent.zip',r/'incumbent.zip');shutil.copyfile(s/'native-evaluate-worker.js',r/'native-evaluate-worker.js');m=json.loads((s/'opponents.json').read_text())
for leader,e in m['actors'].items():e['path']=str((r/'actors'/f'{leader}.json').resolve())
(r/'opponents.json').write_text(json.dumps(m,indent=2)+'\n');m['teacher']='temple-order';(r/'opponents-teacher.json').write_text(json.dumps(m,indent=2)+'\n')
c=dict(output=str(r),leader='doreios',base=str(r/'incumbent'),opponent='four:'+str(r/'opponents.json'),observationKind='public-v1',prefix='d4r32-'+uuid.uuid4().hex[:12],workers=2,screenGames=512,confirmationGames=6400,nativeEvaluation=True,nativeWorker=str(r/'native-evaluate-worker.js'),seed=8432,demonstrationGames=512,epochs=[1,3,6,12],learningRate=.0001,overrideWeight=10,selection='Warm-start ordinary v19 NN; imitate confirmed v29 Temple-before-last-terminal teacher on512 fresh complete demonstration games. At overridden states minimize teacher cross entropy(weight10);else KL(current||frozenv19), preserving other decisions. Critic unchanged. Save epochs1/3/6/12;all plus incumbent screened on512 commongames;freeze before6400 fresh pairedgames/model;exact export/action parity andindependent full replay audit. No deployment.')
(r/'config.json').write_text(json.dumps(c,indent=2)+'\n')
for source in ['scripts/rl','src/lib/bots','src/lib/game','standard-matrix','balance-checkpoint/equal-turns/source/scripts/balance']:
 shutil.copytree(source,r/'source'/source,ignore=shutil.ignore_patterns('__pycache__'),dirs_exist_ok=True)
