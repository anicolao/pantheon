"""Sequential production actor/planner tests, then fresh balanced difficulty games."""
import itertools,json,math,os,shutil,statistics,subprocess,time
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
from run_nereon_planning_rl import sha,write,paired_table
R=Path('balance-results/production-options-v1')
B=Path('balance-results/nereon-main-comparison-v1')
LEADERS=['melia','nereon','thaleia','doreios']
ORDER=['doreios','thaleia','melia']

def clone(x):return json.loads(json.dumps(x))
def share(rows,leader):
 return statistics.mean(credit(row,leader) for row in rows)
def credit(row,leader):
 scores=row['scores'];top=max(scores.values())
 return 1/sum(v==top for v in scores.values()) if scores[leader]==top else 0.
def interval(values):
 mean=statistics.mean(values);half=1.96*statistics.stdev(values)/math.sqrt(len(values))
 return dict(mean=mean,CI95=[mean-half,mean+half])

def prepare():
 R.mkdir(exist_ok=False);(R/'chunks').mkdir();(R/'inputs').mkdir()
 prior=json.loads((B/'config.json').read_text());main=prior['mainCommit']
 production={}
 checkpoint_sources={'melia':'balance-results/melia-rl-v1/champion.zip','nereon':'balance-results/leader-rl-v1/nereon/champion.zip','thaleia':'balance-results/leader-rl-v1/thaleia/champion.zip','doreios':'balance-results/doreios-rl-v3/champion.zip'}
 for leader in LEADERS:
  actor=R/'inputs'/f'{leader}-production.json';actor.write_bytes(subprocess.check_output(['git','show',main+f':src/lib/bots/models/{leader}.json']))
  checkpoint=R/'inputs'/f'{leader}-production.zip';shutil.copyfile(checkpoint_sources[leader],checkpoint)
  assert sha(checkpoint)==json.loads(actor.read_text())['checkpointSHA256']
  production[leader]=dict(path=str(actor.resolve()),sha256=sha(actor))
  if leader in ORDER:
   critic=R/'inputs'/f'{leader}-critic.json'
   subprocess.run([os.sys.executable,'scripts/rl/export_signed_win_critic.py',str(checkpoint),str(actor),str(critic)],check=True)
   subprocess.run([os.sys.executable,'scripts/rl/verify_critic_export.py',str(checkpoint),str(critic),str(R/'inputs'/f'{leader}-critic-validation.json')],check=True)
 field=json.loads((B/'manifest.json').read_text())
 # Snapshot every transitive field dependency, including the planners' world model.
 world=json.loads(Path(field['planning']['worldManifest']).read_text())
 for name,m in [('field',field),('world',world)]:
  for leader,entry in m['actors'].items():
   src=Path(entry['path']);assert sha(src)==entry['sha256'];dest=R/'inputs'/f'{name}-{leader}.json';shutil.copyfile(src,dest);entry['path']=str(dest.resolve())
 for leader,policy in field['planning']['policies'].items():
  src=Path(policy['critic']['path']);assert sha(src)==policy['critic']['sha256'];dest=R/'inputs'/f'field-{leader}-critic.json';shutil.copyfile(src,dest);policy['critic']['path']=str(dest.resolve())
 write(R/'inputs/world.json',world);field['planning']['worldManifest']=str((R/'inputs/world.json').resolve())
 write(R/'initial-field.json',field);write(R/'production-actors.json',production)
 shutil.copyfile(B/'pair-worker.js',R/'pair-worker.js');shutil.copyfile(B/'production.json',R/'initial-baseline.json')
 rule=json.loads(Path('balance-results/nereon-main-planner-v1/config.json').read_text())['rule']
 c=dict(mainCommit=main,prefix=prior['prefix'],order=ORDER,workers=16,games=400,freshPrefix='production-options-v1-fresh-20261030',freshGames=480,plannerRule=rule,
 design='Start with production Nereon (no planner), production Melia, research Thaleia and Doreios planners. Sequentially test Doreios, Thaleia, Melia: incumbent vs production raw vs production plus matching signed-outcome critic. Same 400 reused games at each step; other actors and planner world models frozen within each comparison. Select highest observed split-win share; ties prefer production raw then incumbent then production planner. Selection is exploratory, not significance-gated. Carry selected option to next field. Report all paired seed-block intervals. Finally freeze lineup and test two strong vs two production bots in 480 fresh games: 120 blocks, four rotations, 20 blocks for each of six leader assignments. Report strong total share vs 50%, clustered over blocks. This validates aggregate difficulty, not every leader or heads-up mode. Critic transfer from original training opponents is experimental. No automatic deployment.')
 write(R/'config.json',c)
 frozen=[*sorted((R/'inputs').glob('*')),R/'initial-field.json',R/'production-actors.json',R/'initial-baseline.json',R/'pair-worker.js']
 write(R/'protocol.json',dict(files={str(p):sha(p) for p in frozen},scriptSHA256=sha(Path(__file__))))
 return c

