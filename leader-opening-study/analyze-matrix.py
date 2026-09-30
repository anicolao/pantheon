import json,math,statistics,collections,tarfile,hashlib
from pathlib import Path
root=Path(__file__).resolve().parent;out=root/'matrix';manifest=json.loads((out/'manifest.json').read_text())
rows=[json.loads(l) for f in out.glob('*.jsonl') for l in f.read_text().splitlines()]
assert len(rows)==9600
leaders=['thaleia','nereon','melia','doreios'];strategies=['money','classic-engine'];cells={}
for r in rows:
 assert r['status']=='finished' and r['players'][0]['turns']==r['players'][1]['turns']
 assert sum(p['share'] for p in r['players'])==1
 key=(r['lineup'][0],r['players'][0]['kind'],r['lineup'][1],r['players'][1]['kind'])
 cells.setdefault(key,[]).append(r)
assert len(cells)==48
stats={}
for key,rs in cells.items():
 assert len(rs)==200 and {r['seed'] for r in rs}==set(range(400000,400200))
 xs=[r['players'][0]['share'] for r in rs];m=statistics.mean(xs);h=1.972*statistics.stdev(xs)/math.sqrt(200)
 stats[key]={'share':m,'ci95':[max(0,m-h),min(1,m+h)],'wins':xs.count(1),'ties':xs.count(.5),'losses':xs.count(0)}
labels=[(l,s) for l in leaders for s in strategies]
name=lambda l,s:l[:3].capitalize()+(' M' if s=='money' else ' E')
lines=['Leader-specific Engine books: full heads-up matrix','',
'P1 is the row, P2 the column. Each legal cell contains 200 games on matched seeds.',
'M = current Money; E = historical v4 Engine with the selected leader-specific book.',
'Standard powers and shared Worship; equal turns; ties count one half. Same-leader games are illegal.',
'These 9,600 games use seeds 400000–400199, disjoint from book training/refinement.','',
'P1 victory shares (%)','| P1 / P2 | '+' | '.join(name(*x) for x in labels)+' |','|---|'+'---:|'*len(labels)]
for a,s in labels:
 lines.append('| '+name(a,s)+' | '+' | '.join('—' if a==b else f"{100*stats[(a,s,b,t)]['share']:.2f}" for b,t in labels)+' |')
lines+=['','P2 responses (one choice per fixed P1 strategy and opposing leader; no pooling):']
responses=[]
for a,s in labels:
 for b in leaders:
  if a==b:continue
  options=[(stats[(a,s,b,t)]['share'],t) for t in strategies];best=min(x[0] for x in options)
  selected=[t for x,t in options if x==best]
  responses.append({'p1Leader':a,'p1Strategy':s,'p2Leader':b,'bestP2Strategies':selected,'p1Share':best,'p2Share':1-best})
  lines.append(f"{name(a,s)} vs {b}: P2 chooses {' / '.join(selected)}, P2 share {100*(1-best):.2f}%")
lines+=['','Books (key = own turn : observed coins; absent key retains the historical policy):',json.dumps(manifest['books'],indent=2),'',
'Every game completed, had equal completed turns, and replayed to an identical full reducer state.',
'All 48 cells have unique, identical seed sets. One full trace per cell is archived.',
'Cell intervals in matrix-analysis.json are pointwise t intervals over seed-level win shares.',
'Best-response selections are descriptive, not independently validated equilibrium policies.',
'Opening search optimized each observed budget separately, freezing turn one before turn two.',
'It considers every affordable purchase and pass, but does not exhaustively search complete opening decision trees.',
'Screening used 2 games per rival/seat; refinement used 8 separate games per rival/seat.',
'Books were trained against Money in both seats. Rare unrepresented budgets use the historical fallback.',
'The manual practice and simulation entry points call the same decision function.',
'Browser interaction verification and PR publication remain subject to the session restrictions recorded in PRACTICE.txt.']
(root/'matrix-report.txt').write_text('\n'.join(lines)+'\n')
(root/'matrix-analysis.json').write_text(json.dumps({'manifest':manifest,'cells':[dict(zip(['p1Leader','p1Strategy','p2Leader','p2Strategy'],k),**v) for k,v in stats.items()],'responses':responses},indent=2))
with tarfile.open(root/'matrix-games-and-replays.tar.gz','w:gz') as t:
 for f in sorted(out.glob('*')):
  if f.name.endswith('.jsonl') or f.name.endswith('.replay.json') or f.name in ['manifest.json','timing.json']:t.add(f,arcname=str(f.relative_to(root)))
(root/'matrix-archive.sha256').write_text(hashlib.sha256((root/'matrix-games-and-replays.tar.gz').read_bytes()).hexdigest()+'  matrix-games-and-replays.tar.gz\n')
print('\n'.join(lines))
