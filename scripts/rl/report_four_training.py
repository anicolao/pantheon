"""Audit browser-runtime confirmation replays against the training evaluator."""
import collections
import gzip
import hashlib
import json
from pathlib import Path
import statistics
import sys

r=Path(sys.argv[1]);config=json.loads((r/'config.json').read_text());result=json.loads((r/'results.json').read_text())
learner=config.get('leader','doreios')
styles={};tables={}
for label in ['incumbent','candidate']:
    model='incumbent' if label=='incumbent' else result['selected']
    expected=json.loads((r/f'{model}-confirm.json').read_text())
    rows=json.loads((r/f'replays-{label}/games.json').read_text())
    protocol=json.loads((r/f'replays-{label}/protocol.json').read_text())
    assert protocol['runnerSHA256']==hashlib.sha256((r/'replay-runner.js').read_bytes()).hexdigest()
    for leader,path in protocol['actorPaths'].items():
        assert protocol['actorSHA256'][leader]==hashlib.sha256(Path(path).read_bytes()).hexdigest()
    assert len(rows)==len(expected)==config['confirmationGames']
    purchases=collections.Counter();worships=collections.Counter();first_acropolis=[];territories=collections.defaultdict(list)
    for game,old in zip(rows,expected,strict=True):
        p=next(p for p in game['players'] if p['leader']==learner)
        assert game['index']==int(old['seed'].split(':')[-1])
        assert game['seed']==old['seed'].rsplit(':',1)[0]+':'+str(old['block'])
        assert (p['share'],p['score'],p['turns'],p['seat'],p['turnPosition'])==(old['share'],old['score'],old['turns'],old['seat'],old['turnPosition'])
        assert {p['leader']:p['score'] for p in game['players']}==old['scores']
        assert game['replayVerified'] and old['replayVerified']
        for t in p['territories']:territories[t['id']].append(t['count'])
        replay=json.loads(gzip.decompress((r/f"replays-{label}/replays/{game['index']}.json.gz").read_bytes()))
        assert replay['result']==game
        turn=1;first=None
        for event in replay['events']:
            if event['actorUid']!=f"p{p['seat']}":continue
            if event['type']=='turn/ended':turn+=1
            if event['type']=='god/worshipped':worships[event['cardId']]+=1
            if event['type']=='card/bought':
                purchases[event['cardId']]+=1
                if event['cardId']=='acropolis' and first is None:first=turn
        if first is not None:first_acropolis.append(first)
    styles[label]=dict(meanFinalTerritories={id:statistics.mean(values) for id,values in territories.items()},
                       purchasesPerGame={id:n/len(rows) for id,n in purchases.most_common()},
                       worshipsPerGame={id:n/len(rows) for id,n in worships.most_common()},
                       firstAcropolisMeanTurn=statistics.mean(first_acropolis),gamesWithAcropolisPurchase=len(first_acropolis))
    tables[label]={leader:statistics.mean(p['share'] for g in rows for p in g['players'] if p['leader']==leader) for leader in ['melia','nereon','thaleia','doreios']}
evaluator='exported-native' if config.get('nativeEvaluation',False) else 'Python'
audit=dict(referenceEvaluator=evaluator,browserRuntimeMatchesReferenceOutcomes=True,replaysVerified=2*config['confirmationGames'],styles=styles,tableWinShares=tables)
if evaluator=='Python':audit['browserRuntimeMatchesPythonOutcomes']=True
(r/'audit.json').write_text(json.dumps(audit,indent=2)+'\n')
method=(f"Training: {config['steps']:,} additional PPO decisions; frozen other-leader opponents (see config.json for the frozen opponent manifest)." if 'steps' in config else "Method: "+config['selection'])
lines=[f'{learner.title()} four-player adaptation','',method,
       f"Selected: {result.get('source',result['selected'])}; production weights unchanged.",
       f"Confirmation: {config['confirmationGames']} matched games per model, in four seating rotations per seed block.",
       '']
for label in ['incumbent','candidate']:
    s=result[label];lines.append(f"{label}: {s['share']:.2%} split win share (95% CI {s['CI95'][0]:.2%} to {s['CI95'][1]:.2%}); {s['soleWins']} sole wins, {s['sharedWins']} shared wins; mean VP {s['meanVP']:.2f}.")
lines += [f"Paired improvement: {100*result['pairedShareDelta']:+.2f} percentage points (95% CI {100*result['paired95CI'][0]:+.2f} to {100*result['paired95CI'][1]:+.2f}).",f"Improvement confirmed: {result['improvementConfirmed']}.",
          '', 'Confidence intervals cluster the four seating rotations by seed. Checkpoints were selected on separate screening seeds before confirmation. Training and confirmation use disjoint namespaces. No games were excluded. These results apply to this fixed four-player opponent roster; heads-up retention has not been tested.',
          '',f"All {audit['replaysVerified']} confirmation games were rerun using exported browser-runtime actors, reproduced the {evaluator} evaluator's scores and results exactly, and replayed to identical full final states. Complete events are in replays-incumbent/replays and replays-candidate/replays.",
          '', 'Mean final territories:']
for label in styles:lines.append(label+': '+json.dumps(styles[label]['meanFinalTerritories']))
lines += ['', 'Four-player win shares (ties split equally):', 'Leader | Before | After | Change (percentage points)']
for leader in ['melia','nereon','thaleia','doreios']:
    before,after=tables['incumbent'][leader],tables['candidate'][leader]
    lines.append(f'{leader.title()} | {before:.2%} | {after:.2%} | {100*(after-before):+.2f}')
(r/'report.txt').write_text('\n'.join(lines)+'\n');print('\n'.join(lines))
