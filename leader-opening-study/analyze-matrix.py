import json,math,statistics,collections,tarfile,hashlib
from pathlib import Path
root=Path(__file__).resolve().parent;out=root/'matrix';manifest=json.loads((out/'manifest.json').read_text())
rows=[json.loads(l) for f in out.glob('*.jsonl') for l in f.read_text().splitlines()]
assert len(rows)==21600
leaders=['thaleia','nereon','melia','doreios'];strategies=['money','engine','classic-engine'];cells={}
for r in rows:
 assert r['status']=='finished' and r['players'][0]['turns']==r['players'][1]['turns']
 assert sum(p['share'] for p in r['players'])==1
 key=(r['lineup'][0],r['players'][0]['kind'],r['lineup'][1],r['players'][1]['kind'])
 cells.setdefault(key,[]).append(r)
assert len(cells)==108
stats={}
for key,rs in cells.items():
 assert len(rs)==200 and {r['seed'] for r in rs}==set(range(400000,400200))
 first=next(r for r in rs if r['seed']==400000)
 replay_file=out/f'{key[0]}-{key[2]}-{key[1]}-{key[3]}-0.jsonl.replay.json'
 payload=replay_file.read_bytes();assert hashlib.sha256(payload).hexdigest()==first['traceHash']
 trace=json.loads(payload);assert trace['players']==first['players']
 for uid,player in zip(trace['initial']['turnOrder'],first['players']):
  assert sum(c['uid']==uid and c['command']['type']=='turn/ended' for c in trace['commands'])==player['turns']
 xs=[r['players'][0]['share'] for r in rs];m=statistics.mean(xs);h=1.972*statistics.stdev(xs)/math.sqrt(200)
 stats[key]={'share':m,'ci95':[max(0,m-h),min(1,m+h)],'wins':xs.count(1),'ties':xs.count(.5),'losses':xs.count(0)}
