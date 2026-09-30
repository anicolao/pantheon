import fcntl,os,json
from pathlib import Path
def lock(root,name):
 directory=Path(root)/'.run';directory.mkdir(exist_ok=True)
 f=(directory/(name+'.lock')).open('a+')
 try:fcntl.flock(f.fileno(),fcntl.LOCK_EX|fcntl.LOCK_NB)
 except BlockingIOError:raise RuntimeError(name+' is already running; monitor its existing records instead')
 f.seek(0);f.truncate();json.dump({'pid':os.getpid()},f);f.flush()
 return f
