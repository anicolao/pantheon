import json,math,statistics,tarfile,hashlib
from pathlib import Path
root=Path(__file__).resolve().parent
key=lambda r:tuple((p['leader'],p['kind']) for p in r['players'])
def read(directory):
 cells={}
 for f in (root/directory).glob('*.jsonl'):
  for line in f.read_text().splitlines():
   r=json.loads(line)
   if r['seed']>=400100 or sum(p['kind']!='money' for p in r['players'])!=1:continue
   assert r['status']=='finished' and r['players'][0]['turns']==r['players'][1]['turns']
   cell=cells.setdefault(key(r),{})
   assert r['seed'] not in cell
   cell[r['seed']]=r
 assert len(cells)==48
 for k,cell in cells.items():
  assert set(cell)==set(range(400000,400100))
  first=cell[400000];replay=root/directory/f'{k[0][0]}-{k[1][0]}-{k[0][1]}-{k[1][1]}-0.jsonl.replay.json'
  payload=replay.read_bytes();assert hashlib.sha256(payload).hexdigest()==first['traceHash']
  trace=json.loads(payload);assert trace['players']==first['players']
  for uid,player in zip(trace['initial']['turnOrder'],first['players']):
   assert sum(c['uid']==uid and c['command']['type']=='turn/ended' for c in trace['commands'])==player['turns']
 return cells
baseline=read('control');books=read('matrix');results=[]
for k in sorted(baseline):
 seat=next(i for i,p in enumerate(k) if p[1]!='money')
 old=[baseline[k][s]['players'][seat]['share'] for s in range(400000,400100)]
 new=[books[k][s]['players'][seat]['share'] for s in range(400000,400100)]
 changes=[a-b for a,b in zip(new,old)];delta=statistics.mean(changes);half=1.984*statistics.stdev(changes)/10
 results.append({'engineKind':k[seat][1],'engineLeader':k[seat][0],'moneyLeader':k[1-seat][0],'engineSeat':seat+1,'n':100,'baselineShare':statistics.mean(old),'bookShare':statistics.mean(new),'pairedChange':delta,'ci95':[max(-1,delta-half),min(1,delta+half)]})
lines=['Held-out opening-book controls','',
'Each Engine with its own selected books versus the same Engine without the new overrides.',
'Opponent: unchanged current Money. Equal turns and half-credit ties.',
'Each row uses 100 matched fresh seeds (400000–400099), shared with the matrix.',
'Intervals are pointwise paired t intervals over seed-level Engine win-share changes.',
'This validation did not select or retune the books. No pooling across opponents or seats.','',
'| Engine | Seat | Money leader | Baseline | Book | Change (pp) | 95% interval (pp) |',
'|---|---:|---|---:|---:|---:|---:|']
for r in sorted(results,key=lambda r:(r['engineKind'],r['engineLeader'],r['engineSeat'],r['moneyLeader'])):
 lo,hi=r['ci95'];lines.append(f"| {r['engineKind']} / {r['engineLeader']} | {r['engineSeat']} | {r['moneyLeader']} | {100*r['baselineShare']:.1f}% | {100*r['bookShare']:.1f}% | {100*r['pairedChange']:+.1f} | [{100*lo:+.1f}, {100*hi:+.1f}] |")
lines+=['','Multiple pointwise intervals are shown; they are not simultaneous family-wise intervals.',
'Books remain small-sample sequential selections, not proof of globally optimal openings.']
(root/'opening-control-report.txt').write_text('\n'.join(lines)+'\n')
(root/'opening-control-analysis.json').write_text(json.dumps(results,indent=2)+'\n')
with tarfile.open(root/'opening-control-games.tar.gz','w:gz') as t:
 for f in sorted((root/'control').glob('*')):
  if f.name.endswith(('.jsonl','.replay.json')) or f.name in ['manifest.json','timing.json']:t.add(f,arcname=str(f.relative_to(root)))
(root/'opening-control-archive.sha256').write_text(hashlib.sha256((root/'opening-control-games.tar.gz').read_bytes()).hexdigest()+'  opening-control-games.tar.gz\n')
print('\n'.join(lines))
