import sys,json,hashlib
from pathlib import Path
sys.path.insert(0,str(Path.cwd()/'scripts/rl/expansion'))
from common import *
from league_transport import league_vector
from weakest_league import paired,write
if __name__=='__main__':
 torch.set_num_threads(1)
 root=Path('balance-diagnostics/perseus-bind-vp-20261128').resolve()
 field=Path('balance-diagnostics/all-leader-territory-adaptation-20261128/after-field.json').resolve()
 baseline=Path('balance-diagnostics/all-leader-territory-adaptation-20261128/perseus-new-audit.json')
 before=json.loads(baseline.read_text());write(root/'before.json',before)
 write(root/'comparison-protocol.json',dict(field=json.loads(field.read_text()),baselineSHA256=hashlib.sha256(baseline.read_bytes()).hexdigest(),prefix='all-adapt-final-20261128:perseus',namespace='audit',games=3584,workers=16,reusedDevelopmentSeeds=True,sources={f:hashlib.sha256(Path(f).read_bytes()).hexdigest() for f in ['src/lib/game/actions.ts','src/lib/game/expansion-cards.ts','src/lib/bots/expansion-schema.ts','src/lib/bots/deploy-schema.ts']}))
 vec=league_vector(16,'all-adapt-final-20261128:perseus','perseus',str(field))
 try:
  checkpoint=json.loads(field.read_text())['checkpoints']['perseus']
  after=evaluate(vec,MaskablePPO.load(checkpoint,device='cpu'),'audit',3584);write(root/'after.json',after)
  report=dict(before=summary(before),after=summary(after),paired=paired(before,after),opponents={})
  for opponent in sorted({r['opponentLeader'] for r in before}):
   a=[r for r in before if r['opponentLeader']==opponent];b=[r for r in after if r['opponentLeader']==opponent]
   report['opponents'][opponent]=dict(before=summary(a),after=summary(b),paired=paired(a,b))
  write(root/'comparison.json',report);print(json.dumps(report),flush=True)
 finally:close_vector(vec)
