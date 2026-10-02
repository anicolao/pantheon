"""Validate saved matched games and report paired, pointwise 95% t intervals."""
import hashlib
import json
import statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OLD = ROOT.parent / 'random-leader-matrix'
LEADERS = ['thaleia', 'nereon', 'melia', 'doreios']
T = {46: 2.014103, 47: 2.012896, 48: 2.011741, 49: 2.010635, 50: 2.009575}
cells = {}
files = sorted(p for p in (ROOT / 'games').glob('*.json') if not p.name.endswith('.replay.json'))
assert len(files) == 600
turns = []
for path in files:
    g = json.loads(path.read_text())
    old = json.loads((OLD / 'games' / path.name).read_text())
    for key in ('seed', 'index', 'reverse', 'count', 'selected', 'allowed', 'lineup'):
        assert g[key] == old[key], (path, key)
    assert g['status'] == 'finished'
    assert g['players'][0]['turns'] == g['players'][1]['turns']
    trace = path.with_suffix('.replay.json').read_bytes()
    assert hashlib.sha256(trace).hexdigest() == g['traceHash']
    for p in g['players']:
        assert set(p['telemetry']['buys']) <= set(g['allowed'])
    turns.append(g['players'][0]['turns'])
    cells.setdefault(tuple(g['lineup']), []).append((g, old))

rows = []
for a in LEADERS:
    for b in LEADERS:
        if a == b:
            continue
        pairs = cells[a, b]
        assert len(pairs) == 50
        assert {g['seed'] for g, _ in pairs} == set(range(510000, 510050))
        new = [g['players'][0]['share'] for g, _ in pairs]
        completed = [(g['players'][0]['share'], o['players'][0]['share']) for g, o in pairs if o['status'] == 'finished']
        differences = [n-o for n, o in completed]
        n = len(differences)
        delta = statistics.mean(differences)
        margin = T[n] * statistics.stdev(differences) / n**0.5
        old_points = sum(o for _, o in completed)
        rows.append(dict(p1=a, p2=b, wins=new.count(1), ties=new.count(.5), losses=new.count(0),
                         share=statistics.mean(new), baseline_unfinished=50-n,
                         baseline_all_games_bounds=[old_points/50, (old_points+50-n)/50],
                         paired_n=n, paired_delta=delta, paired_ci95=[delta-margin, delta+margin]))

result = dict(games=600, completed=600, mean_turns=statistics.mean(turns),
              timing=json.loads((ROOT/'timing.json').read_text()), cells=rows,
              validation='All startup selections and seeds match baseline; equal turns, permitted purchases, trace SHA256 checked for all 600. Runner also fully replays every game and asserts trash policy and floor at each trash.',
              inference='Pointwise paired t intervals over seed-level win-share changes; ties half. Censored baseline games excluded from paired comparisons only. No multiplicity correction.')
(ROOT/'analysis.json').write_text(json.dumps(result, indent=2)+'\n')
lines = ['BENEFICIAL TRASH: MATCHED RANDOM-BOT LEADER MATRIX', '',
         '600 games, seeds 510000–510049 in each ordered matchup, 50 per cell.',
         'Same shared 0–4 Action piles, standard powers/Worship, equal turns, ties half.',
         'All 600 completed (baseline 586); mean %.2f turns/player; simulation %.3fs on 16 workers.' % (result['mean_turns'], result['timing']['seconds']), '',
         'P1 / P2 | New W/T/L | New share | Old all-50 bounds* | Paired change [95% CI], pp | Paired n']
for r in rows:
    lo, hi = r['baseline_all_games_bounds']
    ci = r['paired_ci95']
    lines.append('%s / %s | %s/%s/%s | %.1f%% | %.1f–%.1f%% | %+.1f [%+.1f, %+.1f] | %d' %
                 (r['p1'],r['p2'],r['wins'],r['ties'],r['losses'],100*r['share'],100*lo,100*hi,100*r['paired_delta'],100*ci[0],100*ci[1],r['paired_n']))
lines += ['', '* Baseline bounds assign unresolved games losses or wins; these are NOT confidence intervals.',
          result['inference'], 'For incomplete baseline cells, paired changes describe only the common completed subset.', '',
          'POLICY',
          'Experimental only; production bots are unchanged. Keep the existing $3 income-capacity floor.',
          'Compare whole-deck analytic income proxies with legal Action capacity and net draw. This is an approximation, not shuffled-hand EV.',
          'Require income improvement > $0.02 and net score improvement > 0.1 over declining the trash.',
          'Net score = min(4, Acropolis supply) * income change + VP change - removed unplayed Treasure face value; horizon zero in final round.',
          'Forge/offering replacement gains are averaged uniformly across eligible gains, including optional decline where applicable.',
          'Choose randomly among beneficial legal trash subsets and declining; unchanged random purchases, play order, Worship, gain choices and RNG seeds.',
          'Uses public composition, not hidden deck order. Conditional reveal money, Worship and future gains are excluded from the income proxy.', '',
          'VALIDATION', result['validation'],
          '9 targeted tests, 25 assertions passed, including income floor, junk vs cash, draw/Action limits, late points, and Forge evaluation purity.', '',
          'INTERPRETATION',
          'Doreios vs Thaleia improves in both seats: P1 29% to 47%; P2 34% to 56%.',
          'Other substantial asymmetries remain. This tests leader sensitivity to a shared trash policy, not optimal play or human balance.',
          'The 12 intervals are exploratory and unadjusted; 50 games/cell gives wide uncertainty. No follow-up tuning or seed selection was performed.']
(ROOT/'REPORT.txt').write_text('\n'.join(lines)+'\n')
sources = [ROOT/n for n in ('runner.ts','run.py','income-floor.ts','income-floor.test.ts','trash-policy.ts','trash-policy.test.ts','analyze.py')]
manifest = dict(baseline=str(OLD.relative_to(ROOT.parent.parent)), seeds=[510000,510049], workers=16,
                sources={str(p.relative_to(ROOT.parent.parent)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sources},
                traces={p.name:json.loads(p.read_text())['traceHash'] for p in files})
(ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('\n'.join(lines))
