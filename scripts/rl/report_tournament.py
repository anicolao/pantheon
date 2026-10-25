"""Audit final benchmark coverage and produce a compact text report."""
import hashlib,json
from pathlib import Path
root=Path('balance-results/rl-heuristic-v1')
protocol=json.loads((root/'evaluation/protocol.json').read_text())
results=json.loads((root/'evaluation/results.json').read_text())
rows=json.loads((root/'evaluation/games.json').read_text())
assert results['totalGames']==len(rows)==8100
assert len(results['matchups'])==81
assert hashlib.sha256((root/'runner.js').read_bytes()).hexdigest()==protocol['runnerSHA256']
for leader,digest in protocol['checkpointSHA256'].items():
 assert json.loads(Path(f'src/lib/bots/models/{leader}.json').read_text())['checkpointSHA256']==digest
for match in results['matchups']:
 group=[r for r in rows if r['key']==match['key']]
 assert len(group)==100 and sorted(r['index'] for r in group)==list(range(100))
 assert sum(r['first'] for r in group)==50 and all(r['replayVerified'] for r in group)
 assert sum(r['outcome']=='win' for r in group)==match['wins']
 assert sum(r['outcome']=='tie' for r in group)==match['ties']

def line(r):
 lo,hi=r['winCI95']
 return f"{r['wins']:4d}W {r['ties']:3d}T {r['losses']:4d}L  win {100*r['winRate']:5.1f}%  95% CI {100*lo:5.1f}-{100*hi:5.1f}%  share {100*r['share']:5.1f}%"
text=['Four frozen RL models versus heuristic policies','',
 '8,100 heads-up games: 81 matchups x 100 seeds, 50 games in each starting seat.',
 'Every game completed and replayed to the identical full state. No exclusions.',
 'One immutable bundled runner contains the production actors and native heuristic policies.',
 'No benchmark seeds were used for model selection or training.','',
 'Balanced common-policy pool (six policies x three opposing leaders x 100 = 1,800 games per model):']
for r in results['generalPoliciesOnly']:text.append(f"{r['leader']:8s}  {line(r)}")
text += ['', 'This pool uses MM, Money, current Engine, Classic Engine, archived Owl v2, and MN.',
 'MM, Owl, and MN are also assigned outside their intended leaders (Melia, Thaleia, Nereon).',
 'Treat aggregate strength as performance against this chosen opponent mix, not a universal ranking.',
 'Aggregate intervals cluster shared seeds across policies; per-match intervals are Wilson 95%.',
 'Intervals describe seed uncertainty, not training-run or opponent-selection uncertainty.',
 'Ties count as half in share and zero in outright wins. No multiple-comparison correction.','',
 'Intended-leader heuristic comparisons:']
for r in results['matchups']:
 if (r['policy'],r['opponent']) in [('mm','melia'),('owl','thaleia'),('mn','nereon'),('fleet-v1','nereon'),('fleet-v6','nereon'),('grove','doreios')]:
  text.append(f"{r['learner']:8s} vs {r['policy']:14s} {r['opponent']:8s}  {line(r)}")
text += ['', 'All matchups (same-leader matches are impossible under the game draft):']
for r in results['matchups']:text.append(f"{r['learner']:8s} vs {r['policy']:14s} {r['opponent']:8s}  {line(r)}")
text += ['', 'Reproduction:',
 'nix develop /tmp/pantheon-nix-env --command bun balance-results/rl-heuristic-v1/runner.js <config>',
 'Use evaluation.json with a fresh output directory to rerun; existing completed shards resume.',
 'The /tmp Nix flake is an exact copy of repository flake.nix/flake.lock.',
 'Full commands and configurations are retained in evaluation/replays/*.json.gz.',
 'Source harness: scripts/rl/heuristic_matrix.ts. Protocol includes runner and actor hashes.']
(root/'report.txt').write_text('\n'.join(text)+'\n')
print('\n'.join(text[:11]))
