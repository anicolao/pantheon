"""Audit the frozen paired matrix and emit review tables with seed-clustered uncertainty."""
import csv,gzip,hashlib,json,math,statistics,subprocess,sys
from pathlib import Path

root=Path('balance-results/league-review-v1')
if not (root/'evaluation/replays').exists():
    subprocess.run([sys.executable,'scripts/rl/archive_review_replays.py','unpack'],check=True)
protocol=json.loads((root/'evaluation/protocol.json').read_text())
rows=json.loads((root/'evaluation/games.json').read_text())
completion=json.loads((root/'evaluation/completion.json').read_text())
entries={e['id']:e for e in protocol['entries']}
leaders=['melia','nereon','thaleia','doreios']
assert len(protocol['seeds'])==len(set(protocol['seeds']))==100
assert completion['games']==len(rows)==18600 and completion['matches']==186
assert hashlib.sha256((root/'runner.js').read_bytes()).hexdigest()==protocol['runnerSHA256']==completion['runnerSHA256']
for e in entries.values():
    if 'actor' in e:
        assert hashlib.sha256(Path(e['actor']).read_bytes()).hexdigest()==e['actorSHA256']
        assert json.loads(Path(e['actor']).read_text())['checkpointSHA256']==e['checkpointSHA256']
        if e['generation']=='new':
            assert Path(f"src/lib/bots/models/{e['leader']}.json").read_bytes()==Path(e['actor']).read_bytes()
groups={}
for row in rows:
    assert row['seed']==protocol['seeds'][row['index']] and row['replayVerified']
    assert row['aFirst']==(row['index']%2==0) and row['aShare'] in (0,.5,1)
    groups.setdefault((row['a'],row['b']),[]).append(row)
assert len(groups)==186
for match in protocol['matches']:
    group=groups[(match['a']['id'],match['b']['id'])]
    assert sorted(r['index'] for r in group)==list(range(100))
    assert sum(r['aFirst'] for r in group)==50
    group.sort(key=lambda r:r['index'])

def oriented(a,b):
    if (a,b) in groups:
        return [dict(seed=r['seed'],share=r['aShare'],score=r['aScore'],opponentScore=r['bScore'],first=r['aFirst']) for r in groups[a,b]]
    return [dict(seed=r['seed'],share=1-r['aShare'],score=r['bScore'],opponentScore=r['aScore'],first=not r['aFirst']) for r in groups[b,a]]

def interval(values,clamp=False):
    mean=statistics.mean(values);half=1.959963984540054*statistics.stdev(values)/math.sqrt(len(values))
    return [max(0,mean-half),min(1,mean+half)] if clamp else [mean-half,mean+half]

def stats(values):
    n=len(values);w=values.count(1);t=values.count(.5);p=w/n;z=1.959963984540054;d=1+z*z/n
    center=(p+z*z/(2*n))/d;half=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d
    return dict(games=n,wins=w,ties=t,losses=n-w-t,share=statistics.mean(values),shareCI95=interval(values,True),winRate=p,winCI95=[center-half,center+half])

rl=[f'{generation}-{leader}' for generation in ['old','new'] for leader in leaders]
matrix={a:{b:stats([r['share'] for r in oriented(a,b)]) for b in entries if entries[a]['leader']!=entries[b]['leader']} for a in rl}
# The unchanged Melia actor is a control for pairing, worker isolation, and determinism.
assert entries['old-melia']['checkpointSHA256']==entries['new-melia']['checkpointSHA256']
for b in matrix['old-melia']:
    assert oriented('old-melia',b)==oriented('new-melia',b),f'Identical Melia control changed versus {b}'
    for i in range(100):
        records=[]
        for generation in ['old','new']:
            with gzip.open(root/f'evaluation/replays/{generation}-melia--{b}/{i}.json.gz','rt') as f:
                records.append(json.load(f)['record'])
        assert records[0]['config']==records[1]['config'] and records[0]['commands']==records[1]['commands'],f'Melia control command drift: {b}/{i}'

summary={}
paired_cells={}
for leader in leaders:
    paired_cells[leader]={}
    for opponent in matrix[f'old-{leader}']:
        before=[r['share'] for r in oriented(f'old-{leader}',opponent)]
        after=[r['share'] for r in oriented(f'new-{leader}',opponent)]
        changes=[b-a for a,b in zip(before,after)]
        paired_cells[leader][opponent]=dict(oldShare=statistics.mean(before),newShare=statistics.mean(after),
            shareDelta=statistics.mean(changes),paired95CI=interval(changes),gamesPerGeneration=100)
    pools={
        'allHeuristics':[e['id'] for e in entries.values() if 'policy' in e and e['leader']!=leader],
        'commonHeuristics':[e['id'] for e in entries.values() if e.get('policy') in ['mm','money','engine','classic-engine','owl','mn'] and e['leader']!=leader],
        'oldRL':[f'old-{l}' for l in leaders if l!=leader],
        'newRL':[f'new-{l}' for l in leaders if l!=leader],
    }
    summary[leader]={}
    for name,opponents in pools.items():
        values={g:[[r['share'] for r in oriented(f'{g}-{leader}',b)] for b in opponents] for g in ['old','new']}
        clustered={g:[statistics.mean(v[i] for v in values[g]) for i in range(100)] for g in values}
        changes=[b-a for a,b in zip(clustered['old'],clustered['new'])]
        summary[leader][name]=dict(opponents=opponents,gamesPerGeneration=100*len(opponents),
            oldShare=statistics.mean(clustered['old']),newShare=statistics.mean(clustered['new']),
            shareDelta=statistics.mean(changes),pairedCluster95CI=interval(changes),seedClusters=100)

