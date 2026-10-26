"""Pool independent completed confirmation games by exact policy, without double-counting duplicates."""
import json,hashlib,statistics,math
from pathlib import Path
root=Path('balance-results');groups={};opponents=None

def actor_key(path):
 a=json.loads(path.read_text());return hashlib.sha256(json.dumps({k:a[k] for k in ['leader','schemaSignature','activation','dtype','layers']},sort_keys=True).encode()).hexdigest()
def add(key,label,rows):
 g=groups.setdefault(key,dict(labels=[],rows={}))
 if label not in g['labels']:g['labels'].append(label)
 for x in rows:
  assert x['replayVerified'];seed=x['seed'];gamekey=(seed,x['seat'],x['turnPosition'])
  if gamekey in g['rows']:assert g['rows'][gamekey]['share']==x['share'] and g['rows'][gamekey]['scores']==x['scores']
  else:g['rows'][gamekey]=x
for n in [14,15,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39]:
 r=root/f'doreios-four-rl-v{n}'
 if not (r/'results.json').exists():continue
 native=(r/'incumbent-confirm.json').exists()
 if native and not (r/'audit.json').exists():continue
 hashes={l:actor_key(r/'actors'/f'{l}.json') for l in ['melia','nereon','thaleia']}
 if opponents is None:opponents=hashes
 else:assert hashes==opponents,'Cannot pool different opposing policies'
 baseline=actor_key(r/'actors/doreios.json')
 adapter=json.loads((r/'config.json').read_text()).get('baselineAdapter')
 if adapter:baseline=hashlib.sha256(json.dumps(dict(base=baseline,adapter=adapter['study'],rule=adapter['rule']),sort_keys=True).encode()).hexdigest()
 if native:
  add(baseline,f'v{n} incumbent',json.loads((r/'incumbent-confirm.json').read_text()))
  add(actor_key(r/'candidate.json'),f'v{n} candidate',json.loads((r/'selected-confirm.json').read_text()))
 else:
  add(baseline,f'v{n} incumbent',json.loads((r/'jobs/incumbent.json').read_text())['rows'])
  selection=json.loads((r/'selection.json').read_text());rule=selection['rule']
  key=baseline if rule is None else hashlib.sha256(json.dumps(dict(base=baseline,adapter=n,rule=rule),sort_keys=True).encode()).hexdigest()
  add(key,f'v{n} teacher',json.loads((r/'jobs/candidate.json').read_text())['rows'])
results=[]
for key,g in groups.items():
 blocks={}
 for row in g['rows'].values():blocks.setdefault((row['seed'].rsplit(':',1)[0],row['block']),[]).append(row)
 assert all(len(v)==4 and {x['turnPosition'] for x in v}==set(range(4)) for v in blocks.values())
 values=[statistics.mean(x['share'] for x in v) for v in blocks.values()];mean=statistics.mean(values);half=1.96*statistics.stdev(values)/math.sqrt(len(values))
 results.append(dict(policySHA256=key,labels=g['labels'],games=len(g['rows']),seedBlocks=len(values),share=mean,CI95=[mean-half,mean+half]))
output=dict(note='Descriptive pooled estimates for identical fixed policies on independently generated confirmation sets. Duplicate same-policy games are counted once. Screens/training excluded. These pooled estimates do not replace predeclared paired comparisons or prove causation.',frozenOpponentPolicySHA256=opponents,policies=results)
(root/'doreios-overnight-v1/pooled-confirmation.json').write_text(json.dumps(output,indent=2)+'\n')
for x in results:print(json.dumps(x))
