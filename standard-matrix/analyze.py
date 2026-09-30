import json,math,statistics,collections,hashlib,sys
from pathlib import Path
root=Path(__file__).resolve().parent
folder=root/(sys.argv[1] if len(sys.argv)>1 else 'full')
manifest=json.loads((folder/'manifest.json').read_text());n=manifest['gamesPerCell']
leaders=['thaleia','nereon','melia','doreios'];strategies=['money','engine'];letters={'money':'M','engine':'E'}
data=collections.defaultdict(dict)
for path in sorted(folder.glob('*.jsonl')):
 for line in path.read_text().splitlines():
  r=json.loads(line);a,b=r['lineup'];s,t=[p['name'] for p in r['players']];key=(a,b,s,t)
  assert r['status']=='finished' and r['players'][0]['turns']==r['players'][1]['turns']
  assert r['seed'] not in data[key]
  assert abs(sum(p['share'] for p in r['players'])-1)<1e-10
  data[key][r['seed']]=r
assert len(data)==48
assert all(set(x)==set(range(manifest['seedStart'],manifest['seedStart']+n)) for x in data.values())
def stats(xs):
 mean=statistics.mean(xs);se=statistics.stdev(xs)/math.sqrt(len(xs)) if len(xs)>1 else 0
 # Student t(199)=1.972; near 1.96 for larger samples. Paired deltas use
 # the sample variance of seed-level differences, including half-credit ties.
 z=1.972 if len(xs)>=200 else 1.984
 return {'mean':mean,'ci95':[mean-z*se,mean+z*se],'n':len(xs)}
cells=[]
for key,rows in data.items():
 a,b,s,t=key;games=list(rows.values());xs=[r['players'][0]['share'] for r in games]
 result={'p1Leader':a,'p2Leader':b,'p1Strategy':s,'p2Strategy':t,**stats(xs),'wins':xs.count(1),'ties':xs.count(.5),'losses':xs.count(0),'meanTurns':statistics.mean(r['players'][0]['turns'] for r in games)}
 mean=result['mean'];z=1.96;denom=1+z*z/n
 center=(mean+z*z/(2*n))/denom;half=z*math.sqrt(mean*(1-mean)/n+z*z/(4*n*n))/denom
 result['ci95']=[max(0,center-half),min(1,center+half)];cells.append(result)
lookup={(c['p1Leader'],c['p2Leader'],c['p1Strategy'],c['p2Strategy']):c for c in cells}
comparisons=[]
for a in leaders:
 for b in leaders:
  if a==b:continue
  for t in strategies:
   xs=[data[a,b,'engine',t][seed]['players'][0]['share']-data[a,b,'money',t][seed]['players'][0]['share'] for seed in sorted(data[a,b,'engine',t])]
   comparisons.append({'p1Leader':a,'p2Leader':b,'changedSeat':1,'opponentStrategy':t,'engineMinusMoney':stats(xs)})
  for s in strategies:
   xs=[data[a,b,s,'engine'][seed]['players'][1]['share']-data[a,b,s,'money'][seed]['players'][1]['share'] for seed in sorted(data[a,b,s,'engine'])]
   comparisons.append({'p1Leader':a,'p2Leader':b,'changedSeat':2,'opponentStrategy':s,'engineMinusMoney':stats(xs)})
selected=[]
for a in leaders:
 for b in leaders:
  if a==b:continue
  replies={s:min(strategies,key=lambda t:lookup[a,b,s,t]['mean']) for s in strategies}
  s=max(strategies,key=lambda s:lookup[a,b,s,replies[s]]['mean']);t=replies[s]
  pure=lookup[a,b,s,t]['mean']>=max(lookup[a,b,x,t]['mean'] for x in strategies)-1e-12
  selected.append({**lookup[a,b,s,t],'mutualBestResponse':pure,'p2Responses':replies})
usage=collections.Counter();cross=0;trigger=collections.Counter();gamesBySeatLeader=collections.Counter()
for rows in data.values():
 for r in rows.values():
  for w in r['worship']:
   name=r['players'][w['seat']]['name'];usage[(name,w['event'],'favored' if w['favored'] else 'standard')]+=1
   cross+=not w['ownGod']
  for seat,l in enumerate(r['lineup']):
   trigger[(l,r['players'][seat]['name'])]+=r['leaderTriggers'][seat];gamesBySeatLeader[(l,r['players'][seat]['name'])]+=1
out={'manifest':manifest,'cells':cells,'pairedStrategyChanges':comparisons,'selectedPureStrategies':selected,'worship':[{'strategy':k[0],'event':k[1],'mode':k[2],'uses':v} for k,v in sorted(usage.items())],'crossGodUses':cross,'leaderTriggers':[{'leader':k[0],'strategy':k[1],'triggers':v,'playerGames':gamesBySeatLeader[k]} for k,v in sorted(trigger.items())]}
(folder/'analysis.json').write_text(json.dumps(out,indent=2))
fmt=lambda c:f"{100*c['mean']:.1f}% [{100*c['ci95'][0]:.1f}, {100*c['ci95'][1]:.1f}]"
lines=['Full standard leader / worship matrix','',f"{48*n:,} games; {n} per legal cell; identical seed indices in every cell.",'Rows P1, columns P2. Entries P1 win share; ties count half. Equal completed turns.', 'Fixed pairs: Thaleia/Athena, Nereon/Poseidon, Melia/Demeter, Doreios/Ares.', 'Same-leader games prohibited by setup. M=Money, E=Engine. No averaging across strategies.', 'Cell intervals: conservative Wilson 95% with half-credit ties. Paired changes: seed-level t intervals. Exploratory, not multiplicity-adjusted.','', 'Full 8 x 8 matrix (P1 share %):']
columns=[(l,s) for l in leaders for s in strategies]
lines.append('P1/P2'.ljust(14)+''.join((l[:3]+' '+letters[s]).rjust(9) for l,s in columns))
for a,s in columns:
 lines.append((a[:3]+' '+letters[s]).ljust(14)+''.join(('—' if a==b else f"{100*lookup[a,b,s,t]['mean']:.1f}").rjust(9) for b,t in columns))
lines+=['','All cells with 95% intervals and W/T/L:']
for c in cells:lines.append(f"{c['p1Leader']} {letters[c['p1Strategy']]} vs {c['p2Leader']} {letters[c['p2Strategy']]}: {fmt(c)}; {c['wins']}/{c['ties']}/{c['losses']}")
lines+=['','Best observed pure responses (P1 maximizes its worst case across P2 M/E):']
for c in selected:lines.append(f"{c['p1Leader']} {letters[c['p1Strategy']]} vs {c['p2Leader']} {letters[c['p2Strategy']]}: {fmt(c)}; mutual best response={c['mutualBestResponse']}")
lines+=['','Paired Engine-minus-Money changes (percentage points):']
for c in comparisons:lines.append(f"{c['p1Leader']} vs {c['p2Leader']}, P{c['changedSeat']} changes M to E, opponent {letters[c['opponentStrategy']]}: {fmt(c['engineMinusMoney'])}")
lines+=['','Worship usage:']
for k,v in sorted(usage.items()):lines.append(' / '.join(k)+': '+str(v))
lines += [f'Cross-god worship uses: {cross}', '', 'Every game finished, replayed exactly, and had equal completed turns.', 'Replay hashes are in compact game files; one full replay retained per 25-game chunk.', 'See ../METHOD.txt for standard-game adapter limitations. No optimal-play balance claim.']
(folder/'report.txt').write_text('\n'.join(lines)+'\n')
print('\n'.join(lines[:17]));print('Selected responses:');print(json.dumps(selected,indent=2))
