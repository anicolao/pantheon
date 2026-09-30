import json,collections,sys
from pathlib import Path
root=Path(__file__).resolve().parent;stage=sys.argv[1];plan=json.loads((root/'plan.json').read_text())
lookup={c['id']:c for c in plan['candidates']}
by=collections.defaultdict(lambda:collections.defaultdict(list))
for f in (root/stage).glob('*.jsonl'):
 for line in f.read_text().splitlines():
  r=json.loads(line);assert r['status']=='finished'
  c=lookup[r['candidate']];opening=r['players'][0]['openingActions'];assert len(opening)==2
  first=opening[0]['coins'];high=max(first,6-first);split='5/1' if high==5 else '4/2' if high==4 else '3/3'
  assert split==c['split']==r['split']
  for i,o in enumerate(opening):assert o['card']==c['cards'][i if split=='3/3' else 0 if o['coins']==high else 1]
  by[r['candidate']][r['lineup'][1]].append(r['players'][0]['share'])
candidates=plan['candidates'] if stage=='screen' else json.loads((root/'shortlist.json').read_text())
rows=[]
for c in candidates:
 opponents=by[c['id']];expected=len(plan[stage][c['split']])
 assert set(opponents)==set(plan['opponents']) and all(len(x)==expected for x in opponents.values()),c
 shares={o:sum(xs)/len(xs) for o,xs in opponents.items()}
 rows.append({**c,'shares':shares,'minimum':min(shares.values()),'total':sum(shares.values()),'gamesPerOpponent':expected})
rank=lambda r:(-round(r['minimum']*2*r['gamesPerOpponent']),-round(r['total']*2*r['gamesPerOpponent']),int(r['id'].split('-')[-1]))
baseline={'5/1':['merchant-fleet',None],'4/2':['harvest-feast','seed-keeper'],'3/3':['drachma','seed-keeper']}
selected=[]
for split in ['5/1','4/2','3/3']:
 ranked=sorted([r for r in rows if r['split']==split],key=rank)
 if stage=='screen':
  picks=ranked[:4]
  control=next(r for r in ranked if r['cards']==baseline[split])
  if control not in picks:picks.append(control)
  selected.extend(picks)
 else:selected.append(ranked[0])
 print(split,json.dumps(ranked[:5]))
(root/(stage+'-ranking.json')).write_text(json.dumps(rows,indent=2))
if stage=='screen':(root/'shortlist.json').write_text(json.dumps(selected,indent=2))
else:
 (root/'selected-book.json').write_text(json.dumps({r['split']:r['cards'] for r in selected},indent=2))
 (root/'selection.json').write_text(json.dumps(selected,indent=2))
