"""Readable report of retained evidence; never treats screening as confirmation."""
import datetime,json
from pathlib import Path
root=Path('balance-results/doreios-overnight-v1')
work=json.loads((root/'current-work.json').read_text());best=Path(work['bestCheckpoint']).parent
r=json.loads((best/'results.json').read_text());a=json.loads((best/'audit.json').read_text());p=json.loads((best/'export-parity.json').read_text())
assert a['browserRuntimeMatchesReferenceOutcomes'] and a['replaysVerified']==2*r['candidate']['games'] and p['exactCommandParity'] and p['replayVerified']
b=r['incumbent'];c=r['candidate'];delta=r['pairedShareDelta'];ci=r['paired95CI']
pooled=None
if (root/'pooled-confirmation.json').exists():
 marker='v'+best.name.rsplit('v',1)[1]+' candidate'
 pooled=next((x for x in json.loads((root/'pooled-confirmation.json').read_text())['policies'] if marker in x['labels']),None)
estimate=pooled or c
target_note=('The combined point estimate reaches 25%.' if estimate['share']>=.25 else 'The combined point estimate reaches 20%, but not 25%.' if estimate['share']>=.20 else 'The combined point estimate remains below 20%; the target is not established.')
target_note+=(' Its interval includes values below 20%.' if estimate['CI95'][0]<.20 else ' Its 95% interval lies above 20%.')
lines=[f"Doreios four-player research — {datetime.datetime.now(datetime.timezone.utc).isoformat()}",
 f"Best retained ordinary network: {best}",
 f"Original fresh confirmation: {c['share']:.2%} (95% CI {c['CI95'][0]:.2%}–{c['CI95'][1]:.2%}), versus {b['share']:.2%} for its matched baseline.",
 f"Combined independent confirmations of this exact policy: {estimate['share']:.2%} across {estimate['games']:,} unique games (95% CI {estimate['CI95'][0]:.2%}–{estimate['CI95'][1]:.2%}). Duplicate same-policy games count once; screening and training games are excluded.",
 f"Paired improvement: {delta*100:+.2f} percentage points (95% CI {ci[0]*100:+.2f}–{ci[1]*100:+.2f}).",
 f"Evidence: {c['games']:,} fresh games per model; {a['replaysVerified']:,} independent runtime/full-state replay matches; {p['games']} export-parity games and {p['decisions']:,} exact decisions.",
 f"Checkpoint: {best/'selected.zip'}",f"Exported research actor: {best/'candidate.json'}",'',
 'Ordinary network: '+target_note+' These results apply to the fixed Melia/Nereon/Thaleia roster with equal turns and balanced seating. Ties split win credit. Confidence intervals cluster all four seating rotations of each seed. No failed games are excluded.',
 'Production/deployed weights have not been updated. This model uses the research public-v1 observation encoder; it is not automatically installed into the application.', '',
 'Four-player shares in the best model’s matched confirmation:',
 'Leader | Baseline | Candidate | Change (percentage points)']
for leader in ['melia','nereon','thaleia','doreios']:
 before=a['tableWinShares']['incumbent'][leader];after=a['tableWinShares']['candidate'][leader]
 lines.append(f'{leader.title()} | {before:.2%} | {after:.2%} | {(after-before)*100:+.2f}')
lines += ['', 'Selected alternative experiments (each row uses its own independent matched confirmation seeds):', 'Study | Before | After | Paired change | Confirmed improvement']
for n in [23,27,29,30,31,32,33,34,35,28,36,37,38,39]:
 study=Path(f'balance-results/doreios-four-rl-v{n}')
 if not (study/'results.json').exists() or not (study/'queue-finished.json').exists():continue
 result=json.loads((study/'results.json').read_text());lo,hi=result['paired95CI']
 lines.append(f"v{n} | {result['incumbent']['share']:.2%} | {result['candidate']['share']:.2%} | {result['pairedShareDelta']*100:+.2f} pp [{lo*100:+.2f}, {hi*100:+.2f}] | {result['improvementConfirmed']}")
hybrid=work.get('bestHybrid')
if hybrid:
 hr=json.loads((Path(hybrid['path']).parent/'results.json').read_text());hc=hr['candidate'];hb=hr['incumbent']
 lines[1:1]=[f"Best retained overall bot: {hc['share']:.2%} split win share (95% CI {hc['CI95'][0]:.2%}–{hc['CI95'][1]:.2%}), using a frozen network plus public-information planning.",f"Saved configuration: {hybrid['path']}",'']
 lines += ['', 'Best retained planner/hybrid:', hybrid['path'],
  f"Fresh confirmation: {hc['share']:.2%} (95% CI {hc['CI95'][0]:.2%}–{hc['CI95'][1]:.2%}) versus {hb['share']:.2%}; {hc['games']:,} games per model, {hr['replayVerifiedGames']:,} full-state replays.",
  'This combines a frozen neural network with public-information planning; it is not a standalone newly trained network. No hidden game state is used and nothing has been deployed.',
  ('The planner clears the 20% target, including its lower confidence bound; 25% is not yet achieved.' if hc['CI95'][0]>.20 and hc['share']<.25 else 'See the confidence interval before interpreting the target.')]
lines += ['', 'Still awaiting final results:']
descriptions={'v28':'Public-belief planner: fresh confirmation and replay checks.', 'v35':'Lower-rate win-reward versus score-margin refinement: training recovery, selection and confirmation.', 'plannerDemonstrations':'Independent planner demonstrations; no model training.', 'v36':'Planner-intervention distillation, gated on a confirmed planner improvement.', 'v37':'Early Talent investment hypothesis; fixed rule screening and confirmation.', 'v38':'Actor-parameter interpolation; new screening and independent confirmation.'}
for name,entry in work['running'].items():lines.append(f"{name}: {descriptions.get(name,'See current-work.json for the recorded protocol and progress.')}")
lines += ['', 'Infrastructure recovery completed: a disk-full error interrupted planner output and one training checkpoint save. Completed planner chunks and frozen selection/seeds were preserved; missing chunks were rerun. The interrupted training arm was rerun from the identical original initialization/seeds; all five prior complete checkpoint parameter/optimizer states and six prior screening files matched exactly. Failed logs and partial checkpoint evidence remain archived. Regenerable old temporary compile caches were cleared; research artifacts were retained.', '', 'Detailed protocols, checkpoints, results, replay evidence and recovery records are in the corresponding study directories.']
(root/'PROGRESS.txt').write_text('\n'.join(lines)+'\n')
print(str(root/'PROGRESS.txt'))
