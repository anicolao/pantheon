"""Finish the preregistered two-round pilot after round-one Money guards complete.

Run under Nix with the RL Python environment. Each phase stops on failure;
completed evaluations are retained, and no production weights are exported.
"""
import json
import subprocess
import sys
from pathlib import Path

root = Path('balance-results/league-rl-v1')
leaders = ['nereon', 'thaleia', 'doreios', 'melia']

def call(script, *args):
    print(json.dumps(dict(phase=script, args=list(map(str, args)))), flush=True)
    subprocess.run([sys.executable, f'scripts/rl/{script}', *map(str, args)], check=True)

def jobs(script, paths):
    pending = []
    for path in paths:
        if not path.exists():
            continue
        config = json.loads(path.read_text())
        output = Path(config['output'])
        if not (output / 'results.json').exists():
            pending.append(path)
    if pending:
        call('run_jobs.py', f'scripts/rl/{script}', *pending)

for leader in leaders:
    if not (root / f'round-1/money-{leader}/results.json').exists():
        raise RuntimeError('Round-one Money guards must finish first')
if not (root / 'round-1/promotions.json').exists():
    call('advance_league.py', 1)
jobs('continue_training.py', [root / f'configs/train-r2-{l}.json' for l in leaders])
if not (root / 'round-2/selection.json').exists():
    call('league_round.py', 'select', 2)
jobs('evaluate_checkpoints.py', [root / f'configs/confirm-r2-{l}.json' for l in leaders])
if not (root / 'round-2/reference-gates.json').exists():
    call('league_round.py', 'gate', 2)
guards = [root / f'configs/money-r2-{l}.json' for l in leaders]
for path in guards:
    if path.exists():
        config = json.loads(path.read_text())
        config['workers'] = 8
        path.write_text(json.dumps(config, indent=2) + '\n')
jobs('evaluate_independent.py', guards)
if not (root / 'round-2/promotions.json').exists():
    call('advance_league.py', 2)
if not (root / 'final-audit-protocol.json').exists():
    call('setup_league_final.py')
jobs('evaluate_checkpoints.py', [root / f'configs/final-{l}.json' for l in leaders])
audit = json.loads((root / 'final-audit-protocol.json').read_text())
jobs('evaluate_independent.py', [Path(p) for p in audit['configs']])
for leader in leaders:
    output = root / f'validation/final-export-{leader}.json'
    if not output.exists():
        call('verify_export.py', '--leaders', leader, '--checkpoint', root / f'champions/round-2/{leader}',
             '--actor', root / f'actors/r2-{leader}.json', '--games', 128,
             '--opponent', f'league:{root}/manifests/reference.json', '--output', output)
print('Two-round pilot and final evaluations complete. Production weights unchanged.', flush=True)
