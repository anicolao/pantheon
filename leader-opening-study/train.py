import json,os,subprocess,concurrent.futures,time,sys
from pathlib import Path
from pool import CachedWorkers
from runlock import lock
source_root=Path(__file__).resolve().parent
current='--current' in sys.argv
root=source_root/'current-engine' if current else source_root
root.mkdir(exist_ok=True)
engine_kind='engine' if current else 'classic-engine'
run_lock=lock(root,'training')
out=root/'training';out.mkdir(exist_ok=True)
leaders=['thaleia','nereon','melia','doreios']
workers=os.cpu_count();books={l:{} for l in leaders};selections=[];t0=time.time()
def execute(j,script):
 path=out/(j['id']+'.job.json')
 existing=Path(j['output'])
 if existing.exists():
  prior=json.loads(path.read_text())
  assert prior==j,'Job definition changed for '+j['id']
  if script=='collect.ts':return j
  records=[json.loads(x) for x in existing.read_text().splitlines()]
  done=[r['seed'] for r in records]
  assert len(set(done))==len(done) and set(done)<=set(j['seeds'])
  remaining=[seed for seed in j['seeds'] if seed not in done]
  if not remaining:return j
  runjob={**j,'seeds':remaining}
  resumed=out/(j['id']+'.resume.json');resumed.write_text(json.dumps(runjob))
  if script=='worker.ts':cache.run(runjob)
  else:
   r=subprocess.run(['bun',str(source_root/script),str(resumed)],capture_output=True,text=True)
   if r.returncode:raise RuntimeError(j['id']+' '+r.stderr)
  return j
 path.write_text(json.dumps(j))
 if script=='worker.ts':cache.run(j)
 else:
  r=subprocess.run(['bun',str(source_root/script),str(path)],capture_output=True,text=True)
  if r.returncode:raise RuntimeError(j['id']+' '+r.stderr)
 return j
def parallel(jobs,script):
 global cache
 cache=CachedWorkers(source_root)
 with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
  fs=[pool.submit(execute,j,script) for j in jobs]
  for i,f in enumerate(concurrent.futures.as_completed(fs)):
   f.result()
   if i%20==0 or i==len(fs)-1:print(json.dumps({'script':script,'done':i+1,'jobs':len(fs),'seconds':round(time.time()-t0)}),flush=True)
 cache.close()
def groups(l):
 return [(o,s,[l,o] if s==0 else [o,l],[engine_kind,'money'] if s==0 else ['money',engine_kind]) for o in leaders if o!=l for s in [0,1]]
costs=json.loads(subprocess.check_output(['bun','-e',"import {cards} from './src/lib/game/cards';console.log(JSON.stringify(Object.fromEntries(cards.filter(c=>c.supply[2]>0&&c.cost!==null&&c.type!=='Leader'&&c.type!=='Event').map(c=>[c.id,c.cost]))))"],cwd=source_root.parent,text=True))
for turn in [1,2]:
 collect=[]
 for l in leaders:
  for o,s,lineup,kinds in groups(l):
   id=f'collect-{turn}-{l}-{o}-{s}'
   collect.append({'id':id,'turn':turn,'start':300000+turn*10000,'seat':s,'lineup':lineup,'kinds':kinds,'book':books[l],'output':str(out/(id+'.json'))})
 parallel(collect,'collect.ts')
 nodes=[]
 for l in leaders:
  banks={(o,s):json.loads((out/f'collect-{turn}-{l}-{o}-{s}.json').read_text())['samples'] for o,s,_,_ in groups(l)}
  common=set.intersection(*(set(b) for b in banks.values()))
  for key in sorted(common):
   if not all(len(b[key])>=10 for b in banks.values()):continue
   budget=int(key.split(':')[1])
   options=['baseline',None]+sorted(k for k,c in costs.items() if c<=budget)
   nodes.append({'leader':l,'key':key,'banks':banks,'options':options})
 def jobs_for(node,stage,options):
  l,key=node['leader'],node['key'];jobs=[]
  for index,card in options:
   book=dict(books[l])
   if card!='baseline':book[key]=card
   for o,s,lineup,kinds in groups(l):
    id=f'{stage}-{turn}-{l}-{key.replace(":","_")}-{index}-{o}-{s}'
    seeds=node['banks'][(o,s)][key][:2] if stage=='screen' else node['banks'][(o,s)][key][2:10]
    jobs.append({'id':id,'seat':s,'lineup':lineup,'kinds':kinds,'book':book,'seeds':seeds,'output':str(out/(id+'.jsonl')),'card':card,'index':index,'opponent':o,'leader':l,'key':key})
  return jobs
 screen=[j for n in nodes for j in jobs_for(n,'screen',list(enumerate(n['options'])))]
 parallel(screen,'worker.ts')
 def rank(node,stage,options):
  ranked=[]
  for index,card in options:
   jobs=jobs_for(node,stage,[(index,card)]);scores=[]
   for j in jobs:
    records=[json.loads(x) for x in Path(j['output']).read_text().splitlines()]
    assert len(records)==len(j['seeds'])
    wins=sum(round(2*r['players'][j['seat']]['share']) for r in records)
    scores.append({'opponent':j['opponent'],'seat':j['seat'],'halfPoints':wins,'n':len(records)})
   ranked.append({'index':index,'card':card,'scores':scores,'worst':min(x['halfPoints'] for x in scores),'total':sum(x['halfPoints'] for x in scores)})
  return sorted(ranked,key=lambda r:(-r['worst'],-r['total'],r['index']))
 for n in nodes:
  ranking=rank(n,'screen',list(enumerate(n['options'])))
  shortlist=ranking[:3]
  if not any(r['index']==0 for r in shortlist):shortlist.append(next(r for r in ranking if r['index']==0))
  n['shortlist']=[(r['index'],r['card']) for r in shortlist]
  (out/f'ranking-screen-{n["leader"]}-{n["key"].replace(":","_")}.json').write_text(json.dumps(ranking,indent=2))
 refine=[j for n in nodes for j in jobs_for(n,'refine',n['shortlist'])]
 parallel(refine,'worker.ts')
 for n in nodes:
  ranking=rank(n,'refine',n['shortlist']);best=ranking[0]
  if best['card']!='baseline':books[n['leader']][n['key']]=best['card']
  selections.append({'leader':n['leader'],'key':n['key'],'ranking':ranking})
 (root/f'books-after-turn-{turn}.json').write_text(json.dumps(books,indent=2))
 (root/'selection.json').write_text(json.dumps(selections,indent=2))
 print(json.dumps({'completedTurn':turn,'books':books,'seconds':round(time.time()-t0)}),flush=True)
(root/'selected-books.json').write_text(json.dumps(books,indent=2))
(root/'training-manifest.json').write_text(json.dumps({'engineKind':engine_kind,'workers':workers,'screenPerOpponentSeat':2,'refinePerOpponentSeat':8,'leaderGroups':leaders,'trainingSeedRanges':[[310000,310799],[320000,320799]],'selection':'Per observed turn/coin budget: maximize worst rival/seat half-points, total half-points tie-break, baseline preferred on exact ties. Freeze turn-one entries before searching turn two. Baseline retains historical policy. Unrepresented budgets fall back to that policy.','seconds':time.time()-t0},indent=2))
