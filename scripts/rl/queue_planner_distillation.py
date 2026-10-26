"""Gate planner distillation on independent confirmation and completed demonstrations."""
import hashlib,json,os,shutil,subprocess,sys,time,uuid
from pathlib import Path
def write(p,v):p.write_text(json.dumps(v,indent=2)+'\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 r=Path('balance-results/doreios-four-rl-v36');r.mkdir(exist_ok=False);teacher=Path('balance-results/doreios-four-rl-v28');refinement=Path('balance-results/doreios-four-rl-v35');dataset=Path('balance-results/doreios-planner-demonstrations-v1')
 write(r/'queue.json',dict(pid=os.getpid(),time=time.time(),gates=[str(teacher/'queue-finished.json'),str(refinement/'queue-finished.json'),str(dataset/'collection.json')],plan='Only train if planner independently improves and exceeds the best confirmed ordinary network point estimate. Two initialization arms, eight epoch checkpoints, common512 screen,6400fresh pairedgames/model and full audit.'))
 for source in [teacher,refinement]:
  while not (source/'queue-finished.json').exists():time.sleep(10)
  assert json.loads((source/'queue-finished.json').read_text())['completed']
 while not (dataset/'collection.json').exists():time.sleep(10)
 options=[]
 for n in [32,35]:
  source=Path(f'balance-results/doreios-four-rl-v{n}');result=json.loads((source/'results.json').read_text());audit=json.loads((source/'audit.json').read_text());assert audit['browserRuntimeMatchesReferenceOutcomes'] and audit['replaysVerified']==12800
  if result['improvementConfirmed']:options.append((result['candidate']['share'],source))
 share,source=max(options,key=lambda x:x[0]);result=json.loads((teacher/'results.json').read_text());assert result['replayVerifiedGames']==6400
 if not result['improvementConfirmed'] or result['candidate']['share']<=share:
  write(r/'skipped.json',dict(reason='Planner did not independently improve beyond best ordinary-network estimate',bestNetwork=str(source),bestNetworkShare=share,plannerResult=result));write(r/'queue-finished.json',dict(completed=True,skipped=True,time=time.time()));return
 while shutil.disk_usage('.').free<1024**3:time.sleep(30)
 c0=json.loads((source/'config.json').read_text());manifest=json.loads(Path(c0['opponent'].removeprefix('four:')).read_text());shutil.copytree(source/'actors',r/'actors');shutil.copyfile(source/'candidate.json',r/'actors/doreios.json');shutil.copyfile(source/'selected.zip',r/'incumbent.zip');shutil.copyfile('balance-results/doreios-four-rl-v30/selected.zip',r/'teacher-base.zip');shutil.copyfile(c0['nativeWorker'],r/'native-evaluate-worker.js')
 expected=json.loads((teacher/'opponents.json').read_text())['actors']
 for leader,entry in manifest['actors'].items():
  path=r/'actors'/f'{leader}.json'
  if leader!='doreios':assert sha(path)==expected[leader]['sha256']
  entry.update(path=str(path.resolve()),sha256=sha(path))
 write(r/'opponents.json',manifest)
 c=dict(output=str(r),leader='doreios',base=str(r/'incumbent'),opponent='four:'+str(r/'opponents.json'),observationKind='public-v1',prefix='d4r36-'+uuid.uuid4().hex[:12],workers=8,screenGames=512,confirmationGames=6400,nativeEvaluation=True,nativeWorker=str(r/'native-evaluate-worker.js'),seed=8436,dataset=str(dataset/'demonstrations.npz'),teacherStudy=str(teacher),epochs=[1,3,6,12],learningRate=.0001,overrideWeight=10,selection='Distill independently confirmed planner interventions from512 fresh demonstration games. Two initializations: best confirmed ordinaryNN and planner basev30. At planner override states, weightedCE;else KL to corresponding frozen initialization. Critic unchanged. Common512screen including incumbent,eighttrained checkpoints;freeze before6400freshpairedgames/model;64exportparity and12800independent runtime/replay audit. No deployment.')
 write(r/'config.json',c);write(r/'base-selection.json',dict(source=str(source),share=share,plannerResult=result,datasetSHA256=sha(dataset/'demonstrations.npz')))
 for path in ['scripts/rl','src/lib/bots','src/lib/game','standard-matrix','balance-checkpoint/equal-turns/source/scripts/balance']:shutil.copytree(path,r/'source'/path,ignore=shutil.ignore_patterns('__pycache__'),dirs_exist_ok=True)
 with (r/'distill.log').open('w') as log:subprocess.run([sys.executable,'scripts/rl/distill_planner.py',str(r)],stdout=log,stderr=subprocess.STDOUT,check=True)
 write(r/'queue-finished.json',dict(completed=True,time=time.time()))
if __name__=='__main__':main()
