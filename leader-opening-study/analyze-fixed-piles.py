import gzip,hashlib,json,math,statistics as st
from pathlib import Path
ROOT=Path(__file__).resolve().parent
LEADERS=['thaleia','nereon','melia','doreios']
def estimate(xs):
 n=len(xs)
 if n<2: return dict(n=n,mean=st.mean(xs) if xs else None,ci95=None)
 z=1.959963985; v=n-1
 t=z+(z**3+z)/(4*v)+(5*z**5+16*z**3+3*z)/(96*v*v)
 mean=st.mean(xs); margin=t*st.stdev(xs)/math.sqrt(n)
 return dict(n=n,mean=mean,ci95=[mean-margin,mean+margin])
all_games={}; summaries=[]; parity=0
for count in range(4):
 root=ROOT/('random-fixed-piles-'+str(count)); games={}
 for path in sorted((root/'games').glob('*.json')):
  if path.name.endswith('.replay.json'): continue
  g=json.loads(path.read_text()); key=(*g['lineup'],g['index']); games[key]=g
  assert g['count']==count==len(g['selected'])
  assert g['allowed']==['drachma','talent','acropolis',*g['selected']]
  assert g['seed']==510000+g['index']
  assert g['players'][0]['turns']==g['players'][1]['turns']
  assert all(set(p['telemetry']['buys'])<=set(g['allowed']) for p in g['players'])
  assert hashlib.sha256(gzip.decompress(path.with_suffix('.replay.json.gz').read_bytes())).hexdigest()==g['traceHash']
  old=json.loads((ROOT/'random-beneficial-trash-6000'/'games'/path.name).read_text())
  if old['count']==count:
   assert g==old
   parity+=1
  if count:
   assert g['selected'][:count-1]==all_games[count-1][key]['selected']
 assert len(games)==6000
 for (a,b,i),g in games.items(): assert g['selected']==games[b,a,i]['selected']
 all_games[count]=games; rows=[]
 for a in LEADERS:
  for b in LEADERS:
   if a==b: continue
   gs=[games[a,b,i] for i in range(500)]
   xs=[g['players'][0]['share'] for g in gs if g['status']=='finished']
   r=dict(p1=a,p2=b,wins=xs.count(1),ties=xs.count(.5),losses=xs.count(0),unfinished=500-len(xs),**estimate(xs))
   r['all_games_bounds']=[sum(xs)/500,(sum(xs)+500-len(xs))/500]
   if count:
    ds=[g['players'][0]['share']-all_games[0][a,b,g['index']]['players'][0]['share'] for g in gs if g['status']=='finished' and all_games[0][a,b,g['index']]['status']=='finished']
    r['paired_change_from_zero']=estimate(ds)
   rows.append(r)
 result=dict(action_piles=count,games=6000,finished=sum(g['status']=='finished' for g in games.values()),cells=rows,
             mean_finished_turns=st.mean(g['players'][0]['turns'] for g in games.values() if g['status']=='finished'))
 summaries.append(result)
 (root/'analysis.json').write_text(json.dumps(result,indent=2)+'\n')
 sources=['runner.ts','income-floor.ts','income-floor.test.ts','trash-policy.ts','trash-policy.test.ts']
 (root/'manifest.json').write_text(json.dumps(dict(seeds=[510000,510499],source_hashes={n:hashlib.sha256((root/n).read_bytes()).hexdigest() for n in sources},trace_hashes={'-'.join(map(str,k)):g['traceHash'] for k,g in games.items()}),indent=2)+'\n')
lines=['FIXED ACTION-PILE COUNTS: RANDOM BOT LEADER MATRICES','',
       'Exactly 0, 1, 2 or 3 purchasable Action piles. 500 games per ordered matchup; 24,000 total.',
       'Seeds 510000–510499 reused across all counts and matchups; each count uses a prefix of the same shuffled Action-pile list.',
       'Both players share the selected piles. Purchase whitelist: Drachma, Talent, Acropolis, selected Actions.',
       'Starting cards unchanged; Worship and effect gains remain legal and may acquire Actions outside selected piles.',
       'Same beneficial-trash heuristic, $3 income floor, standard powers, equal turns, half-credit ties.',
       'Intervals are pointwise 95% Student-t intervals for mean 0/0.5/1 outcomes, using a quantile expansion.',
       'No adjustment for multiple comparisons. No strategy pooling. Unfinished games excluded, with all-game bounds in JSON.',
       'Original 6000-game study matches exactly in all %d games whose chosen count equals the fixed count.'%parity]
for result in summaries:
 lines+=['','ACTION PILES: %d; finished %d/6000; mean turns/player %.2f'%(result['action_piles'],result['finished'],result['mean_finished_turns']),
         'P1 / P2 | W/T/L | unfinished | P1 share [95% CI]']
 for r in result['cells']:
  lines.append('%s / %s | %d/%d/%d | %d | %.1f%% [%.1f, %.1f]'%(r['p1'],r['p2'],r['wins'],r['ties'],r['losses'],r['unfinished'],100*r['mean'],100*r['ci95'][0],100*r['ci95'][1]))
lines+=['','VALIDATION',
        'Every trace SHA256, shared pile selection, purchase whitelist and equal-turn count checked.',
        'Runner fully replays every game and asserts the beneficial-trash policy and post-trash floor.',
        'No production policy or game-rule changes. Full records and replays retained per count.',
        'Approximate trash evaluation plus random play measures sensitivity under this policy, not optimal-play balance.',
        'Paired changes from zero piles, using common finished seeds, are in each analysis.json.']
timing=json.loads((ROOT/'fixed-piles-timing.json').read_text());lines+=['',str(timing)]
(ROOT/'FIXED-PILES-REPORT.txt').write_text('\n'.join(lines)+'\n')
(ROOT/'fixed-piles-analysis.json').write_text(json.dumps(dict(timing=timing,exact_baseline_matches=parity,results=summaries),indent=2)+'\n')
print('\n'.join(lines))
