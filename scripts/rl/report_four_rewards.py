"""Audit all round-discount reward arms against Python and full replay."""
import gzip,hashlib,json,statistics,sys
from pathlib import Path

r=Path(sys.argv[1]);config=json.loads((r/'config.json').read_text());result=json.loads((r/'reward-results.json').read_text());selection=json.loads((r/'selection.json').read_text())
tables={};total=0
for name in ['incumbent',*config['confirmationModels']]:
    expected=json.loads((r/f'{name}-confirm.json').read_text());rows=json.loads((r/f'replays-{name}/games.json').read_text());p=json.loads((r/f'replays-{name}/protocol.json').read_text())
    assert len(rows)==len(expected)==config['confirmationGames']
    assert p['runnerSHA256']==hashlib.sha256((r/'replay-runner.js').read_bytes()).hexdigest()
    for leader,path in p['actorPaths'].items():assert p['actorSHA256'][leader]==hashlib.sha256(Path(path).read_bytes()).hexdigest()
    for game,old in zip(rows,expected,strict=True):
        player=next(p for p in game['players'] if p['leader']=='doreios')
        assert game['index']==int(old['seed'].split(':')[-1])
        assert game['seed']==old['seed'].rsplit(':',1)[0]+':'+str(old['block'])
        assert (player['share'],player['score'],player['turns'],player['seat'],player['turnPosition'])==(old['share'],old['score'],old['turns'],old['seat'],old['turnPosition'])
        assert {p['leader']:p['score'] for p in game['players']}==old['scores']
        assert game['replayVerified'] and old['replayVerified']
        saved=json.loads(gzip.decompress((r/f"replays-{name}/replays/{game['index']}.json.gz").read_bytes()))
        assert saved['result']==game;total+=1
    tables[name]={leader:statistics.mean(p['share'] for game in rows for p in game['players'] if p['leader']==leader) for leader in ['melia','nereon','thaleia','doreios']}
audit=dict(runtimeMatchesPython=True,verifiedReplays=total,tableWinShares=tables)
(r/'reward-audit.json').write_text(json.dumps(audit,indent=2)+'\n')
names=['incumbent',*config['confirmationModels']]
lines=['Doreios round-discount reward experiment','',
 'Terminal reward = split win share * discount ** (completed rounds - 1). Discounts: control 1, discount01 .99, discount02 .98. Losses and intermediate rewards are zero. PPO gamma and GAE lambda remain 1; actions are not discounted.',
 'Each arm starts with the same v7 public-information policy, identical actor weights, and critic transformed as (V+1)/2 for the new reward range. Each trains 524,288 decisions with four workers, learning rate 1e-4, entropy .003, and no anchoring. Frozen opponents and training seeds are shared.',
 'Select the best trained checkpoint per arm by ordinary win share on 512 common screening games (earliest on ties). Then freeze choices and confirm all arms and incumbent on 1,600 fresh matched games each: 400 seed blocks x four rotations.',
 '', 'Model | Win share | 95% CI | Mean winning round | Mean round (all games) | .99 discounted score | .98 discounted score']
for name in names:
 s=result['models'][name];lines.append(f"{name} | {s['share']:.2%} | {s['CI95'][0]:.2%} to {s['CI95'][1]:.2%} | {s['winningRound']:.3f} | {s['meanRounds']:.3f} | {s['discounted99']:.5f} | {s['discounted98']:.5f}")
lines+=['','Paired win-share changes (percentage points):']
for name,c in result['comparisons'].items():
 lo,hi=c['paired95CI'];lines.append(f"{name}: {100*c['delta']:+.2f}; pointwise 95% CI {100*lo:+.2f} to {100*hi:+.2f}.")
 if name.startswith('discount'):
  lo,hi=c['adjusted95CI'];lines.append(f'  Four-comparison adjusted interval: {100*lo:+.2f} to {100*hi:+.2f} pp.')
lines+=['', 'Confirmed win-share improvement over both control and incumbent: '+json.dumps(result['confirmed']),
 'Primary intervals cluster by seed block and use Bonferroni correction for the four discount-versus-control/incumbent comparisons. One training seed per arm. Winning-round means weight shared wins by split credit; they are descriptive and conditional on winning, so changes can reflect which games are won, not just faster play. Discounted scores are secondary descriptive metrics.',
 '', 'Four-player win shares:', 'Leader | Incumbent | Control | 1% discount | 2% discount']
for leader in ['melia','nereon','thaleia','doreios']:lines.append(leader.title()+' | '+' | '.join(f'{tables[name][leader]:.2%}' for name in names))
lines+=['',f'All {total} runtime games reproduced Python outcomes and replayed to identical full final states. No games excluded. All checkpoints and replays saved; production weights unchanged.', '', 'Selected checkpoints:',json.dumps(selection['choices'],indent=2),'']
(r/'report.txt').write_text('\n'.join(lines));print('\n'.join(lines[:30]))