labels=[(l,s) for l in leaders for s in strategies]
name=lambda l,s:l[:3].capitalize()+{'money':' M','engine':' E','classic-engine':' H'}[s]
lines=['Leader-specific Engine books: full heads-up matrix','',
'P1 is the row, P2 the column. Each legal cell contains 200 games on matched seeds.',
'M = current Money; E = current Engine; H = historical v4 Engine. Each Engine uses its own leader-specific books.',
'Standard powers and shared Worship; equal turns; ties count one half. Same-leader games are illegal.',
'These 21,600 games use seeds 400000–400199, disjoint from book training/refinement.','',
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
lines+=['','Books (key = own turn : observed coins; absent key retains that Engine’s prior policy):',json.dumps(manifest['books'],indent=2),'',
'Every game completed, had equal completed turns, and replayed to an identical full reducer state.',
'All 108 cells have unique, identical seed sets. One full trace per cell is archived; its hash, result, and independently counted completed turns are verified.',
'Cell intervals in matrix-analysis.json are pointwise t intervals over seed-level win shares.',
'Best-response selections are descriptive, not independently validated equilibrium policies.',
'Opening search optimized each observed budget separately, freezing turn one before turn two.',
'It considers every affordable purchase and pass, but does not exhaustively search complete opening decision trees.',
'Screening used 2 games per rival/seat; refinement used 8 separate games per rival/seat.',
'Books were trained against Money in both seats. Rare unrepresented budgets retain that Engine’s prior opening policy.',
'The manual practice and simulation entry points call the same decision function.',
'Browser practice smoke passed under the PR preview base path after permissions were restored; see PRACTICE.txt.']

maximin=[]
summary=['Observed pure-strategy responses','',
'For each ordered leader pairing, choose the P1 strategy with the highest share against its strongest P2 reply.',
'This reports actual cells, without averaging strategies. H = historical v4 Engine; E = current Engine; M = Money.',
'Selections and pointwise cell intervals use the same 200 held-out seeds; this is a descriptive selection, not an independently validated equilibrium.',
'Ties in either strategy choice are retained. Tied games count one half.','',
'| P1 leader | P2 leader | P1 strategy | P2 reply | P1 share | Pointwise 95% interval |',
'|---|---|---|---|---:|---:|']
for a in leaders:
 for b in leaders:
  if a==b:continue
  worst={s:min(stats[(a,s,b,t)]['share'] for t in strategies) for s in strategies}
  best=max(worst.values())
  for s in strategies:
   if worst[s]!=best:continue
   for t in strategies:
    cell=stats[(a,s,b,t)]
    if cell['share']!=best:continue
    lo,hi=cell['ci95']
    maximin.append({'p1Leader':a,'p2Leader':b,'p1Strategy':s,'p2Strategy':t,**cell})
    summary.append(f"| {a} | {b} | {s} | {t} | {100*best:.2f}% | [{100*lo:.2f}, {100*hi:.2f}]% |")
(root/'pairwise-summary.txt').write_text('\n'.join(summary)+'\n')
lines+=['Observed pure-strategy selections with per-cell intervals are in pairwise-summary.txt.']

seat_comparisons=[]
seat_lines=['Matched seat comparisons','',
'Each row moves the same leader/strategy pairing between P1 and P2 on 200 matched seeds.',
'Shares are for the named A policy; ties count one half. Delta = A as P2 minus A as P1.',
'Intervals are pointwise paired t intervals. No pooling across leaders or strategies.',
'These comparisons include seat-dependent bot behavior; they do not isolate the effect of the equal-turn rule.','',
'| A | B | A as P1 | A as P2 | P2 minus P1 (pp) | 95% interval (pp) |',
'|---|---|---:|---:|---:|---:|']
for i,a in enumerate(leaders):
 for b in leaders[i+1:]:
  for first in strategies:
   for second in strategies:
    forward={r['seed']:r for r in cells[(a,first,b,second)]}
    reverse={r['seed']:r for r in cells[(b,second,a,first)]}
    p1=[forward[seed]['players'][0]['share'] for seed in range(400000,400200)]
    p2=[reverse[seed]['players'][1]['share'] for seed in range(400000,400200)]
    changes=[y-x for x,y in zip(p1,p2)];delta=statistics.mean(changes);half=1.972*statistics.stdev(changes)/math.sqrt(200)
    interval=[max(-1,delta-half),min(1,delta+half)]
    record={'aLeader':a,'aStrategy':first,'bLeader':b,'bStrategy':second,'aAsP1':statistics.mean(p1),'aAsP2':statistics.mean(p2),'pairedP2MinusP1':delta,'ci95':interval,'n':200}
    seat_comparisons.append(record)
    seat_lines.append(f"| {name(a,first)} | {name(b,second)} | {100*record['aAsP1']:.2f}% | {100*record['aAsP2']:.2f}% | {100*delta:+.2f} | [{100*interval[0]:+.2f}, {100*interval[1]:+.2f}] |")
(root/'seat-comparisons.txt').write_text('\n'.join(seat_lines)+'\n')
lines+=['Paired seat comparisons, without averaging strategies, are in seat-comparisons.txt.']
(root/'matrix-report.txt').write_text('\n'.join(lines)+'\n')
(root/'matrix-analysis.json').write_text(json.dumps({'manifest':manifest,'cells':[dict(zip(['p1Leader','p1Strategy','p2Leader','p2Strategy'],k),**v) for k,v in stats.items()],'responses':responses,'maximin':maximin,'seatComparisons':seat_comparisons},indent=2))
with tarfile.open(root/'matrix-games-and-replays.tar.gz','w:gz') as t:
 for f in sorted(out.glob('*')):
  if f.name.endswith('.jsonl') or f.name.endswith('.replay.json') or f.name in ['manifest.json','timing.json']:t.add(f,arcname=str(f.relative_to(root)))
(root/'matrix-archive.sha256').write_text(hashlib.sha256((root/'matrix-games-and-replays.tar.gz').read_bytes()).hexdigest()+'  matrix-games-and-replays.tar.gz\n')
print('\n'.join(lines))
