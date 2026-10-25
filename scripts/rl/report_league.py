"""Audit completed league rows and summarize the pilot without changing models."""
import hashlib
import json
from pathlib import Path
from train import stats, paired

root = Path('balance-results/league-rl-v1')
leaders = ['melia', 'nereon', 'thaleia', 'doreios']
def read(path):
    return json.loads(path.read_text())

verified = 0
def audit(directory):
    global verified
    protocol = read(directory / 'protocol.json')
    manifest_bytes = Path(protocol['opponent'][7:]).read_bytes()
    manifest = json.loads(manifest_bytes)
    entries = manifest['learners'][protocol['leader']]
    schedule = [entry for entry in entries for _ in range(entry['weight'])]
    league_hash = hashlib.sha256(manifest_bytes).hexdigest()
    rows_by_model = {}
    results = read(directory / 'results.json')
    for name, checkpoint in protocol['models'].items():
        assert hashlib.sha256(Path(checkpoint + '.zip').read_bytes()).hexdigest() == results['checkpointSHA256'][name]
        rows = read(directory / f'{name}.json')
        assert len(rows) == protocol['games']
        for i, row in enumerate(rows):
            opponent = schedule[(i // 2) % len(schedule)]
            assert row['seed'] == f"{protocol['prefix']}:{protocol['namespace']}:{i}"
            assert row['first'] == (i % 2 == 0)
            assert row['replayVerified'] and row['leagueSHA256'] == league_hash
            assert row['opponentId'] == opponent['id']
            assert row['opponentCheckpointSHA256'] == opponent.get('checkpointSHA256')
            assert row['reward'] == row['outcome'] and row['reward'] in (-1, 0, 1)
            verified += 1
        assert stats(rows) == results['summary'][name]
        rows_by_model[name] = rows
    names = list(rows_by_model)
    for i, name in enumerate(names):
        for other in names[:i]:
            if results['checkpointSHA256'][name] == results['checkpointSHA256'][other]:
                assert rows_by_model[name] == rows_by_model[other], 'Same model and seeds produced different games'
    return rows_by_model

summary = dict(rounds={}, final={}, crossplay={}, mm={}, verifiedFinalGames=0)
for r in (1, 2):
    promotions = read(root / f'round-{r}/promotions.json')
    summary['rounds'][str(r)] = {l: dict(promoted=p['promoted'], checkpointSHA256=p['checkpointSHA256'],
        source=p['source'], referenceGate=p['referenceGate'], moneyGuard=p['moneyGuard']) for l,p in promotions.items()}
for leader in leaders:
    rows = audit(root / f'final/{leader}')
    exported = read(root / f'validation/final-export-{leader}.json')
    selected_hash = summary['rounds']['2'][leader]['checkpointSHA256']
    assert exported['exactCommandParity'] and exported['replayVerified']
    assert exported['checkpointSHA256'] == selected_hash
    assert read(root / f'final/{leader}/results.json')['checkpointSHA256']['selected'] == selected_hash
    old, new = stats(rows['v1']), stats(rows['selected'])
    delta = paired(rows['selected'], rows['v1'])
    matchup_deltas = {k: new['matchups'][k]['share'] - v['share'] for k,v in old['matchups'].items()}
    mm_delta = 0
    if leader != 'melia':
        mm = audit(root / f'final-mm/{leader}')
        comparison = paired(mm['selected'], mm['v1'])
        mm_delta = comparison['shareDelta']
        summary['mm'][leader] = dict(v1=stats(mm['v1']), selected=stats(mm['selected']), comparison=comparison)
    summary['final'][leader] = dict(v1=old, selected=new, comparison=delta, matchupShareDeltas=matchup_deltas,
        recommended=delta['pairedApprox95CI'][0] > 0 and min(matchup_deltas.values()) >= -.03 and mm_delta >= -.03)
for config in read(root / 'final-audit-protocol.json')['configs']:
    c = read(Path(config))
    if '/crossplay/' in c['output']:
        rows = audit(Path(c['output']))['selected']
        summary['crossplay'][Path(c['output']).name] = stats(rows)
summary['verifiedFinalGames'] = verified
summary['additionalTrainingDecisions'] = sum(read(root/f'round-{r}/{l}/results.json')['trainingSteps'] for r in (1,2) for l in leaders)
summary['productionWeightsChanged'] = False
summary['exportParity'] = {l: {k: v for k,v in read(root / f'validation/final-export-{l}.json').items() if k != 'workers'} for l in leaders}
summary['limitations'] = ['Heads-up only; no multiplayer claim.',
    'One training lineage per leader; intervals cover game-seed variation, not variation between independent training runs.',
    'Fixed reference pools differ by leader; aggregate rates do not rank leaders.',
    'Intervals are pointwise, approximate 95% intervals, not simultaneous family-wise guarantees.',
    'Observed three-point regression screens do not establish statistical noninferiority.',
    'Final cross-play describes the four frozen research champions, including any model not recommended for release.']
(root/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
lines = ['Two-round RL league pilot', '', f"Additional training decisions: {summary['additionalTrainingDecisions']:,}",
         f'Final games replay-verified and audited: {verified:,}', '',
         'Fixed-reference score share (ties count half):']
for l,d in summary['final'].items():
    lo,hi=d['comparison']['pairedApprox95CI']
    lines.append(f"{l}: {d['v1']['share']:.1%} -> {d['selected']['share']:.1%}; delta {100*d['comparison']['shareDelta']:+.2f} pp, 95% CI [{100*lo:+.2f}, {100*hi:+.2f}]; recommend={d['recommended']}")
lines += ['', 'MM retention:']
for l,d in summary['mm'].items():
    lines.append(f"{l}: {d['v1']['share']:.1%} -> {d['selected']['share']:.1%}; selected outright wins {d['selected']['wins']}/{d['selected']['games']}")
lines += ['', 'Frozen research-champion cross-play (first leader score share):']
for pair,d in summary['crossplay'].items():
    lines.append(f"{pair}: {d['share']:.1%}, {d['wins']}W/{d['ties']}T/{d['losses']}L")
lines += ['', 'Production weights unchanged pending review.', *summary['limitations']]
(root/'report.txt').write_text('\n'.join(lines)+'\n')
print('\n'.join(lines))
