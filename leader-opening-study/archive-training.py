from pathlib import Path
import json,tarfile,hashlib,collections,sys
root=Path(__file__).resolve().parent
if '--current' in sys.argv:root=root/'current-engine'
counts=collections.Counter()
for f in (root/'training').glob('*.jsonl'):
 stage=f.name.split('-')[0]
 rows=[json.loads(x) for x in f.read_text().splitlines()]
 assert len({r['seed'] for r in rows})==len(rows)
 for r in rows:
  assert r['status']=='finished' and r['players'][0]['turns']==r['players'][1]['turns']
 counts[stage]+=len(rows)
selections=json.loads((root/'selection.json').read_text())
rankings=list((root/'training').glob('ranking-screen-*.json'))
assert selections and len(rankings)==len(selections),'Complete raw training records are required; preserve the existing archive'
expected={'screen':sum(len(json.loads(f.read_text())) for f in rankings)*6*2,'refine':sum(len(s['ranking']) for s in selections)*6*8}
assert dict(counts)==expected,(dict(counts),expected)
(root/'training-counts.json').write_text(json.dumps(dict(counts),indent=2))
with tarfile.open(root/'training-games-and-selection.tar.gz','w:gz') as t:
 for f in sorted((root/'training').glob('*')):
  if f.name.endswith('.job.json') or f.name.endswith('.resume.json'):continue
  if f.is_file():t.add(f,arcname=str(f.relative_to(root)))
 for name in ['selected-books.json','selection.json','training-manifest.json','training-counts.json','cache-verification.json','training-source.json']:
  t.add(root/name,arcname=name)
(root/'training-archive.sha256').write_text(hashlib.sha256((root/'training-games-and-selection.tar.gz').read_bytes()).hexdigest()+'  training-games-and-selection.tar.gz\n')
print(dict(counts))
