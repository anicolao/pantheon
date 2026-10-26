"""Continue the promising, not-yet-confirmed v19 model while retaining the validated baseline."""
import json,shutil,uuid,sys
from pathlib import Path
r=Path(sys.argv[1]);base=Path(sys.argv[2]);candidate=Path(sys.argv[3]);assert not r.exists()
assert (candidate/'audit.json').exists(),'Wait for runtime audit before branching training'
r.mkdir()
shutil.copyfile(base/'selected.zip',r/'incumbent.zip');shutil.copyfile(candidate/'selected.zip',r/'training-base.zip')
shutil.copytree('balance-results/doreios-four-rl-v22/actors',r/'actors')
m=json.loads(Path('balance-results/doreios-four-rl-v22/opponents-evaluation.json').read_text())
for l,e in m['actors'].items():e['path']=str((r/'actors'/f'{l}.json').resolve())
(r/'opponents-evaluation.json').write_text(json.dumps(m,indent=2)+'\n');m['reward']=dict(kind='score-margin',scale=8,winWeight=0);(r/'opponents-training.json').write_text(json.dumps(m,indent=2)+'\n')
shutil.copyfile('balance-results/doreios-four-rl-v22/native-evaluate-worker.js',r/'native-evaluate-worker.js')
c=dict(output=str(r),leader='doreios',base=str(r/'incumbent'),trainingBase=str(r/'training-base'),opponent='four:'+str(r/'opponents-evaluation.json'),prefix='d4r23-'+uuid.uuid4().hex[:12],workers=8,steps=4194304,checkpointEvery=262144,screenGames=512,confirmationGames=6400,seed=8423,learningRate=.0001,entropy=.003,anchor=0.,observationKind='public-v1',trainNamespace='train',gaeLambda=.95,nativeEvaluation=True,nativeWorker=str(r/'native-evaluate-worker.js'),reward='Pure terminal score-margin scale8',architecture='670-input128x128 actor/critic',selection='Train from promising v19 continuation (17.96% vs16.95%, paired CI includes zero), retaining audited v14 baseline. Two2097152-decision arms: continuation or softened logits(.65) plus entropy .01. Include unchanged training base among candidates. Common512 screen games; freeze best before6400 fresh paired games/model. Exported-runtime evaluation with independent replay-adapter audit and export-command parity. No deployment.')
(r/'config.json').write_text(json.dumps(c,indent=2)+'\n');(r/'campaign.json').write_text(json.dumps(dict(arms=['continue','explore']),indent=2)+'\n')
for name in ['continue','explore']:
 arm=r/name;arm.mkdir();a=dict(c,output=str(arm),opponent='four:'+str(r/'opponents-training.json'),evaluationOpponent=c['opponent'],workers=4,steps=2097152,screenOnly=True,includeTrainingBase=True)
 if name=='explore':a.update(logitScale=.65,entropy=.01)
 (arm/'config.json').write_text(json.dumps(a,indent=2)+'\n')
for source in ['scripts/rl','src/lib/bots','src/lib/game','standard-matrix','balance-checkpoint/equal-turns/source/scripts/balance']:
 shutil.copytree(source,r/'source'/source,ignore=shutil.ignore_patterns('__pycache__'),dirs_exist_ok=True)
