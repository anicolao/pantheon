"""Screen an explicit set of public-only strategic teacher rules."""
import json,sys,subprocess,threading,hashlib,time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from train_four import summary
r=Path(sys.argv[1]);c=json.loads((r/'config.json').read_text());local=threading.local();procs=[];lock=threading.Lock()
if (r/'protocol.json').exists():raise RuntimeError('Refusing overwrite')
(r/'jobs').mkdir();(r/'protocol.json').write_text(json.dumps(dict(c,sourceHashes={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in [Path('scripts/rl/thin_policy.ts'),Path('scripts/rl/opening_policy.ts'),Path(c['worker']),Path('scripts/rl/search_rule_policy.py')]}),indent=2)+'\n')
def run(job):
 if not hasattr(local,'p'):
  local.p=subprocess.Popen(['bun',c['worker'],str(r/'config.json')],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,bufsize=1)
  with lock:procs.append(local.p)
 p=local.p;p.stdin.write(json.dumps(job)+'\n');p.stdin.flush();line=p.stdout.readline()
 if not line:raise RuntimeError('Teacher game failed; no exclusions')
 row=dict(job,**json.loads(line));row['summary']=summary(row['rows']);(r/'jobs'/f"{job['id']}.json").write_text(json.dumps(row)+'\n');return row
rules=json.loads((r/'rules.json').read_text())
with ThreadPoolExecutor(max_workers=c['workers']) as pool:
 try:
  rows=list(pool.map(run,[dict(id=f'probe-{i}',rule=rule,prefix=c['prefix']+':probe',games=c['trainGames']) for i,rule in enumerate(rules)]))
  selected=[rows[0],*sorted(rows[1:],key=lambda r:r['summary']['share'],reverse=True)[:c['screenTop']]]
  screens=list(pool.map(run,[dict(id=f'screen-{i}',rule=row['rule'],prefix=c['prefix']+':screen',games=c['screenGames']) for i,row in enumerate(selected)]))
  best=max(screens,key=lambda row:row['summary']['share']);(r/'selection.json').write_text(json.dumps(dict(rule=best['rule'],screen=best['summary'],source=best['id'],options=[dict(rule=x['rule'],summary=x['summary']) for x in screens]),indent=2)+'\n')
  print(json.dumps(dict(stage='selected',rule=best['rule'],screen=best['summary'],options=[dict(rule=x['rule'],share=x['summary']['share'],overrides=x['overrides']) for x in screens])),flush=True)
  confirmations=list(pool.map(run,[dict(id=name,rule=rule,prefix=c['prefix']+':confirm',games=c['confirmationGames']) for name,rule in [('incumbent',None),('candidate',best['rule'])]]))
  (r/'confirmation.json').write_text(json.dumps([dict(id=x['id'],rule=x['rule'],summary=x['summary'],overrides=x['overrides']) for x in confirmations],indent=2)+'\n')
  print(json.dumps(dict(stage='confirm',models=[dict(id=x['id'],summary=x['summary'],overrides=x['overrides']) for x in confirmations])),flush=True)
 finally:
  for p in procs:p.stdin.close();p.wait(timeout=30)
