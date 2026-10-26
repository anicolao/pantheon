"""Amend an unstarted study to use the newly confirmed ordinary-network improvement."""
import hashlib,json,shutil,time
from pathlib import Path
r=Path('balance-results/doreios-four-rl-v27');sources=[Path(f'balance-results/doreios-four-rl-v{n}') for n in [30,33]];s=max([p for p in sources if (p/'audit.json').exists() and json.loads((p/'results.json').read_text())['improvementConfirmed']],key=lambda p:json.loads((p/'results.json').read_text())['candidate']['share']);assert (s/'audit.json').exists() and (s/'queue-finished.json').exists();assert json.loads((s/'results.json').read_text())['improvementConfirmed'];assert not (r/'amendment.json').exists()
for arm in ['win','mixed']:assert not (r/arm/'protocol.json').exists(),'Cannot amend a started experiment'
old=r/'superseded-plan';old.mkdir();(old/'actors').mkdir();shutil.copyfile(r/'actors/doreios.json',old/'actors/doreios.json')
for name in ['config.json','incumbent.zip','training-base.zip','opponents-evaluation.json']:shutil.copyfile(r/name,old/name)
for arm in ['win','mixed']:
 (old/arm).mkdir();shutil.copyfile(r/arm/'config.json',old/arm/'config.json');shutil.copyfile(r/arm/'opponents-training.json',old/arm/'opponents-training.json')
for name in ['incumbent.zip','training-base.zip']:shutil.copyfile(s/'selected.zip',r/name)
shutil.copyfile(s/'candidate.json',r/'actors/doreios.json');actor_hash=hashlib.sha256((r/'actors/doreios.json').read_bytes()).hexdigest()
for path in [r/'opponents-evaluation.json',r/'win/opponents-training.json',r/'mixed/opponents-training.json']:
 m=json.loads(path.read_text());m['actors']['doreios']=dict(path=str((r/'actors/doreios.json').resolve()),sha256=actor_hash);path.write_text(json.dumps(m,indent=2)+'\n')
selection=f'Amended before any training/screening began: start and compare against the stronger confirmed/audited ordinary NN fromv30/v33, chosen as {s.name} by fresh share among confirmed improvements. Two2097152-decision arms: terminal winWeight1 or.5 withmargin8. SamePPO/GAE.95,optimizerreset,inheritedcriticadapts. Includeunchangedtrainingbase;common512screen;freeze before6400 freshpairedgames/model;independent runtime/replayaudit. No deployment.'
for path in [r/'config.json',r/'win/config.json',r/'mixed/config.json']:
 c=json.loads(path.read_text());c.update(selection=selection,reward='Refine confirmed '+s.name+' actor with win-share or half-win/half-margin reward');path.write_text(json.dumps(c,indent=2)+'\n')
(r/'amendment.json').write_text(json.dumps(dict(time=time.time(),reason='Stronger ordinary NN became independently confirmed before this study started; original unexecuted plan retained in superseded-plan',source=str(s),checkpointSHA256=hashlib.sha256((s/'selected.zip').read_bytes()).hexdigest(),sourceResults=json.loads((s/'results.json').read_text()),sourceAuditSHA256=hashlib.sha256((s/'audit.json').read_bytes()).hexdigest()),indent=2)+'\n')
