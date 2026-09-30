import json,statistics,math,tarfile,hashlib
from pathlib import Path
root=Path(__file__).resolve().parent
def read(name):
 rows=[json.loads(l) for f in (root/name).glob('*.jsonl') for l in f.read_text().splitlines()]
 d={(r['lineup'][1],r['seed']):r for r in rows}
 assert len(d)==len(rows)==300
 assert set(d)=={(o,s) for o in ['nereon','melia','doreios'] for s in range(240000,240100)}
 for r in rows:
  assert r['status']=='finished'
  assert r['players'][0]['turns']==r['players'][1]['turns']
  assert r['players'][0]['name']=='engine' and r['players'][1]['name']=='money'
 return d
old,new=read('historical-money'),read('results')
def stat(xs):
 m=statistics.mean(xs);h=1.984216951*statistics.stdev(xs)/math.sqrt(len(xs))
 return {'share':m,'ci95':[m-h,m+h],'wins':xs.count(1),'ties':xs.count(.5),'losses':xs.count(0)}
rows=[]
for opp in ['nereon','melia','doreios']:
 ks=[(opp,s) for s in range(240000,240100)]
 a=[old[k]['players'][0]['share'] for k in ks];b=[new[k]['players'][0]['share'] for k in ks];d=[y-x for x,y in zip(a,b)]
 m=statistics.mean(d);h=1.984216951*statistics.stdev(d)/10
 rows.append({'opponent':opp,'vsHistoricalMoney':stat(a),'vsCurrentMoney':stat(b),'pairedChange':m,'pairedCI95':[m-h,m+h],'improved':sum(x>0 for x in d),'worsened':sum(x<0 for x in d),'unchanged':d.count(0)})
out={'scope':'P1 historical v4 Thaleia Engine against P2 Money','rules':'standard leaders/worship, equal turns, original shared ties worth one half','seeds':{'namespace':'leader-matrix-v1','first':240000,'last':240099},'historicalSource':'744d0b142e19c7cc06d59421d6461b6f2730992e','currentSource':'47ffa63f0882018059c5bee81ade6b42dc2c9d3b','rows':rows}
(root/'money-comparison.json').write_text(json.dumps(out,indent=2))
lines=['Historical versus current Money: controlled matchup','',
'P1 historical v4 Thaleia Engine vs P2 Money, 100 matched seeds per opponent.',
'Equal turns, standard powers/Worship, ties count half. Thaleia policy is identical in both arms.',
'Historical Money uses the frozen v4 treasure profile and controller, including its lack of Worship.',
'Current Money uses the accepted current controller plus the standard-game Worship adapter.',
'Thus this measures the complete Money policy change, including Worship, not purchasing alone.',
'Historical Money: 300 new games. Current Money: 300 reused games from the immediately preceding experiment.','']
for r in rows:
 a,b=r['vsHistoricalMoney'],r['vsCurrentMoney'];lo,hi=r['pairedCI95']
 lines.append(f"{r['opponent']}: {100*a['share']:.1f}% -> {100*b['share']:.1f}%; paired change {100*r['pairedChange']:+.1f} pp [95% CI {100*lo:+.1f}, {100*hi:+.1f}]")
 lines.append(f"  Historical W/T/L {a['wins']}/{a['ties']}/{a['losses']}; current {b['wins']}/{b['ties']}/{b['losses']}.")
lines+=['','All 300 new games completed, replayed to identical full states, and had equal completed turns.',
'Six archived historical Engine/Money games (three opponents, both seats) reproduce exact results and command traces.',
'Intervals are pointwise seed-paired t intervals with 99 degrees of freedom; no pooling across leaders.',
'Seeds were reused from earlier diagnostic comparisons, so this is not fresh confirmatory validation.',
'Default bots and game rules are unchanged. Only the experimental runner now supports historical Money.',
'Reproduce in nix develop: python3 historical-thaleia/money-batch.py; bun historical-thaleia/verify-historical-money.ts; python3 historical-thaleia/analyze-money.py.',
'The batch uses all available CPUs and refuses to overwrite existing results.']
(root/'money-report.txt').write_text('\n'.join(lines)+'\n')
print('\n'.join(lines))
with tarfile.open(root/'historical-money-games.tar.gz','w:gz') as t:
 for f in sorted((root/'historical-money').glob('*')):
  if f.name.endswith('.jsonl') or f.name.endswith('.replay.json'):t.add(f,arcname=str(f.relative_to(root)))
(root/'historical-money-games.sha256').write_text(hashlib.sha256((root/'historical-money-games.tar.gz').read_bytes()).hexdigest()+'  historical-money-games.tar.gz\n')
