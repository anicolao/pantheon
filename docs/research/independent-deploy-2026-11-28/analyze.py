from pathlib import Path
import json,statistics,math
root=Path('balance-diagnostics/independent-deploy-20261128')
a=json.loads((root/'before/results.json').read_text());b=json.loads((root/'after/results.json').read_text())
assert len(a)==len(b)==7000
assert json.loads((root/'before/protocol.json').read_text())['field']==json.loads((root/'after/protocol.json').read_text())['field']
for x,y in zip(a,b):
 assert all(x[k]==y[k] for k in ['seed','gameSeed','opponentLeader','first','block'])
 assert x['replayVerified'] and y['replayVerified']
def compare(pairs):
 blocks={}
 for x,y in pairs:blocks.setdefault(x['block'],[]).append(y['share']-x['share'])
 assert all(len(ds)==2 for ds in blocks.values())
 ds=[statistics.mean(v) for v in blocks.values()];delta=statistics.mean(ds);half=1.96*statistics.stdev(ds)/math.sqrt(len(ds))
 return dict(games=len(pairs),pairedSeeds=len(ds),before=statistics.mean(x['share'] for x,y in pairs),after=statistics.mean(y['share'] for x,y in pairs),delta=delta,CI95=[delta-half,delta+half],changedOutcomes=sum(x['share']!=y['share'] for x,y in pairs))
pairs=list(zip(a,b));r=dict(overall=compare(pairs),byOpponent={hero:compare([(x,y) for x,y in pairs if x['opponentLeader']==hero]) for hero in sorted({x['opponentLeader'] for x in a})})
(root/'analysis.json').write_text(json.dumps(r,indent=2));print(json.dumps(r,indent=2))
