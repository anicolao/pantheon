"""Test a cheap, explicit hypothesis from independent planner demonstrations."""
import hashlib,json,os,shutil,subprocess,sys,time,uuid
from pathlib import Path
def write(p,v):p.write_text(json.dumps(v,indent=2)+'\n')
def main():
 r=Path('balance-results/doreios-four-rl-v37');r.mkdir(exist_ok=False);s=Path('balance-results/doreios-four-rl-v32');assert json.loads((s/'audit.json').read_text())['replaysVerified']==12800
 shutil.copytree(s/'actors',r/'actors');shutil.copyfile(s/'candidate.json',r/'actors/doreios.json');m=json.loads((s/'opponents.json').read_text())
 for leader,entry in m['actors'].items():
  p=r/'actors'/f'{leader}.json';digest=hashlib.sha256(p.read_bytes()).hexdigest()
  if leader!='doreios':assert digest==entry['sha256']
  entry.update(path=str(p.resolve()),sha256=digest)
 write(r/'opponents.json',m)
 c=dict(output=str(r),opponentManifest=str(r/'opponents.json'),worker=str(r/'cash-investment-worker.js'),prefix='d4r37-'+uuid.uuid4().hex[:12],workers=4,chunkGames=64,trainGames=128,screenGames=512,screenTop=2,confirmationGames=6400,selection='Independent planner demonstration analysis found82 Acropolis-to-Talent interventions among452 changes in512 games. Test on validatedv32 NN: replace intended Acropolis purchase withTalent only when ownedTreasure cash below10/12/14 and completedownturns<=6/8. Preserve finalround,Acropolis<=4,twoempty-pile andlegality guards. No other play/worship/trash changes. Probe128,best2+incumbent screen512,freeze before6400freshpairedgames/model. Actualreducers/fullreplay,no exclusions. Hybrid teacher only;no deployment.')
 write(r/'config.json',c);write(r/'rules.json',[None,*[dict(treasureCashBelow=cash,throughCompletedTurns=turns) for cash in [10,12,14] for turns in [6,8]]]);write(r/'queue.json',dict(pid=os.getpid(),time=time.time()))
 subprocess.run(['bun','build','scripts/rl/cash_investment_worker.ts','--target=bun','--outfile='+c['worker']],check=True)
 for path in ['scripts/rl','src/lib/bots','src/lib/game','standard-matrix','balance-checkpoint/equal-turns/source/scripts/balance']:shutil.copytree(path,r/'source'/path,ignore=shutil.ignore_patterns('__pycache__'),dirs_exist_ok=True)
 for script,label in [('search_rollout.py','search'),('report_rule_policy.py','report')]:
  with (r/f'{label}.log').open('w') as log:subprocess.run([sys.executable,'scripts/rl/'+script,str(r)],stdout=log,stderr=subprocess.STDOUT,check=True)
 write(r/'queue-finished.json',dict(completed=True,time=time.time()))
if __name__=='__main__':main()
