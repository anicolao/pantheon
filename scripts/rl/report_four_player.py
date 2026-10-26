"""Audit and summarize the frozen 400-game, 100-block four-player study."""
import collections
import gzip
import hashlib
import json
import math
from pathlib import Path
import statistics

ROOT = Path('balance-results/rl-four-player-v1')
config = json.loads((ROOT / 'evaluation.json').read_text())
protocol = json.loads((ROOT / 'evaluation/protocol.json').read_text())
games = json.loads((ROOT / 'evaluation/games.json').read_text())
leaders = ['melia', 'nereon', 'thaleia', 'doreios']
assert len(games) == 400
assert {g['index'] for g in games} == set(range(400))
assert len({g['seed'] for g in games}) == 100
assert protocol['runnerSHA256'] == hashlib.sha256((ROOT / 'runner.js').read_bytes()).hexdigest()
assert protocol['checkpointSHA256'] == config['checkpointSHA256']
blocks = collections.defaultdict(list)
for game, spec in zip(games, config['games'], strict=True):
    assert all(game[key] == value for key, value in spec.items())
    assert game['replayVerified']
    assert sorted(p['leader'] for p in game['players']) == sorted(leaders)
    assert len({p['turns'] for p in game['players']}) == 1
    assert math.isclose(sum(p['share'] for p in game['players']), 1)
    saved = json.loads(gzip.decompress((ROOT / f"evaluation/replays/{game['index']}.json.gz").read_bytes()))
    assert saved['result'] == game
    blocks[game['block']].append(game)
assert len(blocks) == 100
for block in blocks.values():
    assert len(block) == 4 and {g['rotation'] for g in block} == set(range(4))
    assert len({g['seed'] for g in block}) == 1
    for leader in leaders:
        players = [p for g in block for p in g['players'] if p['leader'] == leader]
        assert {p['seat'] for p in players} == set(range(4))
        assert {p['turnPosition'] for p in players} == set(range(4))
smoke = json.loads((ROOT / 'smoke/games.json').read_text())
assert len(smoke) == 4 and all(g['driverParity'] and g['replayVerified'] for g in smoke)
assert not {g['seed'] for g in smoke} & {g['seed'] for g in games}


def interval(values):
    mean = statistics.mean(values)
    radius = 1.96 * statistics.stdev(values) / math.sqrt(len(values))
    return [max(0, mean - radius), min(1, mean + radius)]


rows = []
for leader in leaders:
    players = [p for g in games for p in g['players'] if p['leader'] == leader]
    block_shares = [statistics.mean(p['share'] for g in block for p in g['players'] if p['leader'] == leader)
                    for block in blocks.values()]
    rows.append(dict(leader=leader,
                     soleWins=sum(p['winner'] and g['winnerCount'] == 1 for g in games for p in g['players'] if p['leader'] == leader),
                     sharedWins=sum(p['winner'] and g['winnerCount'] > 1 for g in games for p in g['players'] if p['leader'] == leader),
                     winShare=statistics.mean(p['share'] for p in players),
                     winShare95CI=interval(block_shares),
                     averageVP=statistics.mean(p['score'] for p in players),
                     averageRank=statistics.mean(p['rank'] for p in players),
                     winShareByTurnPosition=[statistics.mean(p['share'] for p in players if p['turnPosition'] == i) for i in range(4)]))
turns = [g['players'][0]['turns'] for g in games]
summary = dict(games=400, independentSeedBlocks=100, equalTurns=True,
               winnersPerGame=dict(sorted(collections.Counter(g['winnerCount'] for g in games).items())),
               turnsPerPlayer=dict(mean=statistics.mean(turns), median=statistics.median(turns), minimum=min(turns), maximum=max(turns)),
               endTriggeredBy=dict(collections.Counter(g['endTriggeredBy'] for g in games)), leaders=rows,
               checkpointSHA256=config['checkpointSHA256'])
(ROOT / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
lines = ['# Four-player RL crossplay: 400 games', '',
         'These are the new installed PR #22 models: league Nereon, Thaleia and Doreios, with the unchanged Melia champion. No models were retrained or selected using these results.', '',
         '| Leader | Sole wins | Shared wins | Win share | 95% CI | Mean VP | Mean rank |',
         '|---|---:|---:|---:|---:|---:|---:|']
for row in sorted(rows, key=lambda r: -r['winShare']):
    lo, hi = row['winShare95CI']
    lines.append(f"| {row['leader'].title()} | {row['soleWins']} | {row['sharedWins']} | {row['winShare']:.1%} | {lo:.1%}–{hi:.1%} | {row['averageVP']:.2f} | {row['averageRank']:.2f} |")
lines += ['', 'Win share divides a tied win equally among its winners; the four shares sum to 100%. The equal-share reference is 25%. Shared wins count appearances as a co-winner, not fractional credits. Rank averages tied finishing positions.', '',
          f"Winners per game: {summary['winnersPerGame']}. Turns per player: mean {statistics.mean(turns):.2f}, median {statistics.median(turns):g}, range {min(turns)}–{max(turns)}.", '',
          '## Design and uncertainty', '',
          '100 fresh seed blocks, each played with four rotations of leader seating, for 400 games. Every leader occupies every physical seat and every turn-order position exactly 100 times. The six circular leader orders are balanced as closely as 100 blocks permit (16 or 17 blocks each). Normal production four-player rules and equal turns are enabled; each table has exactly one of each leader. Leader drafting is fixed to isolate play policies.', '',
          'Pointwise 95% intervals are mean ± 1.96 × standard error of the 100 block-level win shares, clipped to [0, 1]. The four rotations within a seed are not treated as independent. These intervals describe fresh-seed variability with these frozen opponents; they are not simultaneous intervals and do not establish intrinsic leader balance independently of policy strength.', '',
          '## Validation and reproduction', '',
          'All 400 games completed, with no exclusions or turn-limit truncation. Every complete event log replayed to exactly the same full final game state. Equal turns, seating coverage, model hashes, result/replay agreement and win-credit totals were audited. Four separate smoke games additionally matched every command against the production TableBotDriver.', '',
          'Frozen configuration: `evaluation.json`; actor hashes and runner hash: `evaluation/protocol.json`; full event logs: `evaluation/replays/*.json.gz`; individual results: `evaluation/games.json`; machine-readable summary: `summary.json`.', '',
          'Run the frozen bundle with `bun balance-results/rl-four-player-v1/runner.js balance-results/rl-four-player-v1/evaluation.json`. Completed games are reused only with an identical protocol. Regenerate this report with `python scripts/rl/report_four_player.py`, inside the project Nix environment.', '',
          '## Starting-position breakdown', '',
          '| Leader | First | Second | Third | Fourth |', '|---|---:|---:|---:|---:|']
for row in rows:
    lines.append('| ' + row['leader'].title() + ' | ' + ' | '.join(f'{x:.1%}' for x in row['winShareByTurnPosition']) + ' |')
lines += ['', 'Each cell contains 100 games. This breakdown is descriptive; no position-specific significance claim is made.', '']
(ROOT / 'REPORT.md').write_text('\n'.join(lines))
print('\n'.join(lines[:14]))
print('All study audits passed.')
