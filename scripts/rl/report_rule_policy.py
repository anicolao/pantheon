"""Report a frozen strategic teacher's fresh paired confirmation."""
import json,math,statistics,sys
from pathlib import Path
from train_four import summary
r=Path(sys.argv[1]);c=json.loads((r/'config.json').read_text());selection=json.loads((r/'selection.json').read_text())
a=json.loads((r/'jobs/candidate.json').read_text());b=json.loads((r/'jobs/incumbent.json').read_text());blocks={}
for x,y in zip(a['rows'],b['rows'],strict=True):
 assert (x['seed'],x['seat'],x['turnPosition'])==(y['seed'],y['seat'],y['turnPosition'])
 assert x['replayVerified'] and y['replayVerified']
 blocks.setdefault(x['block'],[]).append(x['share']-y['share'])
values=[statistics.mean(v) for v in blocks.values()];mean=statistics.mean(values);se=statistics.stdev(values)/math.sqrt(len(values));ci=[mean-1.96*se,mean+1.96*se]
tables={}
for name,row in [('incumbent',b),('candidate',a)]:
 tables[name]={leader:statistics.mean((1/sum(v==max(x['scores'].values()) for v in x['scores'].values())) if x['scores'][leader]==max(x['scores'].values()) else 0 for x in row['rows']) for leader in ['melia','nereon','thaleia','doreios']}
result=dict(incumbent=summary(b['rows']),candidate=summary(a['rows']),pairedShareDelta=mean,paired95CI=ci,improvementConfirmed=ci[0]>0,rule=selection['rule'],overridesPerGame=a['overrides']/len(a['rows']),tableWinShares=tables,replayVerifiedGames=len(a['rows'])+len(b['rows']),productionUpdated=False)
(r/'results.json').write_text(json.dumps(result,indent=2)+'\n')
lines=['Doreios strategic teacher experiment','',c['selection'],'', 'Selected rule: '+json.dumps(selection['rule']), '']
if (r/'interpretation-notes.json').exists():lines += [*json.loads((r/'interpretation-notes.json').read_text()),'']
for name in ['incumbent','candidate']:
 s=result[name];lines.append(f"{name}: {s['share']:.2%} split win share; 95% CI {s['CI95'][0]:.2%} to {s['CI95'][1]:.2%}; mean VP {s['meanVP']:.2f}.")
lines += [f'Paired change: {mean*100:+.2f} pp; 95% CI {ci[0]*100:+.2f} to {ci[1]*100:+.2f}.',f"Overrides per game: {result['overridesPerGame']:.3f}.", '', 'Leader | Before | After']
for leader in ['melia','nereon','thaleia','doreios']:lines.append(f"{leader}: {tables['incumbent'][leader]:.2%} | {tables['candidate'][leader]:.2%}")
lines += ['', 'Intervals cluster the four seating rotations per seed. Selection preceded fresh confirmation; no failed games excluded. Every game uses the browser actor and production reducers and replays to identical full state in memory. Outcome records, rules, and frozen source retained. This is a hybrid rule teacher, not newly learned weights; production is unchanged.']
(r/'report.txt').write_text('\n'.join(lines)+'\n');print('\n'.join(lines))
