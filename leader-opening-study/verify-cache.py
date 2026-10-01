import json,tempfile,sys
from pathlib import Path
from pool import CachedWorkers
source_root=Path(__file__).resolve().parent
current='--current' in sys.argv
root=source_root/'current-engine' if current else source_root
candidates=[]
for leader in ['thaleia','nereon']:
 for opponent in ['thaleia','nereon','melia','doreios']:
  if opponent==leader:continue
  for seat in [0,1]:
   matches=sorted((root/'training').glob(f'screen-1-{leader}-*-{opponent}-{seat}.jsonl'))
   complete=[f for f in matches if len(f.read_text().splitlines())==2]
   if complete:candidates.append(complete[0])
assert len(candidates)==12,'Need both seats against all rivals for the two verification leaders'
pool=CachedWorkers(source_root);n=0
with tempfile.TemporaryDirectory(prefix='pantheon-cache-parity-') as directory:
 for index,f in enumerate(candidates+list(reversed(candidates))):
  j=json.loads(f.with_suffix('.job.json').read_text())
  expected=f.read_text().splitlines();j['output']=str(Path(directory)/(str(index)+'.jsonl'))
  pool.run(j)
  actual=Path(j['output']).read_text().splitlines()
  assert list(map(json.loads,actual))==list(map(json.loads,expected)),j['id']
  n+=len(actual)
pool.close()
(root/'cache-verification.json').write_text(json.dumps({'games':n,'result':'exact result and trace hash equality with a fresh worker and reverse-order repeat' if current else 'exact result and trace hash equality, isolated versus persistent cache, including reverse-order repeat'},indent=2))
print(n,'games match archived records exactly, including all trace hashes')
