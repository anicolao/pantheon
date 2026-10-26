"""Report a running teacher experiment when its frozen confirmation completes."""
import json,os,subprocess,sys,time
from pathlib import Path
r=Path(sys.argv[1]);pid=int(sys.argv[2])
if (r/'report-queue.json').exists():raise RuntimeError('Report already queued; inspect live handle')
(r/'report-queue.json').write_text(json.dumps(dict(pid=os.getpid(),producer=pid,time=time.time()))+'\n')
while not (r/'confirmation.json').exists():
 try:os.kill(pid,0)
 except ProcessLookupError:raise RuntimeError('Teacher stopped without confirmation')
 time.sleep(5)
with (r/'report.log').open('w') as log:subprocess.run([sys.executable,'scripts/rl/report_rule_policy.py',str(r)],stdout=log,stderr=subprocess.STDOUT,check=True)
(r/'report-finished.json').write_text(json.dumps(dict(time=time.time(),completed=True))+'\n')
