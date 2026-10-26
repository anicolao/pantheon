"""Independent integrity and paired-statistics audit; run after the controller finishes."""
import hashlib
import json
import math
import statistics
from pathlib import Path

root = Path(__file__).resolve().parent
repo = root.parent.parent
read = lambda path: json.loads(path.read_text())
digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
config = read(root / 'config.json')
protocol = read(root / 'protocol.json')
assert read(root / 'queue-finished.json')['completed']
assert all(digest(repo / path) == value for path, value in protocol['scriptSHA256'].items())
baseline_path = repo / config['baselineSource']
assert digest(baseline_path) == protocol['baselineSHA256']
selection = read(root / 'selection.json')
assert digest(root / 'selected.zip') == selection['checkpointSHA256']
assert digest(root / (selection['selected'] + '.zip')) == selection['checkpointSHA256']

train_seeds = set()
decisions = 0
for path in sorted((root / 'trajectories').glob('*.json')):
    chunk = read(path)
    assert digest(repo / chunk['checkpoint']) == chunk['checkpointSHA256']
    assert digest(repo / chunk['output']) == chunk['trajectorySHA256']
    decisions += chunk['decisions']
    assert len(chunk['rows']) == 4
    for row in chunk['rows']:
        assert row['replayVerified'] and row['seed'] not in train_seeds
        train_seeds.add(row['seed'])
assert train_seeds == {config['prefix'] + ':train:' + str(i) for i in range(1024)}
assert decisions == read(root / 'training-state.json')['decisions']
screen_seeds = {config['prefix'] + ':screen:' + str(i) for i in range(128)}
for name in ['incumbent', 'round-08', 'round-16']:
    rows = read(root / (name + '-screen.json'))
    assert len(rows) == 128 and {r['seed'] for r in rows} == screen_seeds
    assert all(r['replayVerified'] for r in rows)

arms = {'original': read(baseline_path)}
for name in ['raw', 'planned']:
    rows = read(root / (name + '-comparison.json'))
    chunks = [read(root / 'chunks' / f'{name}-{i}.json') for i in range(0, 400, 4)]
    assert rows == [r for chunk in chunks for r in chunk['rows']]
    assert all(chunk['manifestSHA256'] == digest(root / (name + '-manifest.json')) for chunk in chunks)
    arms[name] = rows
comparison_seeds = {config['comparisonPrefix'] + ':' + str(i) for i in range(400)}
assert not (train_seeds & screen_seeds or train_seeds & comparison_seeds or screen_seeds & comparison_seeds)
for rows in arms.values():
    assert len(rows) == 400 and {r['seed'] for r in rows} == comparison_seeds
    for index, row in enumerate(rows):
        assert row['seed'] == config['comparisonPrefix'] + ':' + str(index)
        assert row['block'] == index // 4 and row['rotation'] == index % 4
        assert row['replayVerified'] and set(row['scores']) == {'melia', 'nereon', 'thaleia', 'doreios'}

def credits(rows, leader):
    values = []
    for row in rows:
        best = max(row['scores'].values())
        winners = [name for name, value in row['scores'].items() if value == best]
        values.append(1 / len(winners) if leader in winners else 0)
    return [statistics.mean(values[i:i+4]) for i in range(0, 400, 4)]

def check_stat(record, samples):
    mean = statistics.mean(samples)
    half = 1.96 * statistics.stdev(samples) / math.sqrt(100)
    assert record == {'share': mean, 'CI95': [mean-half, mean+half]}

results = read(root / 'results.json')
for label, before, after in [('rawVsOriginal', 'original', 'raw'), ('plannerVsRaw', 'raw', 'planned'), ('plannerVsOriginal', 'original', 'planned')]:
    for leader, record in results[label].items():
        a, b = credits(arms[before], leader), credits(arms[after], leader)
        check_stat(record['before'], a)
        check_stat(record['after'], b)
        check_stat(record['paired'], [y-x for x, y in zip(a, b)])

output = dict(trainingGames=1024, trainingDecisions=decisions, screeningGames=384,
              comparisonGamesPerArm=400, newComparisonGames=800, baselineGamesReused=400,
              comparisonSeedBlocks=100, allActualGamesReplayVerified=True,
              disjointTrainingScreeningComparisonSeeds=True, allSourceAndModelHashesVerified=True,
              independentlyRecomputedPairedStatisticsExact=True, productionUpdated=False)
(root / 'final-audit.json').write_text(json.dumps(output, indent=2) + '\n')
print(json.dumps(output, indent=2))
