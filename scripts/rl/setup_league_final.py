"""Freeze final cross-play and MM retention audits before observing their results."""
import hashlib
import itertools
import json
from pathlib import Path

root = Path('balance-results/league-rl-v1')
leaders = ['melia', 'nereon', 'thaleia', 'doreios']

def read(path):
    return json.loads(path.read_text())

def write(path, value):
    if path.exists():
        raise RuntimeError(f'Refusing overwrite: {path}')
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + '\n')

promotions = read(root / 'round-2/promotions.json')
originals = read(root / 'protocol.json')['champions']
configs = []
for a, b in itertools.combinations(leaders, 2):
    actor_path = root / f'actors/r2-{b}.json'
    actor = read(actor_path)
    manifest = root / f'manifests/crossplay-{a}-{b}.json'
    entry = dict(id=f'r2-{b}', leader=b, group='current', weight=1,
                 actor=str(actor_path), actorSHA256=hashlib.sha256(actor_path.read_bytes()).hexdigest(),
                 checkpointSHA256=actor['checkpointSHA256'])
    write(manifest, dict(version=1, learners={a: [entry]}))
    config = root / f'configs/crossplay-{a}-{b}.json'
    write(config, dict(leader=a, teacher='mm' if a == 'melia' else 'classic-engine',
                      opponent=f'league:{manifest}', prefix=f'league-v1-crossplay:{a}:{b}',
                      namespace='test', workers=8, games=512,
                      models={'selected': promotions[a]['checkpoint']},
                      output=str(root / f'crossplay/{a}-{b}')))
    configs.append(str(config))

# Explicit MM retention audit for every non-Melia leader, including Thaleia,
# whose six-opponent reference pool does not itself include MM.
manifest = root / 'manifests/final-mm.json'
write(manifest, dict(version=1, learners={l: [dict(id='mm-melia', leader='melia',
    group='heuristic', weight=1, policy='mm')] for l in leaders if l != 'melia'}))
for leader in leaders[1:]:
    config = root / f'configs/final-mm-{leader}.json'
    write(config, dict(leader=leader, teacher='classic-engine', opponent=f'league:{manifest}',
                      prefix=f'league-v1-mm:{leader}', namespace='test', workers=8, games=1024,
                      models={'v1': originals[leader], 'selected': promotions[leader]['checkpoint']},
                      output=str(root / f'final-mm/{leader}')))
    configs.append(str(config))
write(root / 'final-audit-protocol.json', dict(configs=configs,
    crossplay='Six unordered pairings, 512 games each, equally divided between starting seats; no selection on these results',
    mm='1024 fresh matched games per non-Melia leader versus native MM; report all results and paired intervals',
    release='Do not release a model with an observed MM score-share regression greater than 3 percentage points; no retraining on final seeds'))
