"""Continue the selected Nereon PPO checkpoint; freeze everything except training data."""
import argparse, json, multiprocessing, os, shutil, subprocess, time
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor, as_completed
from pathlib import Path
import numpy as np
import torch
from stable_baselines3.common.logger import configure
from anchored_ppo import AnchoredPPO
from collect_planning_ppo import collect
from collection_jobs import collection_jobs
from episode_ppo_buffer import episode_buffer
from run_nereon_planning_rl import sha, write, export, paired_table

ROOT = Path('balance-results/nereon-more-data-v1')
PRIOR = Path('balance-results/nereon-planning-rl-v1')

def sources():
    paths = [p for d in ['scripts/rl', 'src/lib/game', 'src/lib/bots'] for p in Path(d).rglob('*')
             if p.is_file() and '__pycache__' not in p.parts]
    return {str(p): sha(p) for p in sorted(paths)}

def prepare():
    ROOT.mkdir(exist_ok=False)
    for name in ['chunks', 'trajectories']: (ROOT / name).mkdir()
    selection = json.loads((PRIOR / 'selection.json').read_text())
    assert sha(PRIOR / 'selected.zip') == selection['checkpointSHA256']
    shutil.copyfile(PRIOR / 'selected.zip', ROOT / 'round-00.zip')
    shutil.copyfile(PRIOR / (selection['selected'] + '.rng.pt'), ROOT / 'round-00.rng.pt')
    # Copy the already validated frozen opponents and their internal world models.
    for name in ['actors', 'world.json', 'opponents.json', 'doreios-critic.json', 'thaleia-critic.json']:
        src, dst = PRIOR / name, ROOT / name
        if src.is_dir(): shutil.copytree(src, dst)
        else: shutil.copyfile(src, dst)
    for name in ['world.json', 'opponents.json']:
        p = ROOT / name
        p.write_text(p.read_text().replace(str(PRIOR.resolve()), str(ROOT.resolve())))
    subprocess.run(['bun', 'build', 'scripts/rl/planning_pair_worker.ts', '--target=bun',
                    '--outfile=' + str(ROOT / 'pair-worker.js')], check=True)
    prior = json.loads((PRIOR / 'config.json').read_text())
    c = dict(workers=16, batches=64, gamesPerBatch=64, screenRounds=[16, 32, 64],
             screenGames=256, comparisonGames=400, prefix='nereon-more-data-v1-20261030',
             comparisonPrefix=prior['comparisonPrefix'], initialTrainingGames=512,
             initialCheckpointSHA256=sha(ROOT / 'round-00.zip'),
             sourceCommit=subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
             protocol='Continue the previously selected 512-game checkpoint for 4096 additional games. '
             'Preserve optimizer, RNG, reward (2*split-win-1), 171/128/128/349 architecture, '
             'PPO hyperparameters and frozen opponents. Save all 64 updates. '
             'Screen incumbent and 1024/2048/4096-additional-game checkpoints on 256 matched, '
             'separate games. Select highest candidate screen win share before looking at '
             '400 prior benchmark games. Compare raw RL only to the prior selected raw model; '
             'split ties and cluster paired 95% intervals by four seat rotations. '
             'Benchmark is reused, not globally unseen. No automatic production promotion.')
    write(ROOT / 'config.json', c)
    frozen = [ROOT / 'round-00.zip', ROOT / 'round-00.rng.pt', ROOT / 'pair-worker.js',
              ROOT / 'world.json', ROOT / 'opponents.json', ROOT / 'doreios-critic.json', ROOT / 'thaleia-critic.json',
              PRIOR / 'raw-comparison.json', *sorted((ROOT / 'actors').glob('*.json'))]
    write(ROOT / 'protocol.json', dict(sources=sources(), files={str(p): sha(p) for p in frozen}))
    return c

