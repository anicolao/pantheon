"""Report only completed, held-out comparisons; never promote from these results."""
import json,math,sys
from pathlib import Path
from statistics import mean,stdev
run=Path(sys.argv[1])
if (run/'invalidated.json').exists():raise RuntimeError('This run is invalidated')
results=json.loads((run/'results.json').read_text())
lines=['# Echo/Zeus RL pilot','',
 'Four-player games containing Echo plus three original leaders. Each row compares one learner with its own baseline against the same frozen opponents on 384 fresh games (96 four-seat seed blocks). Rows are separate matchups and do not sum to 100%.',
 '', '| Learner | Baseline share | Selected share | Paired change (approx. 95% CI) | Selected checkpoint |',
 '|---|---:|---:|---:|---|']
paired={}
for leader,result in results.items():
    folder=run/leader;before=json.loads((folder/'bc-test.json').read_text());after=json.loads((folder/(result['selected']+'-test.json')).read_text())
    assert len(before)==len(after)==384
    blocks={}
    for a,b in zip(after,before,strict=True):
        assert a['seed']==b['seed'] and a['seat']==b['seat'] and a['replayVerified'] and b['replayVerified']
        blocks.setdefault(a['block'],[]).append(a['share']-b['share'])
    assert all(len(v)==4 for v in blocks.values())
    ds=[mean(v) for v in blocks.values()];delta=mean(ds);half=1.96*stdev(ds)/math.sqrt(len(ds))
    paired[leader]=dict(delta=delta,approximate95CI=[delta-half,delta+half],confirmedImprovement=delta-half>0)
    lines.append(f"| {leader.title()} | {100*result['baseline']['share']:.1f}% | {100*result['candidate']['share']:.1f}% | {100*delta:+.1f} pp ({100*(delta-half):+.1f}, {100*(delta+half):+.1f}) | {result['selected']} |")
lines+=['','Selection used screening seeds only. Confirmation intervals cluster seats by game seed and do not measure variation between independent learner initializations. No production promotion has been made.', '',f'Completed comparisons: {len(results)}/5. Checkpoint and source identities are in `protocol.json`, `frozen-round-1.json`, and each leader’s selection file.']
(run/'paired-results.json').write_text(json.dumps(paired,indent=2))
(run/'REPORT.md').write_text('\n'.join(lines)+'\n')
print('\n'.join(lines))
