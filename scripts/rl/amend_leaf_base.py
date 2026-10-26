"""Before launching short rollouts, use the confirmed actor and remove the old purchase guard."""
import hashlib,json,shutil,subprocess,sys,time
from pathlib import Path
r=Path('balance-results/doreios-four-rl-v28');s=Path('balance-results/doreios-four-rl-v30');assert not (r/'protocol.json').exists();assert (s/'audit.json').exists() and (s/'queue-finished.json').exists();assert not (r/'amendment.json').exists()
old=r/'superseded-plan';old.mkdir();(old/'actors').mkdir()
for name in ['config.json','opponents.json','critic.json','rules.json','rollout-worker.js','smoke.json']:shutil.copyfile(r/name,old/name)
shutil.copyfile(r/'actors/doreios.json',old/'actors/doreios.json');shutil.copyfile(s/'candidate.json',r/'actors/doreios.json')
m=json.loads((r/'opponents.json').read_text());m['actors']['doreios']=dict(path=str((r/'actors/doreios.json').resolve()),sha256=hashlib.sha256((r/'actors/doreios.json').read_bytes()).hexdigest());(r/'opponents.json').write_text(json.dumps(m,indent=2)+'\n')
subprocess.run([sys.executable,'scripts/rl/export_critic.py',str(s/'selected'),str(r/'critic.json')],check=True)
assert json.loads((old/'critic.json').read_text())['layers']==json.loads((r/'critic.json').read_text())['layers'],'v30 should retain the v19 margin critic unchanged'
rules=json.loads((r/'rules.json').read_text())
for rule in rules:
 if rule:rule['guardTreasures']=False
(r/'rules.json').write_text(json.dumps(rules,indent=2)+'\n')
c=json.loads((r/'config.json').read_text());c['selection']='Amended before search: public-belief short-horizon planning on confirmed/audited v30 actor; retained v19 margin8 critic is tensor-identical (not retrained). Disable the legacy research treasure-before-purchase guard, so root and continuation use the exact frozen actors. After1/2/4 completed own turns, evaluate public critic atnextown decision;clamp[0,1],terminalgames useexactmargin.16samples,4candidates,risk0/1. Probe128,best2 plusbaseline screen512,freeze before3200 fresh/model. Sparse/masked hypothetical inference;actualgames exactfullreplay. Teacheronly,nodeployment.';(r/'config.json').write_text(json.dumps(c,indent=2)+'\n')
subprocess.run(['bun','build','scripts/rl/rollout_worker.ts','--target=bun','--outfile='+str(r/'rollout-worker.js')],check=True)
shutil.copytree('scripts/rl',r/'source/scripts/rl',ignore=shutil.ignore_patterns('__pycache__'),dirs_exist_ok=True)
(r/'amendment.json').write_text(json.dumps(dict(time=time.time(),reason='Improve experimental relevance and isolate planning before any search data were collected',source=str(s),checkpointSHA256=json.loads((s/'candidate.json').read_text())['checkpointSHA256'],criticTensorsUnchanged=True,legacyGuardDisabled=True),indent=2)+'\n')
