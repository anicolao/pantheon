"""Finish validation after a running trainer writes its complete selected field."""
import json,os,subprocess,sys,time
from pathlib import Path
run=Path(sys.argv[1]).resolve();pid=int(sys.argv[2])
while not (run/'selected-field.json').exists():
    try:os.kill(pid,0)
    except ProcessLookupError:raise RuntimeError('Trainer stopped before completion; inspect its log and retain all partial artifacts')
    time.sleep(10)
subprocess.run([sys.executable,'scripts/rl/echo/verify_transfer.py',str(run)],check=True)
subprocess.run([sys.executable,'scripts/rl/echo/report.py',str(run)],check=True)
subprocess.run(['bun','scripts/rl/echo/tournament.ts',str(run),'400','16'],check=True)
fields={}
for name in ['frozen-round-1','selected-field']:
    rows=json.loads((run/'crossplay'/name/'results.json').read_text());stats={}
    assert len(rows)==400 and all(r['replayVerified'] for r in rows)
    for row in rows:
        winners=sum(p['winner'] for p in row['field'])
        for player in row['field']:
            s=stats.setdefault(player['leader'],dict(appearances=0,winCredits=0.))
            s['appearances']+=1;s['winCredits']+=1/winners if player['winner'] else 0
    for s in stats.values():s['shareWhenPresent']=s['winCredits']/s['appearances']
    fields[name]=stats
(run/'crossplay'/'summary.json').write_text(json.dumps(fields,indent=2))
print(json.dumps(dict(stage='pilot-complete',crossplay=fields)),flush=True)
