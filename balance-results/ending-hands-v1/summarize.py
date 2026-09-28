from pathlib import Path
from collections import defaultdict,Counter
import json,gzip,sys,math,csv
p=Path(sys.argv[1]);m=json.loads((p/'manifest.json').read_text());assert m['status']=='completed' and m['failures']==0
stats={};pairs=defaultdict(lambda:Counter());examples=[];paired_count=0;seen=set();block_stats=defaultdict(lambda:defaultdict(float))
for shard in range(m['workers']):
 before={}
 with gzip.open(p/f'decks-{shard}.jsonl.gz','rt') as f:
  for line in f:
   if not line.strip():continue
   r=json.loads(line);key=(r['version'],r['key']);assert key not in seen;seen.add(key)
   h={int(k):v for k,v in r['histogram'].items()};opening={int(k):v for k,v in r['openingHistogram'].items()}
   assert sum(h.values())==sum(opening.values())==r['hands']==100
   assert abs(sum(c*n for c,n in h.items())/100-r['mean'])<1e-12
   assert sum(n for c,n in h.items() if c>=8)==r['hitEight']
   group=(r['version'],r['leader'],r['family'])
   if group not in stats:stats[group]={'decks':0,'histogram':Counter(),'openingHistogram':Counter(),'predictionSum':0,'predictionN':0,'predictionAbsoluteErrorSum':0,'sizeSum':0,'scoreSum':0,'pointCardsSum':0,'predictedAboveEight':0}
   s=stats[group];s['decks']+=1;s['histogram'].update(h);s['openingHistogram'].update(opening);s['sizeSum']+=r['size'];s['scoreSum']+=r['score'];s['pointCardsSum']+=sum(r['owned'].get(c,0) for c in ['hamlet','polis','acropolis'])
   if r['predictedMean'] is not None:
    s['predictionSum']+=r['predictedMean'];s['predictionN']+=1;s['predictionAbsoluteErrorSum']+=abs(r['predictedMean']-r['mean']);s['predictedAboveEight']+=int(r['predictedMean']>=8)
   b=block_stats[(r['version'],r['leader'],r['family'],r['block'])];b['decks']+=1;b['income']+=r['mean'];b['hitRate']+=r['hitEight']/100
   if r['version']==4:before[r['key']]=r
   else:
    old=before.pop(r['key']);paired_count+=1
    if r['family']=='treasure':
     q=pairs[r['leader']];q['pairs']+=1;q['higherMean']+=int(r['mean']>old['mean']);q['higherHitRate']+=int(r['hitEight']>old['hitEight']);q['higherMeanButLowerHitRate']+=int(r['mean']>old['mean'] and r['hitEight']<old['hitEight'])
     if len(examples)<16:examples.append({'key':r['key'],'before':old,'after':r})
 assert not before
assert len(seen)==m['decks']==240000 and paired_count==120000
rows=[]
def quantile(h,n,q):
 total=0
 for x,c in sorted(h.items()):
  total+=c
  if total>=math.ceil(q*n):return x
for (version,leader,family),s in sorted(stats.items()):
 h=s['histogram'];n=sum(h.values());assert s['decks']==6000 and n==600000
 mean=sum(c*count for c,count in h.items())/n;pred=s['predictionSum']/s['predictionN'] if s['predictionN'] else None
 rows.append({'version':version,'leader':leader,'family':family,'decks':s['decks'],'hands':n,'mean':mean,'hitEight':sum(v for k,v in h.items() if k>=8)/n,'hitSixteen':sum(v for k,v in h.items() if k>=16)/n,'p50':quantile(h,n,.5),'p90':quantile(h,n,.9),'p95':quantile(h,n,.95),'openingMean':sum(c*count for c,count in s['openingHistogram'].items())/n,'predictedMean':pred,'predictionBias':pred-mean if pred is not None else None,'predictionMAE':s['predictionAbsoluteErrorSum']/s['predictionN'] if s['predictionN'] else None,'meanSize':s['sizeSum']/s['decks'],'meanVP':s['scoreSum']/s['decks'],'meanPointCards':s['pointCardsSum']/s['decks'],'histogram':dict(sorted(h.items()))})
