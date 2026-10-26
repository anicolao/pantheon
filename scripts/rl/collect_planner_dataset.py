"""Prepare independent planner demonstrations; this does not train or promote a model."""
import hashlib,json,os,subprocess,sys,time,uuid,gzip
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import numpy as np

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 root=Path(sys.argv[1]);root.mkdir(exist_ok=False);source=Path('balance-results/doreios-four-rl-v28')
 config=json.loads((source/'config.json').read_text());selection=json.loads((source/'selection.json').read_text());protocol=json.loads((source/'protocol.json').read_text())
 assert selection['rule'] is not None
 assert protocol['sourceHashes']['scripts/rl/belief_rollout.ts']==sha(Path('scripts/rl/belief_rollout.ts'))
 worker=root/'collection-worker.js'
 subprocess.run(['bun','build','scripts/rl/collect_rollout_demonstrations.ts','--target=bun','--outfile='+str(worker)],check=True)
 (root/'config.json').write_text(json.dumps(config,indent=2)+'\n')
 prefix='d4-planner-demonstrations-'+uuid.uuid4().hex[:12]+':demonstrations'
 manifest=Path(config['opponentManifest']);actors=json.loads(manifest.read_text())['actors']
 for entry in actors.values():assert sha(Path(entry['path']))==entry['sha256']
 record=dict(pid=os.getpid(),time=time.time(),games=512,workers=4,chunkGames=8,prefix=prefix,rule=selection['rule'],selectionSHA256=sha(source/'selection.json'),workerSHA256=sha(worker),criticSHA256=sha(Path(config['critic'])),manifestSHA256=sha(manifest),actorSHA256={k:v['sha256'] for k,v in actors.items()},eligibility='Demonstrations only. No training or promotion unless independent planner confirmation supports improvement. Seeds disjoint from all screening/confirmation games.')
 (root/'protocol.json').write_text(json.dumps(record,indent=2)+'\n');(root/'chunks').mkdir();(root/'jobs').mkdir()
 jobs=[]
 for start in range(0,512,8):
  path=root/'jobs'/f'{start}.json';path.write_text(json.dumps(dict(prefix=prefix,start=start,games=8,rule=selection['rule']))+'\n');jobs.append((start,path))
 def run(job):
  start,path=job;out=root/'chunks'/f'{start}.json.gz'
  result=subprocess.run(['bun',str(worker),str(root/'config.json'),str(path),str(out)],capture_output=True,text=True,check=True)
  stats=json.loads(result.stdout);assert stats['games']==8;return stats
 done=0
 with ThreadPoolExecutor(max_workers=4) as pool:
  for stats in pool.map(run,jobs):done+=stats['games'];print(json.dumps(dict(stage='collected',games=done)),flush=True)
 observations=[];masks=[];labels=[];base_labels=[];rows=[];searched=0;overrides=0
 for start,_ in jobs:
  part=json.loads(gzip.decompress((root/'chunks'/f'{start}.json.gz').read_bytes()))
  assert part['job']==dict(prefix=prefix,start=start,games=8,rule=selection['rule'])
  assert len(part['rows'])==8
  for i,row in enumerate(part['rows']):assert row['replayVerified'] and row['seed']==prefix+':'+str(start+i)
  x=np.asarray(part['observations'],dtype=np.float32);m=np.asarray(part['masks'],dtype=bool);y=np.asarray(part['labels'],dtype=np.int64);b=np.asarray(part['baseLabels'],dtype=np.int64)
  assert x.shape[1]==670 and len(x)==len(m)==len(y)==len(b) and np.isfinite(x).all() and m[np.arange(len(y)),y].all()
  assert int((y!=b).sum())==part['overrides'];observations.append(x);masks.append(m);labels.append(y);base_labels.append(b);rows.extend(part['rows']);searched+=part['searched'];overrides+=part['overrides']
 np.savez_compressed(root/'demonstrations.npz',observations=np.concatenate(observations),masks=np.concatenate(masks),labels=np.concatenate(labels),baseLabels=np.concatenate(base_labels))
 (root/'games.json').write_text(json.dumps(rows)+'\n')
 assert sha(worker)==record['workerSHA256'] and sha(Path(config['critic']))==record['criticSHA256'] and sha(manifest)==record['manifestSHA256']
 for entry in actors.values():assert sha(Path(entry['path']))==entry['sha256']
 report=dict(games=len(rows),decisions=sum(len(y) for y in labels),overrides=overrides,searched=searched,actualFullReplaysVerified=True,datasetSHA256=sha(root/'demonstrations.npz'),modelTrained=False,productionUpdated=False)
 (root/'collection.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report),flush=True)

if __name__=='__main__':main()
