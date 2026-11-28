"""Run the predeclared jobs concurrently without changing training, seeds, or source hashes.
Temporarily suspend only the original dispatcher, leaving its training children running.
After every result is cached, resume it to assemble its original final report.
"""
import argparse,copy,itertools,os,signal,sys,subprocess,time,hashlib,json
from pathlib import Path
sys.path.insert(0,str(Path.cwd()/'scripts/rl/expansion'))
from common import *
from weakest_league import write
from league_transport import league_vector

ROOT_OUT=Path('balance-diagnostics/all-leader-territory-adaptation-20261128').resolve()

def intact():
 protocol=json.loads((ROOT_OUT/'protocol.json').read_text())
 assert all(hashlib.sha256((ROOT/f).read_bytes()).hexdigest()==h for f,h in protocol['sources'].items()),'Study sources changed'

def evaluation(task):
 torch.set_num_threads(1);intact();path=Path(task['path'])
 if path.exists():return
 vec=league_vector(8,task['prefix'],task['leader'],task['field'],task.get('opponent'))
 try:
  manifest=json.loads(Path(task['field']).read_text());model=MaskablePPO.load(manifest['checkpoints'][task['leader']],device='cpu')
  rows=evaluate(vec,model,'audit',task['games']);summary(rows)
  write(path,rows)
 finally:close_vector(vec)

def main(pid):
 out=ROOT_OUT;intact();before=json.loads((out/'before-field.json').read_text());leaders=before['stageLeaders']
 assert 'scripts/rl/expansion/adapt_all.py' in subprocess.check_output(['ps','-p',str(pid),'-o','command='],text=True)
 config=out/'concurrency.json'
 if not config.exists():write(config,dict(jobs=4))
 tasks=[];active={};finished=[];initial={};generated=False
 def done(leader):
  p=out/('train-'+leader)/'status.json'
  return p.exists() and json.loads(p.read_text())['state']=='complete'
 def matrix(label):
  folder=out/('matrix-'+label);folder.mkdir(exist_ok=True)
  for a,b in itertools.combinations(leaders,2):tasks.append(dict(kind='eval',name=label+'-'+a+'-'+b,leader=a,opponent=b,field=str(out/(label+'-field.json')),prefix='all-adapt-matrix-20261128:'+a+':'+b,games=512,path=str(folder/(a+'--'+b+'.json'))))
 os.kill(pid,signal.SIGSTOP)
 try:
  # No dispatcher thread can start/rename a queued training directory now.
  processes=subprocess.check_output(['ps','-axo','pid,command'],text=True).splitlines()
  for hero in leaders:
   if done(hero):continue
   matches=[int(line.strip().split(None,1)[0]) for line in processes if 'python scripts/rl/expansion/train_league_member.py --leader '+hero+' ' in line]
   if matches:initial[hero]=matches[0]
   else:
    folder=out/('train-'+hero)
    assert not folder.exists(),'Refuse to overwrite incomplete training: '+hero
    tasks.append(dict(kind='train',name='train-'+hero,leader=hero))
  matrix('original');matrix('before')
  while True:
   intact()
   for hero,child in list(initial.items()):
    if done(hero):del initial[hero];continue
    state=subprocess.run(['ps','-p',str(child),'-o','stat='],capture_output=True,text=True).stdout.strip()
    if not state or state.startswith('Z'):raise RuntimeError('Existing training failed: '+hero)
   for name,(proc,handle,task) in list(active.items()):
    code=proc.poll()
    if code is None:continue
    handle.close();del active[name]
    if code:raise RuntimeError(name+' exited '+str(code))
    finished.append(name)
   if not generated and all(done(hero) for hero in leaders):
    after=copy.deepcopy(before);promotions={}
    for hero in leaders:
     r=json.loads((out/('train-'+hero)/'result.json').read_text());promotions[hero]=r
     if r['accepted']:after['actors'][hero]=r['actor'];after['checkpoints'][hero]=r['checkpoint']
    write(out/'after-field.json',after);write(out/'promotions.json',promotions)
    matrix('after')
    for hero in leaders:
     old=copy.deepcopy(after);old['checkpoints'][hero]=before['checkpoints'][hero];field=out/(hero+'-audit-old-field.json');write(field,old)
     for label,path in [('old',field),('new',out/'after-field.json')]:tasks.append(dict(kind='eval',name=hero+'-'+label+'-audit',leader=hero,field=str(path),prefix='all-adapt-final-20261128:'+hero,games=3584,path=str(out/(hero+'-'+label+'-audit.json'))))
    generated=True
   limit=int(json.loads(config.read_text())['jobs']);assert 1<=limit<=6
   while tasks and len(active)+len(initial)<limit:
    task=tasks.pop(0)
    if task['kind']=='eval' and Path(task['path']).exists():finished.append(task['name']);continue
    if task['kind']=='train':
     hero=task['leader'];command=[sys.executable,'scripts/rl/expansion/train_league_member.py','--leader',hero,'--field',str(out/'before-field.json'),'--output',str(out/('train-'+hero)),'--prefix','all-adapt-20261128:'+hero,'--eval-prefix','all-adapt-select-20261128:'+hero,'--ruleset','independent-action-treasure-territory-deploy','--steps','4194304','--workers','8'];log=out/('train-'+hero+'.log')
    else:command=[sys.executable,__file__,'--evaluate',json.dumps(task)];log=out/('parallel-'+task['name']+'.log')
    handle=log.open('w');proc=subprocess.Popen(command,stdout=handle,stderr=subprocess.STDOUT);active[task['name']]=(proc,handle,task)
   write(out/'acceleration-status.json',dict(state='running',dispatcherPid=pid,limit=limit,existingTraining=initial,active={name:proc.pid for name,(proc,_,_) in active.items()},queued=len(tasks),completed=len(finished),allTrainingDone=generated,updatedAt=time.time()))
   if generated and not tasks and not active and not initial:break
   time.sleep(5)
  write(out/'acceleration-status.json',dict(state='complete',completed=len(finished),dispatcherPid=pid))
 except BaseException as error:
  write(out/'acceleration-failure.json',dict(error=repr(error),time=time.time()))
  # Drain only our own jobs before the original dispatcher can inspect directories.
  for proc,handle,_ in active.values():proc.wait();handle.close()
  raise
 finally:os.kill(pid,signal.SIGCONT)

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--dispatcher',type=int);p.add_argument('--evaluate');args=p.parse_args()
 if args.evaluate:evaluation(json.loads(args.evaluate))
 else:main(args.dispatcher)