lookup={(r['version'],r['leader'],r['family']):r for r in rows}
leaders=['thaleia','nereon','melia','doreios']
lines=['# Ending-deck audit: 100 fresh hands from every deck','', '240,000 ending decks (both players in every v4/v5 evaluation game), 100 hands each: **24,000,000 deals**. Every hand starts with a fresh shuffle and plays Actions before counting spendable Coins. Both versions use the same v5 cash play rule. No purchases or Worship; optional trash/upgrades declined. This tests the income model on independently dealt hands, not optimal play or historical per-turn cash.','', '## Treasure ending decks','', '| Leader | Mean Coins before | Mean Coins after | P(≥$8) before | P(≥$8) after |','| --- | ---: | ---: | ---: | ---: |']
for leader in leaders:
 a,b=lookup[4,leader,'treasure'],lookup[5,leader,'treasure'];lines.append(f"| {leader} | {a['mean']:.3f} | {b['mean']:.3f} | {100*a['hitEight']:.2f}% | {100*b['hitEight']:.2f}% |")
lines+=['','600,000 dealt hands per leader and version, from 6,000 decks. Each deck has equal weight.','', '## Calibration of the v5 EV estimator','', 'The v5 estimator is evaluated on both versions’ ending decks. Its synthetic sample orders are separate from these fresh shuffles. Bias is predicted minus dealt mean.','', '| Leader | Version | Predicted mean | Dealt mean | Bias | Mean absolute per-deck discrepancy |','| --- | --- | ---: | ---: | ---: | ---: |']
for leader in leaders:
 for version in [4,5]:
  r=lookup[version,leader,'treasure'];lines.append(f"| {leader} | v{version} | {r['predictedMean']:.3f} | {r['mean']:.3f} | {r['predictionBias']:+.3f} | {r['predictionMAE']:.3f} |")
lines+=['','## All leader/strategy ending decks','', '| Leader | Strategy | Mean before | Mean after | P(≥$8) before | P(≥$8) after |','| --- | --- | ---: | ---: | ---: | ---: |']
for leader in leaders:
 for family in ['treasure','engine','thin','worship','race']:
  a,b=lookup[4,leader,family],lookup[5,leader,family];lines.append(f"| {leader} | {family} | {a['mean']:.3f} | {b['mean']:.3f} | {100*a['hitEight']:.2f}% | {100*b['hitEight']:.2f}% |")
lines+=['','## Interpretation limits','', 'A higher mean does not mathematically guarantee a higher threshold probability; the full income histograms are archived. More importantly, ending-deck income is not accumulated VP or the time needed to build that deck. These final decks contain different quantities of points and come from games that may end on different turns. The prior matrix supplies scoring timing and final VP; this audit alone cannot isolate the scoring gate, acquisition policy or estimator error as a cause of lost games.','', 'All observations here are descriptive. A hundred hands gives a noisy estimate for an individual deck; the aggregate pools many decks, but the original games share 200 seed blocks. The audit is not 24 million independent game outcomes.','']
(p/'report.md').write_text('\n'.join(lines));(p/'summary.json').write_text(json.dumps(rows,indent=2)+'\n');(p/'paired-decks.json').write_text(json.dumps(dict(pairs),indent=2)+'\n');(p/'examples.json').write_text(json.dumps(examples,indent=2)+'\n')
(p/'block-summaries.json').write_text(json.dumps([{'version':key[0],'leader':key[1],'family':key[2],'block':key[3],**value} for key,value in sorted(block_stats.items())],indent=2)+'\n')
print('Verified 240,000 unique decks, 100 outcomes each, 120,000 before/after pairs')
print('\n'.join(lines[:12]));print(json.dumps([r for r in rows if r['family']=='treasure'],indent=2))
