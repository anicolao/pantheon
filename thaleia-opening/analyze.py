import json,statistics,math,collections
from pathlib import Path
root=Path(__file__).resolve().parent
old={(r['lineup'][1],r['seed']):r for r in map(json.loads,(root/'baseline.jsonl').read_text().splitlines())}
new={}
for f in (root/'validation').glob('*.jsonl'):
 for line in f.read_text().splitlines():
  r=json.loads(line);key=(r['lineup'][1],r['seed']);assert key not in new;new[key]=r
assert set(old)==set(new) and len(new)==300
book=json.loads((root/'selected-book.json').read_text())
for r in new.values():
 assert r['status']=='finished' and r['players'][0]['turns']==r['players'][1]['turns']
 opening=r['players'][0]['openingActions'];assert len(opening)==2
 first=opening[0]['coins'];high=max(first,6-first);split='5/1' if high==5 else '4/2' if high==4 else '3/3'
 for i,o in enumerate(opening):assert o['card']==book[split][i if split=='3/3' else 0 if o['coins']==high else 1]
def stats(xs):
 p=statistics.mean(xs);n=len(xs);z=1.96;den=1+z*z/n;center=(p+z*z/(2*n))/den;half=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den
 return {'share':p,'ci95':[max(0,center-half),min(1,center+half)],'wins':xs.count(1),'ties':xs.count(.5),'losses':xs.count(0),'n':n}
rows=[]
for opp in ['nereon','melia','doreios']:
 keys=sorted(k for k in old if k[0]==opp);assert len(keys)==100
 a=[old[k]['players'][0]['share'] for k in keys];b=[new[k]['players'][0]['share'] for k in keys];d=[y-x for x,y in zip(a,b)];mean=statistics.mean(d);half=1.984*statistics.stdev(d)/10
 rows.append({'opponent':opp,'baseline':stats(a),'thaleiaBook':stats(b),'pairedChange':mean,'pairedCI95':[mean-half,mean+half],'improvedGames':sum(x>0 for x in d),'worsenedGames':sum(x<0 for x in d),'unchangedGames':d.count(0)})
result={'book':book,'validation':rows,'seeds':{'start':240000,'count':100},'rules':'equal turns, original half-credit ties','scope':'P1 Thaleia Engine vs P2 Money','selection':json.loads((root/'selection.json').read_text())}
(root/'comparison.json').write_text(json.dumps(result,indent=2))
lines=['Thaleia-specific Engine opening book','', 'Validation: 100 matched seeds per opponent. P1 Thaleia Engine vs unchanged P2 Money.', 'Equal turns; original ties worth one half. No strategy averaging.', 'Only the first two purchases change. Baseline is archived pre-change code/results.', '', 'Selected book (high/low budget; 3/3 is first/second turn):']
for split,pair in book.items():lines.append(split+': '+' / '.join(x or 'pass' for x in pair))
lines+=['','Held-out comparison (percentage points for paired changes):']
for r in rows:
 lo,hi=r['pairedCI95'];lines.append(f"vs {r['opponent']}: {100*r['baseline']['share']:.2f}% -> {100*r['thaleiaBook']['share']:.2f}%; change {100*r['pairedChange']:+.2f} pp [95% CI {100*lo:+.2f}, {100*hi:+.2f}]")
 lines.append(f"  Old W/T/L {r['baseline']['wins']}/{r['baseline']['ties']}/{r['baseline']['losses']}; new {r['thaleiaBook']['wins']}/{r['thaleiaBook']['ties']}/{r['thaleiaBook']['losses']}; improved/worsened/unchanged seeds {r['improvedGames']}/{r['worsenedGames']}/{r['unchangedGames']}")
lines+=['','Screening/refinement (excluded from validation):','158 legal pairs; 4 conditional seeds per opponent in the screen.','Top four per split plus old baseline retested on 20 different seeds per opponent.','One opponent-independent book: maximize worst-opponent share, then total share tie-break.']
for r in result['selection']:lines.append(r['split']+': '+json.dumps(r['shares']))
lines+=['','Validation checks: all 300 new games finished, replayed exactly, had equal completed turns,','and used the selected opening purchases; exact 100-seed matching for each opponent.','Intervals are pointwise; paired changes use seed-level t intervals (99 degrees of freedom).','Small screening samples can miss the true optimum; this is the best book found in this search.','This comparison tests Thaleia as P1 only. Worship policy and all later Engine decisions are unchanged.']
(root/'report.txt').write_text('\n'.join(lines)+'\n');print('\n'.join(lines))
