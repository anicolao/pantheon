"""Verify singleton scheduling reproduces saved grouped trajectories exactly."""
import json, multiprocessing, sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
import numpy as np
from collect_planning_ppo import collect
from run_nereon_planning_rl import sha, write


def main():
    source, destination = map(Path, sys.argv[1:])
    original = json.loads(source.read_text())
    assert original['games'] == 4
    assert sha(Path(original['output'])) == original['trajectorySHA256']
    destination.mkdir(exist_ok=False)
    jobs = [dict(checkpoint=original['checkpoint'], manifest=original['manifest'], prefix=original['prefix'],
                 start=i, games=1, output=str(destination / f'{i:05}.npz'))
            for i in range(original['start'], original['start']+4)]
    with ProcessPoolExecutor(max_workers=4, mp_context=multiprocessing.get_context('spawn')) as pool:
        metas = list(pool.map(collect, jobs))
    arrays = []
    for meta in metas:
        with np.load(meta['output']) as data: arrays.append(dict(data))
    with np.load(original['output']) as before:
        for key in before.files:
            after = np.concatenate([a[key] for a in arrays])
            assert np.array_equal(before[key], after), 'Trajectory mismatch: ' + key
    assert [row for m in metas for row in m['rows']] == original['rows'], 'Outcome mismatch'
    write(destination / 'parity.json', dict(games=4, decisions=original['decisions'], exactArrays=True,
          exactOutcomes=True, fullReplayVerified=True, originalSHA256=sha(source),
          originalTrajectorySHA256=original['trajectorySHA256'], singletonTrajectories={m['output']:m['trajectorySHA256'] for m in metas}))
    print('PASS: singleton and grouped collection have identical observations, masks, actions, values, log probabilities, rewards, episode boundaries and outcomes.', flush=True)

if __name__ == '__main__': main()
