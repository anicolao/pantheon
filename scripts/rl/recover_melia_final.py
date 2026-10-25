"""Combine the saved champion evaluation with the exact-seed MM rerun after ENOSPC."""
import hashlib,json
from pathlib import Path
from train import stats,paired
r=Path('balance-results/melia-rl-v1');out=r/'final'
assert not (out/'results.json').exists(), 'Refusing to overwrite completed evaluation'
a=json.loads((out/'champion.json').read_text());b=json.loads((r/'mm-final/teacher.json').read_text())
expected=[f'rl-melia-v1-final:test:{i}' for i in range(6144)]
for rows in [a,b]:
 assert [x['seed'] for x in rows]==expected
 assert all(x['replayVerified'] and x['reward']==x['outcome'] for x in rows)
original=json.loads(next(line for line in (out/'interrupted-run.log').read_text().splitlines() if line.startswith('{"model": "champion"')))
for key,value in stats(a).items():assert original[key]==value,(key,original[key],value)
digest=hashlib.sha256((r/'champion.zip').read_bytes()).hexdigest()
assert digest==json.loads((r/'champion.json').read_text())['checkpointSHA256']
assert digest==json.loads(Path('src/lib/bots/models/melia.json').read_text())['checkpointSHA256']
(out/'mm.json').write_text(json.dumps(b))
result=dict(summary={'champion':stats(a),'mm':stats(b)},comparisons={'champion-vs-mm':paired(a,b)},checkpointSHA256={'champion':digest},recovery={'reason':'Disk-full write interrupted the original MM output; all MM seeds rerun unchanged, saved champion rows retained','championSource':'final/champion.json','mmSource':'mm-final/teacher.json','championElapsedSeconds':original['elapsedSeconds'],'mmElapsedSeconds':json.loads((r/'mm-final/results.json').read_text())['elapsedSeconds']})
(out/'results.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result['summary']))