def main():
 if '--resume' in os.sys.argv:
  c=json.loads((R/'config.json').read_text());q=json.loads((R/'queue.json').read_text())
  try:os.kill(q['pid'],0)
  except ProcessLookupError:pass
  else:raise RuntimeError('Previous controller PID still exists')
 else:c=prepare()
 protocol=json.loads((R/'protocol.json').read_text())
 assert all(sha(Path(p))==h for p,h in protocol['files'].items())
 assert sha(Path(__file__))==protocol['scriptSHA256']
 write(R/'queue.json',dict(pid=os.getpid(),started=time.time()))
 production=json.loads((R/'production-actors.json').read_text())
 def run(label,manifests,prefix,games,choose=lambda i:0):
  configs=[]
  for n,m in enumerate(manifests):
   manifest=R/f'{label}-manifest-{n}.json';write(manifest,m)
   cfg=R/f'{label}-worker-{n}.json';write(cfg,dict(leader='nereon',manifest=str(manifest)))
   configs.append((cfg,sha(manifest)))
  def game(i):
   variant=choose(i);cfg,digest=configs[variant];path=R/'chunks'/f'{label}-{i:04}.json'
   if path.exists():part=json.loads(path.read_text())
   else:
    job=dict(prefix=prefix,start=i,games=1);start=time.monotonic()
    p=subprocess.run(['bun',str(R/'pair-worker.js'),str(cfg),json.dumps(job)],check=True,capture_output=True,text=True)
    part=dict(job,**json.loads(p.stdout),manifestSHA256=digest,variant=variant,wallSeconds=time.monotonic()-start);write(path,part)
   assert part['start']==i and part['prefix']==prefix and part['manifestSHA256']==digest and part['variant']==variant
   assert len(part['rows'])==1 and part['rows'][0]['replayVerified']
   return part
  parts=[]
  with ThreadPoolExecutor(max_workers=16) as pool:
   for f in as_completed([pool.submit(game,i) for i in range(games)]):
    parts.append(f.result());write(R/'progress.json',dict(stage=label,completed=len(parts),total=games));print(json.dumps(dict(stage=label,completed=len(parts),total=games)),flush=True)
  parts.sort(key=lambda p:p['start']);rows=[p['rows'][0] for p in parts];write(R/f'{label}.json',rows)
  write(R/f'{label}-timing.json',dict(games=games,totalWorkerSeconds=sum(p['wallSeconds'] for p in parts),note='End-to-end game times on a shared 16-worker CPU run, not browser action latency.'))
  return rows
 field=json.loads((R/'initial-field.json').read_text());baseline=json.loads((R/'initial-baseline.json').read_text());stages=[]
 for leader in ORDER:
  raw=clone(field);raw['actors'][leader]=production[leader];raw['planning']['policies'].pop(leader,None)
  planned=clone(raw);critic=R/'inputs'/f'{leader}-critic.json'
  planned['planning']['policies'][leader]=dict(critic=dict(path=str(critic.resolve()),sha256=sha(critic)),rule=c['plannerRule'],useCurrentActor=True)
  rawSame=field['actors'][leader]['sha256']==production[leader]['sha256'] and leader not in field['planning']['policies']
  rawRows=baseline if rawSame else run(leader+'-production',[raw],c['prefix'],400)
  planRows=run(leader+'-planner',[planned],c['prefix'],400)
  options={'production':(raw,rawRows),'incumbent':(field,baseline),'planner':(planned,planRows)}
  winner=max(options,key=lambda name:share(options[name][1],leader))
  result=dict(leader=leader,shares={name:share(data[1],leader) for name,data in options.items()},selected=winner,productionVsIncumbent=paired_table(baseline,rawRows),plannerVsProduction=paired_table(rawRows,planRows),plannerVsIncumbent=paired_table(baseline,planRows),rawReused=rawSame)
  write(R/f'{leader}-results.json',result);stages.append(result);field,baseline=options[winner]
  write(R/f'field-after-{leader}.json',field);write(R/f'baseline-after-{leader}.json',baseline)
  print(json.dumps(dict(stage='selected',leader=leader,selected=winner,shares=result['shares'])),flush=True)
 write(R/'selected-field.json',field)
 # All six assignments appear in every group of six seed blocks.
 assignments=list(itertools.combinations(LEADERS,2));mixed=[]
 for hard in assignments:
  m=clone(field)
  for leader in LEADERS:
   if leader not in hard:m['actors'][leader]=production[leader];m['planning']['policies'].pop(leader,None)
  mixed.append(m)
 rows=run('difficulty',mixed,c['freshPrefix'],480,lambda i:(i//4)%6)
 blocks=[];byLeader={leader:{'strong':[],'production':[]} for leader in LEADERS}
 for start in range(0,480,4):
  hard=assignments[(start//4)%6];group=rows[start:start+4]
  blocks.append(statistics.mean(sum(credit(row,l) for l in hard) for row in group))
  for leader in LEADERS:byLeader[leader]['strong' if leader in hard else 'production'].append(statistics.mean(credit(row,leader) for row in group))
 outcome=dict(stages=[dict(leader=s['leader'],selected=s['selected'],shares=s['shares']) for s in stages],freshGames=480,strongShare=interval(blocks),strongAdvantageOverHalf=interval([v-.5 for v in blocks]),leaderShares={l:{k:interval(v) for k,v in groups.items()} for l,groups in byLeader.items()},productionUpdated=False)
 assert all(sha(Path(p))==h for p,h in protocol['files'].items())
 write(R/'results.json',outcome);write(R/'queue-finished.json',dict(completed=True,time=time.time()));print(json.dumps(outcome,indent=2),flush=True)

if __name__=='__main__':main()
