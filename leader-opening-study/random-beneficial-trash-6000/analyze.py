import hashlib
import json
import math
import statistics as st
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OLD = ROOT.with_name('random-beneficial-trash')
LEADERS = ['thaleia', 'nereon', 'melia', 'doreios']

def estimate(xs):
    n = len(xs)
    mean = st.mean(xs)
    se = st.stdev(xs) / math.sqrt(n)
    # Student-t quantile expansion; accurate to displayed precision for n >= 450.
    def critical(z):
        v = n-1
        return z+(z**3+z)/(4*v)+(5*z**5+16*z**3+3*z)/(96*v*v)
    margin = critical(1.959963985)*se
    simultaneous = critical(2.3939798)*se
    return dict(n=n,mean=mean,ci95=[mean-margin,mean+margin],
                ci95_bonferroni_three=[mean-simultaneous,mean+simultaneous])

games = {}
for p in sorted((ROOT/'games').glob('*.json')):
    if p.name.endswith('.replay.json'):
        continue
    g = json.loads(p.read_text())
    assert g['players'][0]['turns'] == g['players'][1]['turns']
    assert hashlib.sha256(p.with_suffix('.replay.json').read_bytes()).hexdigest() == g['traceHash']
    assert all(set(x['telemetry']['buys']) <= set(g['allowed']) for x in g['players'])
    if g['index'] < 50:
        assert g == json.loads((OLD/'games'/p.name).read_text()), p
    games[(*g['lineup'],g['index'])] = g
assert len(games) == 6000
for (a,b,i),g in games.items():
    reverse = games[b,a,i]
    assert g['selected'] == reverse['selected'] and g['seed'] == reverse['seed'] == 510000+i

cells = []
for a in LEADERS:
    for b in LEADERS:
        if a == b: continue
        gs = [games[a,b,i] for i in range(500)]
        xs = [g['players'][0]['share'] for g in gs if g['status']=='finished']
        r = dict(p1=a,p2=b,wins=xs.count(1),ties=xs.count(.5),losses=xs.count(0),unfinished=500-len(xs),**estimate(xs))
        r['all_games_bounds']=[sum(xs)/500,(sum(xs)+500-len(xs))/500]
        cells.append(r)

seat_effects = {}
for label,indices in [('all_500',range(500)),('fresh_450',range(50,500))]:
    rows=[]
    for opp in ['thaleia','melia','doreios']:
        pairs=[(games['nereon',opp,i],games[opp,'nereon',i]) for i in indices]
        pairs=[(a,b) for a,b in pairs if a['status']==b['status']=='finished']
        first=[a['players'][0]['share'] for a,b in pairs]
        second=[b['players'][1]['share'] for a,b in pairs]
        rows.append(dict(opponent=opp,p1=estimate(first),p2=estimate(second),difference=estimate([b-a for a,b in zip(first,second)])))
    seat_effects[label]=rows

result=dict(games=6000,finished=sum(g['status']=='finished' for g in games.values()),
            timing=json.loads((ROOT/'timing.json').read_text()),cells=cells,nereon_seat_effects=seat_effects,
            mean_completed_turns=st.mean(g['players'][0]['turns'] for g in games.values() if g['status']=='finished'))
(ROOT/'analysis.json').write_text(json.dumps(result,indent=2)+'\n')
lines=['6000-GAME BENEFICIAL-TRASH RANDOM BOT MATRIX','',
       '500 games per ordered matchup. Seeds 510000–510499; original 50 included and reproduced exactly.',
       'Rules/policy unchanged; shared startup Action piles, equal turns, original ties worth half.',
       'Finished: %d/6000. Simulation seconds: %.3f; workers: %d.' % (result['finished'], result['timing']['seconds'],result['timing']['workers']),
       '', 'P1 / P2 | W/T/L | unfinished | P1 share [95% interval]']
for r in cells:
    lines.append('%s / %s | %d/%d/%d | %d | %.1f%% [%.1f, %.1f]' % (r['p1'],r['p2'],r['wins'],r['ties'],r['losses'],r['unfinished'],100*r['mean'],100*r['ci95'][0],100*r['ci95'][1]))
for label,rows in seat_effects.items():
    lines+=['','NEREON SEAT EFFECT: '+label,'Opponent | P1 | P2 | paired P2-P1 pp [95%] | simultaneous 95% across three opponents | paired n']
    for r in rows:
        d=r['difference']
        lines.append('%s | %.1f%% | %.1f%% | %+.1f [%+.1f, %+.1f] | [%+.1f, %+.1f] | %d' % (r['opponent'],100*r['p1']['mean'],100*r['p2']['mean'],100*d['mean'],100*d['ci95'][0],100*d['ci95'][1],100*d['ci95_bonferroni_three'][0],100*d['ci95_bonferroni_three'][1],d['n']))
lines+=['','METHOD / LIMITATIONS',
        'Cell intervals: mean of 0/0.5/1 outcomes, estimated SE and two-sided Student-t interval (quantile expansion).',
        'Seat differences pair reversed-seat games by seed; analyze per-seed differences, not independent proportions.',
        'Bonferroni intervals jointly cover the three Nereon opponent-specific seat effects at >=95% nominal confidence.',
        'Fresh 450 exclude the 50 seeds that motivated this follow-up. No policy tuning or optional stopping.',
        'Unfinished games are excluded from estimates; analysis.json also reports worst/best all-game bounds. Paired tests require both games finished.',
        'All 600 original records reproduced exactly. Every saved trace hash, shared setup, allowed purchase and equal-turn count checked.',
        'Runner fully replays each game and asserts legal beneficial trash choices and $3 post-trash floor.',
        '9 tests / 25 assertions pass. Production bots unchanged.',
        'Random play with an approximate trash evaluator is not optimal play. This test does not swap seat-specific RNG streams, so it cannot isolate a causal seat mechanism.']
(ROOT/'REPORT.txt').write_text('\n'.join(lines)+'\n')
sources=['runner.ts','run.py','income-floor.ts','income-floor.test.ts','trash-policy.ts','trash-policy.test.ts','analyze.py']
(ROOT/'manifest.json').write_text(json.dumps(dict(seeds=[510000,510499],source_hashes={n:hashlib.sha256((ROOT/n).read_bytes()).hexdigest() for n in sources},trace_hashes={'-'.join(map(str,k)):g['traceHash'] for k,g in games.items()}),indent=2)+'\n')
print('\n'.join(lines))
