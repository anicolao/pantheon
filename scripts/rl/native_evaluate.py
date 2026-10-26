"""Evaluate a frozen checkpoint in the actual exported actor runtime, without per-step Python IPC."""
import json,subprocess,sys,tempfile,hashlib
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

def evaluate_native(checkpoint,manifest,prefix,namespace,games,workers,leader='doreios',observation_kind='public-v1',worker='scripts/rl/native_evaluate_worker.ts'):
    assert games>0 and workers>0 and games%workers==0
    manifest=manifest.removeprefix('four:')
    with tempfile.TemporaryDirectory(prefix='pantheon-native-eval-') as directory:
        root=Path(directory);actor=root/'actor.json'
        options=['--observation-kind',observation_kind] if observation_kind else []
        subprocess.run([sys.executable,'scripts/rl/export_actor.py',str(checkpoint),leader,str(actor),*options],check=True,capture_output=True,text=True)
        frozen=json.loads(Path(manifest).read_text());frozen['actors'][leader]=dict(path=str(actor),sha256=hashlib.sha256(actor.read_bytes()).hexdigest())
        (root/'manifest.json').write_text(json.dumps(frozen)+'\n');(root/'worker.json').write_text(json.dumps(dict(leader=leader,manifest=str(root/'manifest.json')))+'\n')
        def run(rank):
            job=dict(rank=rank,workers=workers,games=games//workers,prefix=prefix,namespace=namespace)
            result=subprocess.run(['bun',worker,str(root/'worker.json'),json.dumps(job)],capture_output=True,text=True)
            if result.returncode:raise RuntimeError('Native evaluation failed; no games excluded:\n'+result.stderr)
            rows=json.loads(result.stdout);assert len(rows)==job['games'] and all(x['replayVerified'] for x in rows)
            return rows
        with ThreadPoolExecutor(max_workers=workers) as pool:rows=[row for group in pool.map(run,range(workers)) for row in group]
    rows.sort(key=lambda r:int(r['seed'].rsplit(':',1)[1]));assert len(rows)==games and len({x['seed'] for x in rows})==games
    return rows