def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--resume', action='store_true'); args = parser.parse_args()
    if args.resume:
        c = json.loads((ROOT / 'config.json').read_text())
        q = json.loads((ROOT / 'queue.json').read_text())
        try: os.kill(q['pid'], 0)
        except ProcessLookupError: pass
        else: raise RuntimeError('Recorded controller PID still exists; verify before resuming')
        protocol = json.loads((ROOT / 'protocol.json').read_text())
        assert sources() == protocol['sources'], 'Research source drift'
        assert all(sha(Path(p)) == h for p, h in protocol['files'].items()), 'Frozen input drift'
    else: c = prepare()
    write(ROOT / 'queue.json', dict(pid=os.getpid(), started=time.time(), resume=args.resume))
    manifest = ROOT / 'opponents.json'

    def evaluate(label, checkpoint, prefix, games):
        actor = ROOT / (label + '-actor.json'); export(checkpoint, actor)
        m = json.loads(manifest.read_text())
        m['actors']['nereon'] = dict(path=str(actor.resolve()), sha256=sha(actor))
        target = ROOT / (label + '-manifest.json'); write(target, m)
        config = ROOT / (label + '-worker.json'); write(config, dict(leader='nereon', manifest=str(target)))
        def chunk(start):
            path = ROOT / 'chunks' / f'{label}-{start:04}.json'
            if path.exists():
                part = json.loads(path.read_text())
                assert part['manifestSHA256'] == sha(target) and part['prefix'] == prefix and part['start'] == start
            else:
                job = dict(prefix=prefix, start=start, games=4)
                result = subprocess.run(['bun', str(ROOT / 'pair-worker.js'), str(config), json.dumps(job)],
                                        check=True, capture_output=True, text=True)
                part = dict(job, **json.loads(result.stdout), manifestSHA256=sha(target)); write(path, part)
            assert len(part['rows']) == 4 and all(row['replayVerified'] for row in part['rows'])
            return part
        parts = []
        with ThreadPoolExecutor(max_workers=c['workers']) as pool:
            for future in as_completed([pool.submit(chunk, i) for i in range(0, games, 4)]):
                parts.append(future.result())
                print(json.dumps(dict(stage=label, games=4*len(parts), total=games)), flush=True)
        rows = [row for part in sorted(parts, key=lambda p:p['start']) for row in part['rows']]
        assert len({row['seed'] for row in rows}) == games
        write(ROOT / (label + '.json'), rows)
        return rows

    torch.set_num_threads(1)
    done = json.loads((ROOT / 'training-state.json').read_text())['round'] if (ROOT / 'training-state.json').exists() else 0
    reference = AnchoredPPO.load(ROOT / 'round-00', device='cpu'); reference.policy.set_training_mode(False)
    for p in reference.policy.parameters(): p.requires_grad_(False)
    model = AnchoredPPO.load(ROOT / f'round-{done:02}', device='cpu')
    model.reference = reference.policy; model.anchor_coefficient = 0.; model.auxiliary_coefficient = 0.
    model.set_logger(configure(str(ROOT / 'training-metrics'), ['json']))
    rng = torch.load(ROOT / f'round-{done:02}.rng.pt', weights_only=False)
    torch.set_rng_state(rng['torch']); np.random.set_state(rng['numpy'])
    initial_steps = reference.num_timesteps
    # Collect the first update immediately; screen only at fixed milestones.
    with ProcessPoolExecutor(max_workers=c['workers'], mp_context=multiprocessing.get_context('spawn')) as pool:
        for batch in range(1, c['batches']+1):
            if batch <= done:
                if batch in c['screenRounds']:
                    evaluate(f'screen-{batch:02}', ROOT / f'round-{batch:02}', c['prefix']+':screen', c['screenGames'])
                continue
            checkpoint = ROOT / f'round-{batch-1:02}.zip'; metas = []; jobs = []
            for job in collection_jobs(ROOT, batch, checkpoint, manifest, c['prefix']+':train'):
                output = Path(job['output'])
                if output.exists() and output.with_suffix('.json').exists():
                    meta = json.loads(output.with_suffix('.json').read_text())
                    assert all(meta[k] == v for k,v in job.items())
                    assert meta['checkpointSHA256'] == sha(checkpoint) and meta['trajectorySHA256'] == sha(output)
                    metas.append(meta)
                else:
                    if output.exists(): raise RuntimeError('Incomplete trajectory requires inspection: '+str(output))
                    jobs.append(pool.submit(collect, job))
            for future in as_completed(jobs):
                metas.append(future.result()); print(json.dumps(dict(stage='collect', round=batch, games=sum(m['games'] for m in metas), total=64)), flush=True)
            metas.sort(key=lambda m:m['start']); arrays = []
            assert [i for m in metas for i in range(m['start'], m['start']+m['games'])] == list(range((batch-1)*64, batch*64))
            for meta in metas:
                assert all(row['replayVerified'] for row in meta['rows'])
                assert meta['checkpointSHA256'] == sha(checkpoint) and meta['trajectorySHA256'] == sha(Path(meta['output']))
                with np.load(meta['output']) as data: arrays.append(dict(data))
            data = {key:np.concatenate([a[key] for a in arrays]) for key in arrays[0]}
            assert int(data['starts'].sum()) == 64
            model.rollout_buffer = episode_buffer(model, data)
            model.batch_size = 511 if len(data['actions']) % 512 == 1 else 512
            model._current_progress_remaining = 1 - (batch-1)/c['batches']
            model.train(); model.num_timesteps += len(data['actions']); model.logger.dump(model.num_timesteps)
            assert all(torch.isfinite(p).all() for p in model.policy.parameters())
            model.save(ROOT / f'round-{batch:02}')
            torch.save(dict(torch=torch.get_rng_state(), numpy=np.random.get_state()), ROOT / f'round-{batch:02}.rng.pt')
            write(ROOT / 'training-state.json', dict(round=batch, additionalGames=batch*64,
                  additionalDecisions=model.num_timesteps-initial_steps, totalDecisions=model.num_timesteps))
            print(json.dumps(dict(stage='trained', round=batch, additionalGames=batch*64)), flush=True)
            if batch in c['screenRounds']:
                evaluate(f'screen-{batch:02}', ROOT / f'round-{batch:02}', c['prefix']+':screen', c['screenGames'])
    incumbent = evaluate('screen-00', ROOT / 'round-00', c['prefix']+':screen', c['screenGames'])
    screens = {n:json.loads((ROOT / f'screen-{n:02}.json').read_text()) for n in c['screenRounds']}
    shares = {n:sum(row['share'] for row in rows)/len(rows) for n,rows in screens.items()}
    best = max(shares, key=shares.get)
    shutil.copyfile(ROOT / f'round-{best:02}.zip', ROOT / 'selected.zip')
    write(ROOT / 'selection.json', dict(round=best, shares=shares, incumbentShare=sum(r['share'] for r in incumbent)/len(incumbent),
          checkpointSHA256=sha(ROOT / 'selected.zip'), screenTables={n:paired_table(incumbent, rows) for n,rows in screens.items()}))
    parity = evaluate('baseline-parity', ROOT / 'round-00', c['comparisonPrefix'], 16)
    baseline = json.loads((PRIOR / 'raw-comparison.json').read_text())
    for actual, expected in zip(parity, baseline[:16]):
        for key in ['seed', 'block', 'rotation', 'scores', 'turns', 'winnerCount', 'replayVerified']:
            assert actual[key] == expected[key], (key, actual, expected)
    candidate = evaluate('comparison', ROOT / 'selected', c['comparisonPrefix'], c['comparisonGames'])
    baseline = json.loads((PRIOR / 'raw-comparison.json').read_text())
    subprocess.run([os.sys.executable, 'scripts/rl/verify_export.py', '--output', str(ROOT/'export-parity.json'),
                    '--games', '16', '--leaders', 'nereon', '--checkpoint', str(ROOT/'selected'),
                    '--actor', str(ROOT/'comparison-actor.json'), '--opponent', 'planning:'+str(ROOT/'comparison-manifest.json')], check=True)
    results = dict(table=paired_table(baseline, candidate), additionalTrainingGames=4096, selectedRound=best,
                   gamesPerArm=400, reusedBenchmark=True, productionUpdated=False)
    assert sources() == json.loads((ROOT / 'protocol.json').read_text())['sources'], 'Research source changed during run'
    write(ROOT / 'results.json', results); write(ROOT / 'queue-finished.json', dict(time=time.time(), completed=True))
    print(json.dumps(results, indent=2), flush=True)

if __name__ == '__main__': main()
