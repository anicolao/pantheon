import json,hashlib,subprocess,platform,sys
from pathlib import Path
source=Path(__file__).resolve().parent;repo=source.parent
root=source/'current-engine' if '--current' in sys.argv else source
root.mkdir(exist_ok=True);files=[]
for directory in ['src/lib/bots','src/lib/game','standard-matrix','balance-checkpoint','historical-thaleia/source']:files.extend((repo/directory).rglob('*.ts'))
files.extend(source/f for f in ['runner.ts','worker.ts','daemon.ts','collect.ts','train.py','pool.py'])
files.append(repo/'historical-thaleia/profiles.json')
result={'commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip(),'bun':subprocess.check_output(['bun','--version'],text=True).strip(),'python':platform.python_version(),'sourceSHA256':{str(f.relative_to(repo)):hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(files)},'note':'Recorded before the independent current-Engine opening search. Each training game explicitly supplies its focal opening override and uses unchanged Money as opponent.'}
path=root/'training-source.json'
if path.exists():assert json.loads(path.read_text())==result,'Training source changed; inspect before resuming'
else:path.write_text(json.dumps(result,indent=2)+'\n')
