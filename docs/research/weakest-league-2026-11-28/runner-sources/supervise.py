"""Monitor the long experiment, safely gate promotion, and retain a recovery ledger."""
import sys,json,time,os,signal,subprocess,copy
from pathlib import Path
sys.path.insert(0,str(Path.cwd()/'scripts/rl/expansion'))
from common import *
from weakest_league import write,paired

def main():
 torch.set_num_threads(1)
 root=ROOT/'balance-diagnostics/weakest-eight-house-20261128';pid=int(sys.argv[1]);name='side-long-exploration';handled=False;child=None
 def running():
  p=subprocess.run(['ps','-p',str(pid),'-o','command='],capture_output=True,text=True)
  return p.returncode==0 and str(root.relative_to(ROOT) / 'curriculum_runner.py') in p.stdout
 def resume():
  nonlocal pid,child
  protocol=json.loads((root/'protocol.json').read_text())
  with Path('/tmp/pantheon-weakest-league.log').open('a') as log:
   child=subprocess.Popen([sys.executable,str(root/'curriculum_runner.py'),'--previous','balance-diagnostics/eight-house-league-v2/consolidation/selected-field.json','--output',str(root),'--workers','16','--rank-games','1000','--max-attempts',str(protocol['args']['max_attempts']),'--resume'],stdout=log,stderr=subprocess.STDOUT)
  pid=child.pid
 while True:
  state=json.loads((root/'status.json').read_text());resultpath=root/name/'result.json'
  if state['state']=='complete':
   write(root/'supervisor.json',dict(mainPid=pid,state='complete',objectiveComplete=True,sidePromotionSkipped='Final audit already complete',updatedAt=time.time()));return
  if resultpath.exists() and not handled:
   result=json.loads(resultpath.read_text());handled=True
   if result['accepted']:
    was_running=running()
    if was_running:
     os.kill(pid,signal.SIGINT)
     while running():time.sleep(1)
    try:
     state=json.loads((root/'status.json').read_text());folder=root/name
     if state['state']=='complete':
      result={**result,'accepted':False,'reason':'Final audit completed before pause'}
     elif state['field']!=json.loads((folder/'field.json').read_text()):
      folder=root/(name+'-current-field-review');folder.mkdir();write(folder/'field.json',state['field'])
      vec=vector(16,'weakest-long-current-review-'+str(state['attempt']),'achilles',str(folder/'field.json'))
      try:
       def assess(path,label):
        rows=evaluate(vec,MaskablePPO.load(path,device='cpu'),'confirm',1792);write(folder/(label+'-confirm.json'),rows);return rows
       before=assess(state['field']['checkpoints']['achilles'],'incumbent');after=assess(result['checkpoint'],'candidate');original=json.loads((root/'initial-field.json').read_text());old=assess(original['checkpoints']['achilles'],'original')
       vsinc=paired(before,after);vsorig=paired(old,after)
       result={**result,'accepted':vsinc['CI95'][0]>0 and vsorig['CI95'][0]>0,'vsIncumbent':vsinc,'vsOriginal':vsorig,'baseline':summary(before),'candidate':summary(after)};write(folder/'result.json',result)
      finally:close_vector(vec)
     if result['accepted']:
      subprocess.run([sys.executable,str(root/'promote_side.py'),folder.name],check=True)
      state=json.loads((root/'status.json').read_text());protocol=json.loads((root/'protocol.json').read_text())
      if state['attempt']>=protocol['args']['max_attempts']:
       write(root/'side-progress-budget-extension.json',dict(oldLimit=protocol['args']['max_attempts'],newLimit=state['attempt']+80,reason='New independently confirmed model enables further weakest-first training'))
       protocol['args']['max_attempts']=state['attempt']+80;write(root/'protocol.json',protocol)
     print(json.dumps(dict(stage='side-handled',accepted=result['accepted'])),flush=True)
    finally:
     if (was_running or result['accepted']) and state['state']!='complete':resume()
   else:print(json.dumps(dict(stage='side-handled',accepted=False)),flush=True)
  state=json.loads((root/'status.json').read_text());alive=running()
  write(root/'supervisor.json',dict(mainPid=pid,mainRunning=alive,longExperimentHandled=handled,state=state['state'],completedAttempt=state['attempt'],updatedAt=time.time()))
  if not alive and handled:
   print(json.dumps(dict(stage='stopped',state=state['state'],objectiveComplete=state['state']=='complete')),flush=True);return
  time.sleep(10)
if __name__=='__main__':main()
