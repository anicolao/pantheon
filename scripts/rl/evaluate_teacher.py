"""Independent whole-game workers for expensive heuristic teachers (no step barrier)."""
import argparse,json,time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from train import Game,stats

def run(c):
    out=Path(c['output']);out.mkdir(parents=True,exist_ok=True)
    if (out/'results.json').exists():raise RuntimeError('Refusing overwrite')
    (out/'protocol.json').write_text(json.dumps(c,indent=2));started=time.monotonic()
    workers=c.get('workers',8);assert c['games']%workers==0
    def worker(rank):
        env=Game(rank,workers,c['namespace'],c['prefix'],leader=c['leader'],teacher=c['teacher'],opponent=c.get('opponent','mm'));rows=[]
        try:
            for i in range(c['games']//workers):
                env.reset();done=False
                while not done:_,reward,done,_,info=env.step(env.teacher())
                rows.append(dict(**info,reward=reward))
                if (i+1)%32==0:print(json.dumps(dict(worker=rank,games=i+1)),flush=True)
        finally:env.close()
        return rows
    with ThreadPoolExecutor(max_workers=workers) as pool:rows=[r for chunk in pool.map(worker,range(workers)) for r in chunk]
    rows.sort(key=lambda r:int(r['seed'].rsplit(':',1)[1]));assert len({r['seed'] for r in rows})==c['games']
    (out/'teacher.json').write_text(json.dumps(rows));result=dict(summary={'teacher':stats(rows)},elapsedSeconds=time.monotonic()-started)
    (out/'results.json').write_text(json.dumps(result,indent=2));print(json.dumps(result),flush=True)
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('config');args=p.parse_args();run(json.loads(Path(args.config).read_text()))
