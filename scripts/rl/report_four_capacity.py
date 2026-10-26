"""Audit the three runtime batches and report capacity-versus-training results."""
import gzip,hashlib,json,statistics,sys
from pathlib import Path

r=Path(sys.argv[1]);config=json.loads((r/'config.json').read_text());result=json.loads((r/'capacity-results.json').read_text());selection=json.loads((r/'selection.json').read_text())
tables={};total=0
for name in ['incumbent','control','wide']:
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
(r/'capacity-audit.json').write_text(json.dumps(audit,indent=2)+'\n')
lines=['Doreios capacity experiment','',
       'Accepted 128x128 model: 122,206 actor+critic parameters. Widened 256x256 model: 309,598 parameters.',
       'The widened initialization duplicates hidden activations and splits outgoing weights 75/25. It matched all 6,139 decisions across 64 games before training. Actor and critic remain separate fully connected tanh networks; observations and action masks are unchanged.',
       'Both arms train 524,288 decisions with matched training seeds, eight workers, identical PPO hyperparameters, frozen opponents, and four checkpoints. Best trained checkpoint in each arm is selected on 512 common screening games. Incumbent and both selected checkpoints are then evaluated on 1,600 fresh matched games each (400 seed blocks x four seating rotations).',
       '', 'Model | Doreios win share | Pointwise 95% CI | Mean VP']
for name in ['incumbent','control','wide']:
    s=result['models'][name];lines.append(f"{name} | {s['share']:.2%} | {s['CI95'][0]:.2%} to {s['CI95'][1]:.2%} | {s['meanVP']:.2f}")
lines += ['', 'Paired contrasts (percentage points):']
for name,comparison in result['comparisons'].items():
    lo,hi=comparison['paired95CI'];lines.append(f"{name}: {100*comparison['delta']:+.2f}; pointwise 95% CI {100*lo:+.2f} to {100*hi:+.2f}.")
lines += ['',f"Capacity improvement confirmed: {result['capacityImprovementConfirmed']}.",
          'A capacity claim requires both wide-versus-incumbent and wide-versus-control adjusted lower bounds above zero (Bonferroni two-comparison 95% family coverage). Intervals cluster seating rotations by seed. This is one training seed per architecture, not a measurement of variation across repeated training runs.',
          '', 'Four-player split win shares:', 'Leader | Incumbent | Trained 128 | Trained 256']
for leader in ['melia','nereon','thaleia','doreios']:
    lines.append(leader.title()+' | '+' | '.join(f'{tables[name][leader]:.2%}' for name in ['incumbent','control','wide']))
lines += ['',f'All {total} browser-runtime confirmation games matched Python outcomes and replayed to identical full final states. No games were excluded.',
          'All checkpoints and replays are retained. Production models are unchanged.', '', 'Selected checkpoints:',json.dumps(selection['choices'],indent=2), '']
(r/'report.txt').write_text('\n'.join(lines));print('\n'.join(lines[:23]))
