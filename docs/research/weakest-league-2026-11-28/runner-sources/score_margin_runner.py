"""Training-only terminal score margin; evaluation still uses unmodified win/tie/loss."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path.cwd()/'scripts/rl/expansion'))
import common
class MarginGame(common.gym.Wrapper):
    def step(self,action):
        obs,reward,done,truncated,info=self.env.step(action)
        if done and self.env.namespace.startswith('train-'):
            margin=info['score']-max(row['score'] for row in info['field'] if row['leader']!=info['leader'])
            info['outcome']=reward
            reward+=0.5*max(-1.,min(1.,margin/30))
        return obs,reward,done,truncated,info
def vector(workers,prefix,leader,opponent):
    return common.SubprocVecEnv([lambda i=i:MarginGame(common.Game(i,workers,prefix,leader,opponent)) for i in range(workers)],start_method='spawn')
common.vector=vector
if __name__=='__main__':
    from weakest_league import main
    main()
