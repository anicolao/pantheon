"""Schedule individual episodes while retaining completed legacy four-game chunks."""
from pathlib import Path


def collection_jobs(root, batch, checkpoint, manifest, prefix):
    start, end = (batch - 1) * 64, batch * 64
    while start < end:
        legacy = root / 'trajectories' / f'{start:05}.npz'
        if start % 4 == 0 and (legacy.exists() or legacy.with_suffix('.json').exists()):
            output, games = legacy, 4
        else:
            output, games = root / 'trajectories' / f'game-{start:05}.npz', 1
        # Never silently replace incomplete evidence after an interruption.
        if output.exists() != output.with_suffix('.json').exists():
            raise RuntimeError('Incomplete trajectory requires inspection: ' + str(output))
        yield dict(checkpoint=str(checkpoint), manifest=str(manifest), prefix=prefix,
                   start=start, games=games, output=str(output))
        start += games
