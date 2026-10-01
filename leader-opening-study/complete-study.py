import json,subprocess,fcntl,time
from pathlib import Path
from runlock import lock
root=Path(__file__).resolve().parent;run_lock=lock(root,'complete-study')
def run(args,log):
 print(json.dumps({'started':args,'time':time.time()}),flush=True)
 with (root/log).open('a') as output:subprocess.run(args,cwd=root.parent,stdout=output,stderr=subprocess.STDOUT,check=True)
 print(json.dumps({'completed':args,'time':time.time()}),flush=True)
# The existing historical search owns this OS lock until it finishes.
with (root/'.run'/'training.lock').open('a+') as training:
 fcntl.flock(training.fileno(),fcntl.LOCK_EX)
 assert (root/'selected-books.json').exists(),'Historical training stopped before selecting its books'
run(['python3','leader-opening-study/archive-training.py'],'archive.log')
if not (root/'current-engine'/'selected-books.json').exists():
 run(['python3','leader-opening-study/record-source.py','--current'],'current-source.log')
 run(['python3','leader-opening-study/train.py','--current'],'current-training-driver.log')
if not (root/'current-engine'/'cache-verification.json').exists():run(['python3','leader-opening-study/verify-cache.py','--current'],'current-cache.log')
run(['python3','leader-opening-study/archive-training.py','--current'],'archive.log')
run(['python3','leader-opening-study/install-books.py'],'install.log')
run(['bun','test','tests/tooling/practice.test.ts'],'final-validation.log')
run(['bun','run','check'],'final-validation.log')
run(['bun','run','build'],'final-validation.log')
run(['python3','leader-opening-study/matrix.py'],'matrix-driver.log')
run(['python3','leader-opening-study/matrix.py','--control'],'control-driver.log')
run(['python3','leader-opening-study/analyze-matrix.py'],'analysis.log')
run(['python3','leader-opening-study/analyze-control.py'],'analysis.log')
(root/'completed.json').write_text(json.dumps({'completedAt':time.time(),'matrixGames':21600,'controlGames':4800},indent=2))
print('Study complete; inspect reports and commit the resulting books and archives.',flush=True)
