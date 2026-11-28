import gzip,json,collections
from pathlib import Path
root=Path('balance-diagnostics/independent-deploy-20261128');stats={}
cards=['rallying-cry','myrmidon-vanguard','phalanx-advance']
for i in range(7000):
 with gzip.open(root/'before'/f'{i}.json.gz','rt') as f:a=json.load(f)
 with gzip.open(root/'after'/f'{i}.json.gz','rt') as f:b=json.load(f)
 opp=a['info']['opponentLeader'];r=stats.setdefault(opp,dict(changedHistories=0,achillesNikePlaysBefore=0,opponentNikePlaysBefore=0,achillesNikeWorshipsBefore=0,opponentNikeWorshipsBefore=0))
 r['changedHistories']+=a['events']!=b['events']
 for e in a['events']:
  who='achilles' if e['name']=='achilles' else 'opponent'
  if e['type']=='action/played' and any(e['instanceId'].startswith('supply-'+c+'-') for c in cards):r[who+'NikePlaysBefore']+=1
  if e['type']=='god/worshipped' and e['cardId']=='march-of-victory':r[who+'NikeWorshipsBefore']+=1
(root/'usage.json').write_text(json.dumps(stats,indent=2));print(json.dumps(stats,indent=2))
