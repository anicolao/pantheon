import subprocess,threading,json
from pathlib import Path
class CachedWorkers:
 def __init__(self,root):
  self.root=Path(root);self.local=threading.local();self.processes=[];self.lock=threading.Lock()
 def run(self,job):
  if not hasattr(self.local,'process'):
   p=subprocess.Popen(['bun',str(self.root/'daemon.ts')],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
   self.local.process=p
   with self.lock:self.processes.append(p)
  p=self.local.process
  p.stdin.write(json.dumps(job)+'\n');p.stdin.flush()
  line=p.stdout.readline()
  if not line:raise RuntimeError('Worker exited: '+p.stderr.read())
  reply=json.loads(line)
  if reply.get('id')!=job['id']:raise RuntimeError('Worker response does not match job')
  if reply.get('error'):raise RuntimeError(reply['error'])
  return reply
 def close(self):
  for p in self.processes:p.stdin.close()
  for p in self.processes:
   if p.wait()!=0:raise RuntimeError('Worker failed: '+p.stderr.read())
