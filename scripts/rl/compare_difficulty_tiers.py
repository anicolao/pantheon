"""Isolate weights and planning in balanced two-versus-two difficulty comparisons."""
import itertools,json,os,shutil,subprocess,time
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
from run_nereon_planning_rl import sha,write
from compare_production_options import LEADERS,credit,interval,clone
R=Path('balance-results/difficulty-tiers-v1');B=Path('balance-results/production-options-v1')
ASSIGNMENTS=list(itertools.combinations(LEADERS,2))

def summarize(rows):
 blocks=[]
 for start in range(0,480,4):
  high=ASSIGNMENTS[(start//4)%6];group=rows[start:start+4]
  assert len({r['block'] for r in group})==1 and {r['rotation'] for r in group}==set(range(4))
  blocks.append(sum(sum(credit(r,l) for l in high) for r in group)/4)
 return dict(games=480,blocks=120,higherTierShare=interval(blocks),advantageOverHalf=interval([v-.5 for v in blocks]))

def main():
 if '--resume' not in os.sys.argv:
  R.mkdir(exist_ok=False);(R/'chunks').mkdir()
  shutil.copytree(B/'inputs',R/'inputs')
  expert=json.loads((B/'selected-field.json').read_text().replace(str(B.resolve()),str(R.resolve())))
  production=json.loads((B/'production-actors.json').read_text().replace(str(B.resolve()),str(R.resolve())))
  # Rebase nested world paths too; model bytes/checksums remain unchanged.
  world=R/'inputs/world.json';world.write_text(world.read_text().replace(str(B.resolve()),str(R.resolve())))
  hard=clone(expert);hard['planning']['policies']={}
  standard=clone(hard);standard['actors']=production
  tiers=dict(standard=standard,hard=hard,expert=expert);write(R/'tiers.json',tiers)
  shutil.copyfile(B/'pair-worker.js',R/'pair-worker.js');shutil.copyfile(B/'difficulty.json',R/'expert-standard.json')
  c=dict(games=480,workers=16,prefix=json.loads((B/'config.json').read_text())['freshPrefix'],pairs=[['hard','standard'],['expert','hard']],
    design='Same balanced 480-game schedule as prior Expert/Standard evaluation: two bots of each tier, six leader assignments, 120 seed blocks x four seat rotations. Standard=current production; Hard=selected field actors without any planning; Expert=same actors with selected Doreios/Thaleia/Melia planning, no Nereon planning. Melia Standard/Hard identical; Nereon identical across all tiers. No weight tuning. Cached Expert/Standard results reused. Paired game schedule with block-clustered intervals; benchmark is now reused, not a new unseen test. Opponent world models remain frozen. Measures aggregate four-player strength, not per-leader guaranteed difficulty or mobile latency. No deployment.')
  write(R/'config.json',c)
  frozen=[*sorted((R/'inputs').glob('*')),R/'tiers.json',R/'pair-worker.js',R/'expert-standard.json']
  write(R/'protocol.json',dict(files={str(p):sha(p) for p in frozen},scriptSHA256=sha(Path(__file__))))
 else:
  c=json.loads((R/'config.json').read_text());q=json.loads((R/'queue.json').read_text())
  try:os.kill(q['pid'],0)
  except ProcessLookupError:pass
  else:raise RuntimeError('Previous controller PID still exists')
 protocol=json.loads((R/'protocol.json').read_text());assert all(sha(Path(p))==h for p,h in protocol['files'].items())
 assert sha(Path(__file__))==protocol['scriptSHA256']
 write(R/'queue.json',dict(pid=os.getpid(),started=time.time()))
 tiers=json.loads((R/'tiers.json').read_text())
 results={'expert-standard':summarize(json.loads((R/'expert-standard.json').read_text()))}
 for high,low in c['pairs']:
  label=high+'-'+low;configs=[]
  for n,higher in enumerate(ASSIGNMENTS):
   m=clone(tiers[high]);m['planning']['policies']={}
   for leader in LEADERS:
    source=tiers[high if leader in higher else low];m['actors'][leader]=source['actors'][leader]
    if leader in source['planning']['policies']:m['planning']['policies'][leader]=source['planning']['policies'][leader]
   path=R/f'{label}-manifest-{n}.json';write(path,m)
   cfg=R/f'{label}-worker-{n}.json';write(cfg,dict(leader='nereon',manifest=str(path)));configs.append((cfg,sha(path)))
  def game(i):
   variant=(i//4)%6;cfg,digest=configs[variant];path=R/'chunks'/f'{label}-{i:04}.json'
   if path.exists():part=json.loads(path.read_text())
   else:
    job=dict(prefix=c['prefix'],start=i,games=1);start=time.monotonic()
    output=subprocess.run(['bun',str(R/'pair-worker.js'),str(cfg),json.dumps(job)],check=True,capture_output=True,text=True)
    part=dict(job,**json.loads(output.stdout),variant=variant,manifestSHA256=digest,wallSeconds=time.monotonic()-start);write(path,part)
   assert part['start']==i and part['prefix']==c['prefix'] and part['variant']==variant and part['manifestSHA256']==digest
   assert len(part['rows'])==1 and part['rows'][0]['replayVerified']
   return part
  parts=[]
  with ThreadPoolExecutor(max_workers=16) as pool:
   for f in as_completed([pool.submit(game,i) for i in range(480)]):
    parts.append(f.result());progress=dict(stage=label,completed=len(parts),total=480);write(R/'progress.json',progress);print(json.dumps(progress),flush=True)
  rows=[p['rows'][0] for p in sorted(parts,key=lambda p:p['start'])]
  reference=json.loads((R/'expert-standard.json').read_text())
  assert [(r['seed'],r['block'],r['rotation']) for r in rows]==[(r['seed'],r['block'],r['rotation']) for r in reference]
  write(R/f'{label}.json',rows);results[label]=summarize(rows);write(R/'results.json',results)
  print(json.dumps(dict(stage='result',pair=label,**results[label])),flush=True)
 assert all(sha(Path(p))==h for p,h in protocol['files'].items())
 write(R/'queue-finished.json',dict(completed=True,time=time.time(),productionUpdated=False))

if __name__=='__main__':main()
