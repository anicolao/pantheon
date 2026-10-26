"""Recover terminal disk failure without changing selected policy or seeds."""
import hashlib,json,os,shutil,subprocess,sys,time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 r=Path(sys.argv[1]);c=json.loads((r/'config.json').read_text());protocol=json.loads((r/'protocol.json').read_text())
 assert not (r/'queue-finished.json').exists()
 workers=int(sys.argv[2]) if len(sys.argv)>2 else c['workers'];assert 1<=workers<=16
 previous=None
 if (r/'recovery.json').exists():
  assert '--continue' in sys.argv[3:]
  old=json.loads((r/'recovery.json').read_text());status=subprocess.run(['ps','-p',str(old['pid']),'-o','stat='],capture_output=True,text=True).stdout.strip();assert not status or status.startswith('Z'),'Previous recovery must be terminal'
  previous=dict(path=str(r/f"recovery-history-{old['pid']}.json"),sha256=sha(r/'recovery.json'));assert not Path(previous['path']).exists();(r/'recovery.json').rename(previous['path'])
 for k,v in c.items():assert protocol[k]==v
 assert protocol['sourceHashes'][c['worker']]==sha(Path(c['worker']))
 selected=json.loads((r/'selection.json').read_text());selection_sha=sha(r/'selection.json')
 jobs=[dict(id=name,rule=rule,prefix=c['prefix']+':confirm',games=c['confirmationGames']) for name,rule in [('incumbent',None),('candidate',selected['rule'])]]
 preserved={};invalid=[];missing=[]
 def validate(part,job):
  for k,v in job.items():assert part[k]==v
  assert len(part['rows'])==job['games']
  for i,row in enumerate(part['rows']):assert row['replayVerified'] and row['seed']==job['prefix']+':'+str(job['start']+i)
  return part
 for job in jobs:
  for start in range(0,job['games'],c['chunkGames']):
   part=dict(job,start=start,games=min(c['chunkGames'],job['games']-start));p=r/'chunks'/f"{job['id']}-{start}.json"
   tmp=p.with_suffix('.recovery-tmp')
   if tmp.exists():
    archive=tmp.with_name(tmp.name+f'.interrupted-{os.getpid()}');assert not archive.exists();invalid.append(dict(path=str(tmp),archive=str(archive),sha256=sha(tmp)));tmp.rename(archive)
   if p.exists():
    try:value=json.loads(p.read_text())
    except json.JSONDecodeError:
     archive=p.with_suffix('.disk-full-partial');assert not archive.exists();invalid.append(dict(path=str(p),archive=str(archive),sha256=sha(p)));p.rename(archive)
    else:validate(value,part);preserved[str(p)]=sha(p);continue
   missing.append(part)
 record=dict(time=time.time(),pid=os.getpid(),reason='Continue exact frozen confirmation after terminal infrastructure interruption; no game exclusions.',selectionSHA256=selection_sha,workerSHA256=sha(Path(c['worker'])),preserved=preserved,invalid=invalid,missing=missing,workers=workers,previousRecovery=previous)
 (r/'recovery.json').write_text(json.dumps(record,indent=2)+'\n')
 print(json.dumps(dict(stage='recovery',preservedChunks=len(preserved),rerunChunks=len(missing),partialFiles=len(invalid))),flush=True)
 while shutil.disk_usage('.').free<1024**3:time.sleep(30)
 def run(job):
  while shutil.disk_usage('.').free<512*1024**2:time.sleep(10)
  result=subprocess.run(['bun',c['worker'],str(r/'config.json')],input=json.dumps(job)+'\n',capture_output=True,text=True,check=True)
  lines=result.stdout.splitlines();assert len(lines)==1
  part=validate(dict(job,**json.loads(lines[0])),job);p=r/'chunks'/f"{job['id']}-{job['start']}.json";assert not p.exists();tmp=p.with_suffix('.recovery-tmp')
  with tmp.open('x') as f:f.write(json.dumps(part)+'\n');f.flush();os.fsync(f.fileno())
  tmp.rename(p);return job['games']
 done=0
 with ThreadPoolExecutor(max_workers=workers) as pool:
  for n in pool.map(run,missing):done+=n;print(json.dumps(dict(stage='recovered',games=done)),flush=True)
 assert sha(r/'selection.json')==selection_sha
 for p,digest in preserved.items():assert sha(Path(p))==digest
 from train_four import summary
 finals=[]
 for job in jobs:
  parts=[json.loads((r/'chunks'/f"{job['id']}-{start}.json").read_text()) for start in range(0,job['games'],c['chunkGames'])]
  row=dict(job,rows=[x for p in parts for x in p['rows']],overrides=sum(p['overrides'] for p in parts),searched=sum(p['searched'] for p in parts));row['summary']=summary(row['rows']);p=r/'jobs'/f"{job['id']}.json";assert not p.exists();p.write_text(json.dumps(row)+'\n');finals.append(row)
 (r/'confirmation.json').write_text(json.dumps([dict(id=x['id'],rule=x['rule'],summary=x['summary'],overrides=x['overrides']) for x in finals],indent=2)+'\n')
 with (r/'report-recovery.log').open('w') as log:subprocess.run([sys.executable,'scripts/rl/report_rule_policy.py',str(r)],stdout=log,stderr=subprocess.STDOUT,check=True)
 (r/'queue-finished.json').write_text(json.dumps(dict(completed=True,recovered=True,time=time.time()))+'\n')
if __name__=='__main__':main()
