"""Verify frozen Melia evaluation coverage and summarize without excluding games."""
import hashlib,json
from pathlib import Path
from train import stats,paired

root=Path('balance-results/melia-rl-v1')
manifest=json.loads((root/'champion.json').read_text())
checkpoint_hash=hashlib.sha256((root/'champion.zip').read_bytes()).hexdigest()
assert checkpoint_hash==manifest['checkpointSHA256']
config=json.loads((root/'configs/final.json').read_text())
results=json.loads((root/'final/results.json').read_text())
assert results['checkpointSHA256']['champion']==checkpoint_hash
expected=json.loads((root/'protocol.json').read_text())['opponents']
models={}
for name in config['models']:
 rows=json.loads((root/f'final/{name}.json').read_text())
 assert len(rows)==config['games']==6144
 assert [r['seed'] for r in rows]==[f"{config['prefix']}:test:{i}" for i in range(6144)]
 assert all(r['replayVerified'] and r['reward']==r['outcome'] for r in rows)
 assert sum(r['first'] for r in rows)==3072
 for leader,digest in expected.items():
  group=[r for r in rows if r['opponentLeader']==leader]
  assert len(group)==2048 and sum(r['first'] for r in group)==1024
  assert all(r['opponentCheckpointSHA256']==digest for r in group)
 models[name]=rows
summary={name:stats(rows) for name,rows in models.items()}
for name,rows in models.items():
 summary[name]['bySeat']={seat:stats([r for r in rows if r['first']==first]) for seat,first in [('first',True),('second',False)]}
comparison=paired(models['champion'],models['mm'])
result=dict(checkpointSHA256=checkpoint_hash,allGamesReplayVerified=True,noExcludedGames=True,summary=summary,matchedShareImprovement=comparison)
(root/'summary.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))

def result_line(name,r):
 lo,hi=r['winCI95'];return f"{name:12s} {r['wins']:4d}W {r['ties']:3d}T {r['losses']:4d}L | win {100*r['wins']/r['games']:.2f}% (95% Wilson {100*lo:.2f}-{100*hi:.2f}%) | share {100*r['share']:.2f}%"
runs={name:json.loads((root/name/'results.json').read_text()) for name in ['rl-a','explore','polish','focus-nereon']}
lines=['Melia RL versus the three frozen learned opponents','',result_line('Melia RL',summary['champion']),result_line('MM teacher',summary['mm']),'', 'Melia RL by opponent (2,048 games each, 1,024 in each starting seat):']
lines += [result_line(name,r) for name,r in summary['champion']['opponents'].items()]
lines += ['', 'MM teacher on the same final seeds:']+[result_line(name,r) for name,r in summary['mm']['opponents'].items()]
lo,hi=comparison['pairedApprox95CI']
lines += ['',f"Matched tie-adjusted share improvement: {100*comparison['shareDelta']:.2f} percentage points (paired approximate 95% CI {100*lo:.2f}-{100*hi:.2f}).",'','Training and selection:',
 'Fresh independently initialized 128x128 tanh network, imitating MM over 1,536 expert games and two 384-game DAgger rounds.',
 '171 player-known/public features; 349 legal command slots; no hidden deck order, opponent hands, seeds, or instance IDs.',
 'Terminal win/tie/loss reward +1/0/-1; no imitation penalty during RL.',
 'Initial balanced RL and higher-exploration runs, then balanced lower-learning-rate and Nereon-focused continuations.',
 f"Total RL decisions across research runs: {sum(r['trainingSteps'] for r in runs.values()):,}; completed training games: {sum(r['trainingGames'] for r in runs.values()):,}.",
 f"Selected checkpoint lineage: {manifest['lineageRLDecisions']:,} RL decisions.",manifest['selection'],
 'All intermediate checkpoints are retained. Reused screening seeds guided tuning; separate confirmation seeds selected the final checkpoint.',
 'The model was frozen before final seeds rl-melia-v1-final:test:0..6143 were evaluated. No excluded games; all 12,288 final games replayed exactly.',
 'The MM reference here uses the same canonical card-instance command encoding as training; the heuristic tournament uses native heuristic commands.',
 'The Nereon outright-win interval includes 50%; this does not establish an outright-win probability above 50%. Its 54.88% tie-adjusted share is a different measure.',
 'Confidence intervals cover game-seed uncertainty, not training-run variability. Results are heads-up, not four-player strength.',
 'ENOSPC interrupted the original MM result write. The champion rows were preserved; all MM seeds were rerun unchanged. final/results.json records this recovery.',
 '', 'Production integration:',
 'The Bot choice now selects the corresponding RL actor for Melia, Thaleia, Nereon, and Doreios. Explicit MM/Money/Engine/Classic Engine choices are unchanged.',
 'Leader preference remains Melia, Thaleia, Nereon, Doreios. Inference is synchronous JavaScript with exported float32 weights; Python is training-only.',
 'The previous three actor checkpoints remain unchanged. Export verification checked exact PyTorch/browser decisions over 768 games for those three, and 384 games for Melia.',
 '64 frozen PyTorch fixtures provide continuous regression checks. Real browser-worker tests cover all four leaders and visible moves.',
 '', 'Artifacts:',
 'champion.json and champion.zip: frozen checkpoint and lineage/checksum.',
 'src/lib/bots/models/melia.json: lossless actor export.',
 'configs/*.json: reproducible campaign schedules; scripts/rl contains training/evaluation/export tools.',
 'final/*.json and summary.json: full final result rows and verified statistics.',
 '../rl-heuristic-v1/report.txt: four-model heuristic tournament, with complete replay files.']
(root/'report.txt').write_text('\n'.join(lines)+'\n')
