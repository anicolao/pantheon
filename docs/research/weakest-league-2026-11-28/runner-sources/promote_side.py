"""Run only after the main runner has stopped; no weaker baseline substitution."""
import sys,json,copy,subprocess,time
from pathlib import Path
sys.path.insert(0,str(Path.cwd()/'scripts/rl/expansion'))
from common import summary
from weakest_league import write,rankings
root=Path('balance-diagnostics/weakest-eight-house-20261128').resolve();name=sys.argv[1];folder=root/name
state=json.loads((root/'status.json').read_text());field=json.loads((folder/'field.json').read_text());result=json.loads((folder/'result.json').read_text())
assert result['accepted'] and result['vsIncumbent']['CI95'][0]>0 and result['vsOriginal']['CI95'][0]>0
assert state['field']==field,'Incumbent changed: a new paired comparison is required'
newfield=copy.deepcopy(field);newfield['actors']['achilles']=result['actor'];newfield['checkpoints']['achilles']=result['checkpoint']
ranking=folder/'ranking';ranking.mkdir();write(ranking/'field.json',newfield)
with (ranking/'matrix.log').open('w') as log:subprocess.run(['bun','scripts/rl/expansion/matrix.ts',str(ranking/'field.json'),str(ranking/'matrix'),'1000','16','weakest-side-rank-'+name],stdout=log,stderr=subprocess.STDOUT,check=True)
matrix={a:{} for a in field['stageLeaders']}
for p in (ranking/'matrix').glob('*/results.json'):
 a,b=p.parent.name.split('--');score=summary(json.loads(p.read_text()))['share'];matrix[a][b]=score;matrix[b][a]=1-score
assert all(len(row)==7 for row in matrix.values());shares=rankings(matrix)
assert json.loads((root/'status.json').read_text())==state,'Main runner changed state during promotion'
write(folder/'pre-promotion-state.json',state)
state['field']=newfield;state['matrix']=matrix;state.pop('warm',None)
if 'achilles' not in state['promoted']:state['promoted'].append('achilles')
if min(shares,key=shares.get)!='achilles' and 'achilles' not in state['escaped']:state['escaped'].append('achilles')
state['history'].append(dict(attempt=name,leader='achilles',accepted=True,selected=result['selected'],vsIncumbent=result['vsIncumbent'],vsOriginal=result['vsOriginal'],after=result['candidate'],before=result['baseline']))
write(root/'status.json',state);write(root/'selected-field.json',newfield);write(folder/'promotion.json',dict(time=time.time(),ranking=shares,result=result))
print(json.dumps(dict(promoted=name,ranking=shares,escaped=state['escaped'])),flush=True)
