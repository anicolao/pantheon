"""Queue-aware transport; frozen opponents may use either supported schema."""
from common import *
class LeagueGame(Game):
 def __init__(self,rank,workers,prefix,leader,field,fixed_opponent=None):
  self.rank,self.workers,self.prefix=rank,workers,prefix
  self.namespace,self.counter='schema',0
  self.proc=subprocess.Popen(['bun',str(ROOT/'scripts/rl/expansion/league_bridge.ts'),leader,'teacher',field,'--deploy-queue',*([fixed_opponent] if fixed_opponent else [])],cwd=ROOT,stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,bufsize=1)
  s=self.call(dict(op='reset',seed=prefix+':schema:0'))
  self.observation_space=gym.spaces.Box(-np.inf,np.inf,shape=(len(s['observation']),),dtype=np.float32)
  self.action_space=gym.spaces.Discrete(len(s['mask']));self.mask=np.array(s['mask'],dtype=bool)
def league_vector(workers,prefix,leader,field,opponent=None):
 return SubprocVecEnv([lambda i=i:LeagueGame(i,workers,prefix,leader,field,opponent) for i in range(workers)],start_method='spawn')
