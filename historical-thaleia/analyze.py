import json,statistics,math,collections
from pathlib import Path
root=Path(__file__).resolve().parent
def read(path):
 files=[path] if path.is_file() else sorted(path.glob('*.jsonl'))
 rows=[json.loads(l) for f in files for l in f.read_text().splitlines()]
 result={(r['lineup'][1],r['seed']):r for r in rows}
 assert len(result)==len(rows)==300
 assert set(result)=={(o,s) for o in ['nereon','melia','doreios'] for s in range(240000,240100)}
 assert all(r['status']=='finished' for r in rows)
 return result
data={'restored':read(root/'results'),'currentBook':read(root/'../thaleia-opening/validation'),'genericBook':read(root/'../thaleia-opening/baseline.jsonl'),'oldOpponentEqual':read(root/'bridge-equal'),'oldOpponentOriginal':read(root/'bridge-original')}
for name,rows in data.items():
 if name!='oldOpponentOriginal':assert all(r['players'][0]['turns']==r['players'][1]['turns'] for r in rows.values())
def interval(xs):
 m=statistics.mean(xs);h=1.984216951*statistics.stdev(xs)/math.sqrt(len(xs))
 return {'mean':m,'ci95':[m-h,m+h]}
def deck(rows):
 counts=collections.Counter()
 for r in rows:counts.update(r['players'][0]['final'])
 return dict(sorted(((k,v/len(rows)) for k,v in counts.items()),key=lambda p:-p[1]))
out=[]
for opp in ['nereon','melia','doreios']:
 keys=[(opp,s) for s in range(240000,240100)]
 xs={name:[rows[k]['players'][0]['share'] for k in keys] for name,rows in data.items()}
 row={'opponent':opp,'shares':{name:{**interval(x),'wins':x.count(1),'ties':x.count(.5),'losses':x.count(0)} for name,x in xs.items()}}
 row['pairedChanges']={name:interval([a-b for a,b in zip(xs['restored'],xs[name])]) for name in ['currentBook','genericBook','oldOpponentEqual']}
 row['equalTurnsChange']=interval([a-b for a,b in zip(xs['oldOpponentEqual'],xs['oldOpponentOriginal'])])
 row['decks']={name:deck([data[name][k] for k in keys]) for name in ['restored','currentBook']}
 row['worship']={name:{'perGame':sum(sum(w['seat']==0 for w in data[name][k]['worship']) for k in keys)/100,'favoredPerGame':sum(sum(w['seat']==0 and w['favored'] for w in data[name][k]['worship']) for k in keys)/100} for name in ['restored','currentBook']}
 out.append(row)
(root/'analysis.json').write_text(json.dumps(out,indent=2))
lines=['Historical v4 Thaleia Engine recheck','',
'Main comparison: P1 Thaleia vs unchanged P2 current Money, 100 matched seeds per opponent.',
'Standard +1 Action power and Worship; equal completed turns; original ties count half.',
'Historical source 744d0b142e19c7cc06d59421d6461b6f2730992e, frozen v4 leader profiles.',
'Current baseline is 47ffa63 with the Thaleia-specific opening book. No default bot changed.',
'All intervals are pointwise paired t intervals (99 df); share intervals also use seed-level t.',
'These are reused diagnostic seeds, not independent final validation after choosing a policy.','']
for r in out:
 lines.append(r['opponent'])
 for name,v in r['shares'].items():lines.append(f"  {name}: {100*v['mean']:.1f}% [{100*v['ci95'][0]:.1f}, {100*v['ci95'][1]:.1f}]; W/T/L {v['wins']}/{v['ties']}/{v['losses']}")
 for name,v in r['pairedChanges'].items():lines.append(f"  restored minus {name}: {100*v['mean']:+.1f} pp [{100*v['ci95'][0]:+.1f}, {100*v['ci95'][1]:+.1f}]")
 v=r['equalTurnsChange'];lines.append(f"  equal turns minus immediate ending (both historical Engines): {100*v['mean']:+.1f} pp [{100*v['ci95'][0]:+.1f}, {100*v['ci95'][1]:+.1f}]")
 lines.append('  Worship '+json.dumps(r['worship']))
lines+=['','Original archived v4 headline (both seats, different seeds, 400 games/opponent):',
'Nereon 72.625%, Melia 64.625%, Doreios 57.625%, all Engine versus Engine.',
'Original card/leader standard effects are unchanged; current reducer adds the equal-turn ending option.',
'The historical bot retains its own purchasing, action ordering, thinning and Worship; no modern opening book or Worship adapter is imposed.',
'The restored policy values marginal deck draw coverage (including Thaleia action capacity), stranded draw, starter reliability and immediate payload.',
'It searches known-hand action paths toward Favored Worship and evaluates Worship against purchase opportunity cost.',
'The modern bot instead descends from the neutral-base-game balancing experiments, with a fixed opening and a later-added Worship adapter.',
'Policy package differences are demonstrated; individual causes (purchases versus action play versus Worship) have not been ablated.',
'The original reported superiority was against old Engines, not current Money. Paired bridge games separate those opponents from the equal-turn rule.','',
'Validation: 900 new games completed and replayed to identical full states. All 600 equal-turn games have equal completed turns.',
'The untouched historical runner independently reproduces all 300 original-rule bridge outcomes.',
'Card-gain bookkeeping was corrected to match the historical runner; preliminary runs are excluded and preserved separately.',
'Six archived historical Engine/Engine games (three rivals, both seats) reproduce full results AND command traces exactly.',
'Strict TypeScript passed for runner, worker and provenance verifier.',
'Reproduce inside nix develop: python3 historical-thaleia/batch.py; python3 historical-thaleia/bridge.py equal; python3 historical-thaleia/bridge.py original; python3 historical-thaleia/analyze.py.',
'Batch scripts refuse to overwrite raw files. Runs use 16 CPU workers. Each dataset has 300 records and three saved full replays.',
'Source snapshot contains only the 13 exact historical dependencies; provenance is recorded in manifest.json.']
(root/'report.txt').write_text('\n'.join(lines)+'\n')
print('\n'.join(lines))
