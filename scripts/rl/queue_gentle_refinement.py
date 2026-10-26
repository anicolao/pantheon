"""Refine the strongest audited v30/v32/v27 actor after existing jobs finish."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
import uuid


def write(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')


def main():
    root = Path('balance-results/doreios-four-rl-v35')
    root.mkdir(exist_ok=False)
    gates = [Path(f'balance-results/doreios-four-rl-v{n}') for n in [27, 32]]
    write(root/'queue.json', dict(pid=os.getpid(), time=time.time(), gates=[str(p) for p in gates],
        plan='After full audits, choose highest fresh share among confirmed v30/v32/v27 candidates. Two lower-rate PPO arms, pure win and pure margin8; new screening and confirmation seeds. No deployment.'))
    for gate in gates:
        while not (gate/'queue-finished.json').exists():
            time.sleep(10)
        assert json.loads((gate/'queue-finished.json').read_text())['completed']
    options = []
    for n in [30, 32, 27]:
        source = Path(f'balance-results/doreios-four-rl-v{n}')
        result = json.loads((source/'results.json').read_text())
        audit = json.loads((source/'audit.json').read_text())
        assert audit['browserRuntimeMatchesReferenceOutcomes'] and audit['replaysVerified'] == 12800
        if result['improvementConfirmed']:
            options.append((result['candidate']['share'], source))
    _, source = max(options, key=lambda x: x[0])
    while shutil.disk_usage('.').free < 1024**3:
        time.sleep(30)
    template = Path('balance-results/doreios-four-rl-v27')
    shutil.copyfile(source/'selected.zip', root/'incumbent.zip')
    shutil.copyfile(source/'selected.zip', root/'training-base.zip')
    shutil.copytree(source/'actors', root/'actors')
    shutil.copyfile(source/'candidate.json', root/'actors/doreios.json')
    shutil.copyfile(template/'native-evaluate-worker.js', root/'native-evaluate-worker.js')
    manifest = json.loads((template/'opponents-evaluation.json').read_text())
    for leader, entry in manifest['actors'].items():
        path = root/'actors'/f'{leader}.json'
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if leader != 'doreios':
            assert entry['sha256'] == digest, 'Frozen opponent changed'
        entry['path'] = str(path.resolve())
        entry['sha256'] = digest
    write(root/'opponents-evaluation.json', manifest)
    write(root/'base-selection.json', dict(source=str(source), options=[dict(share=s, source=str(p)) for s,p in options],
        checkpointSHA256=hashlib.sha256((root/'incumbent.zip').read_bytes()).hexdigest()))
    config = json.loads((template/'config.json').read_text())
    config.update(output=str(root), base=str(root/'incumbent'), trainingBase=str(root/'training-base'),
        opponent='four:'+str(root/'opponents-evaluation.json'), nativeWorker=str(root/'native-evaluate-worker.js'),
        prefix='d4r35-'+uuid.uuid4().hex[:12], seed=8435, workers=8, learningRate=.00003,
        steps=4194304, reward='Pure win versus pure terminal margin8 at reduced learning rate',
        selection='Choose strongest fully audited confirmed v30/v32/v27 candidate before training. Two2097152-decision arms at learningRate3e-5, entropy.003, GAE.95; purewin or puremargin8. Common512 screening;freeze before6400 fresh pairedgames/model. Independent runtime/fullreplay audit and64 export parity games. No deployment.')
    write(root/'config.json', config)
    write(root/'campaign.json', dict(arms=['win', 'margin']))
    for name, weight in [('win', 1), ('margin', 0)]:
        arm = root/name
        arm.mkdir()
        write(arm/'opponents-training.json', dict(manifest, reward=dict(kind='score-margin', scale=8, winWeight=weight)))
        write(arm/'config.json', dict(config, output=str(arm), opponent='four:'+str(arm/'opponents-training.json'),
            evaluationOpponent=config['opponent'], workers=4, steps=2097152, screenOnly=True, includeTrainingBase=True))
    for path in ['scripts/rl', 'src/lib/bots', 'src/lib/game', 'standard-matrix', 'balance-checkpoint/equal-turns/source/scripts/balance']:
        shutil.copytree(path, root/'source'/path, ignore=shutil.ignore_patterns('__pycache__'), dirs_exist_ok=True)
    processes = []
    for name in ['win', 'margin']:
        log = open(root/f'{name}.log', 'w')
        process = subprocess.Popen([sys.executable, 'scripts/rl/train_four.py', str(root/name/'config.json')], stdout=log, stderr=subprocess.STDOUT)
        processes.append((process, log))
    errors = []
    for process, log in processes:
        code = process.wait()
        log.close()
        if code:
            errors.append(dict(pid=process.pid, code=code))
    if errors:
        raise RuntimeError(str(errors))
    for script, label in [('confirm_four_campaign.py', 'confirm'), ('audit_four_campaign.py', 'audit')]:
        with open(root/f'{label}.log', 'w') as log:
            subprocess.run([sys.executable, 'scripts/rl/'+script, str(root)], stdout=log, stderr=subprocess.STDOUT, check=True)
    write(root/'queue-finished.json', dict(completed=True, time=time.time()))


if __name__ == '__main__':
    main()