result=dict(games=len(rows),matches=len(groups),seeds=100,matrix=matrix,summary=summary,pairedMatchups=paired_cells,
    identicalMeliaControl=True,sourceRunnerSHA256=protocol['runnerSHA256'],
    caveats=['Heads-up only; same-leader and heuristic/heuristic matches are not run.',
      'All comparisons use the same 100 fresh seeds. Aggregate intervals cluster by seed; do not treat every game as independent.',
      'Per-cell win intervals are Wilson; share and paired aggregate intervals are approximate 95% intervals.',
      'No correction for multiple comparisons. 100 games per cell support a review screen, not precise rankings.',
      'MM, Owl, and MN are evaluated outside their intended leaders to match the prior tournament roster.',
      'Melia is unchanged; Nereon is included for review despite its earlier conservative MM regression-screen miss.'])
(root/'results.json').write_text(json.dumps(result,indent=2)+'\n')
with (root/'matrix.csv').open('w',newline='') as f:
    writer=csv.writer(f);writer.writerow(['row','opponent','games','wins','ties','losses','share','share_ci_low','share_ci_high','win_rate','win_ci_low','win_ci_high'])
    for a,cols in matrix.items():
        for b,s in cols.items():writer.writerow([a,b,s['games'],s['wins'],s['ties'],s['losses'],s['share'],*s['shareCI95'],s['winRate'],*s['winCI95']])
with (root/'paired-changes.csv').open('w',newline='') as f:
    writer=csv.writer(f);writer.writerow(['leader','opponent','games_per_generation','old_share','new_share','share_delta','paired_ci_low','paired_ci_high'])
    for leader,cells in paired_cells.items():
        for opponent,s in cells.items():writer.writerow([leader,opponent,s['gamesPerGeneration'],s['oldShare'],s['newShare'],s['shareDelta'],*s['paired95CI']])

lines=['# League weights: fresh-seed review matrix','',
    '18,600 completed, replay-verified games: 186 legal pairings × 100 fresh seeds, with 50 starts per side. No excluded games.',
    'The same seeds and leader-specific physical seats are used across old/new comparisons. No matrix seeds were used to train or select these checkpoints.','',
    '**Cells are score share: a win counts 1, a tie ½, a loss 0.** “—” means the same leader, which the game draft does not permit. Mirror RL cells refer to the same games.',
    'Full W/T/L counts and per-cell 95% intervals are in [matrix.csv](matrix.csv). [paired-changes.csv](paired-changes.csv) gives matched old/new changes and intervals for each opponent; [results.json](results.json) includes all summaries.','',
    '## Paired change against the complete heuristic roster','',
    '| Leader | Old share | New share | Change | Paired 95% CI |',
    '|---|---:|---:|---:|---:|']
for l in leaders:
    s=summary[l]['allHeuristics'];lo,hi=s['pairedCluster95CI']
    lines.append(f"| {l.title()} | {s['oldShare']:.1%} | {s['newShare']:.1%} | {100*s['shareDelta']:+.2f} pp | {100*lo:+.2f} to {100*hi:+.2f} pp |")
lines+=['','Intervals use 100 shared-seed clusters. Opponent pools differ by leader, so compare old/new within each row rather than ranking leaders from these aggregates.','',
        '## Old/new RL matrix','', '| Row ↓ / opponent → | '+' | '.join(rl)+' |','|---|'+'---:|'*len(rl)]
for a in rl:lines.append('| '+a+' | '+' | '.join(f"{matrix[a][b]['share']:.1%}" if b in matrix[a] else '—' for b in rl)+' |')
for leader in leaders:
    opponents=[e['id'] for e in entries.values() if 'policy' in e and e['leader']==leader]
    lines+=['',f'## Against {leader.title()} heuristics','', '| RL model | '+' | '.join(entries[b]['policy'] for b in opponents)+' |','|---|'+'---:|'*len(opponents)]
    for a in rl:
        if entries[a]['leader']!=leader:lines.append('| '+a+' | '+' | '.join(f"{matrix[a][b]['share']:.1%}" for b in opponents)+' |')
lines+=['','## Scope and interpretation','']+['- '+c for c in result['caveats']]
lines+=['','The new weights are the frozen two-round league champions, including the Nereon review candidate; Melia is byte-for-byte unchanged. Both generations are retained under `actors/`, with checkpoint and file hashes in the evaluation protocol.',
    '', '## Reproduce','', 'Run within the project Nix environment:', '', '```sh',
    'python scripts/rl/archive_review_replays.py unpack',
    'bun balance-results/league-review-v1/runner.js balance-results/league-review-v1/evaluation.json',
    'python scripts/rl/report_review_matrix.py', '```','',
    'The archive preserves all 18,600 per-game gzip files byte-for-byte, verified by a full round trip. The immutable bundled runner resumes those completed records. To rerun every game, use a copy of the config with a fresh output directory. Each saved record contains all commands, initial configuration, and final outcome.']
(root/'REPORT.md').write_text('\n'.join(lines)+'\n')
print('\n'.join(lines[:17]))
