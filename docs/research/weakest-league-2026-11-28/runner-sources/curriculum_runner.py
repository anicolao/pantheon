"""Nearest-rival training curriculum; screening and confirmation remain uniform."""
import sys,json,time,hashlib
from pathlib import Path
sys.path.insert(0,str(Path.cwd()/'scripts/rl/expansion'))
import common
class CurriculumGame(common.gym.Env):
    def __init__(self,rank,workers,prefix,leader,field,training_field):
        self.evaluation=common.Game(rank,workers,prefix,leader,field)
        self.training=common.Game(rank,workers,prefix+':curriculum',leader,training_field)
        self.active=self.evaluation;self.observation_space=self.active.observation_space;self.action_space=self.active.action_space
    def schedule(self,namespace):
        self.active=self.training if namespace.startswith('train-') else self.evaluation
        self.active.schedule(namespace)
    def reset(self,seed=None,options=None):return self.active.reset(seed=seed,options=options)
    def action_masks(self):return self.active.action_masks()
    def teacher(self):return self.active.teacher()
    def teacher_preview(self):return self.teacher()
    def step(self,action):
        obs,reward,done,truncated,info=self.active.step(action)
        if done and self.active is self.training:
            margin=info['score']-max(row['score'] for row in info['field'] if row['leader']!=info['leader'])
            info['outcome']=reward;reward+=0.5*max(-1.,min(1.,margin/30))
        return obs,reward,done,truncated,info
    def close(self):self.training.close();self.evaluation.close()
def vector(workers,prefix,leader,opponent):
    original=Path(opponent);field=json.loads(original.read_text())
    root=Path('balance-diagnostics/weakest-eight-house-20261128')
    state=json.loads((root/'status.json').read_text())
    shares={a:sum(row.values())/len(row) for a,row in state['matrix'].items()}
    rival=min((a for a in shares if a!=leader),key=shares.get)
    field['newest']=rival;field['focusNewest']=True
    training_field=original.with_name(original.stem+'-curriculum-'+leader+'.json')
    training_field.write_text(json.dumps(field,indent=2))
    return common.SubprocVecEnv([lambda i=i:CurriculumGame(i,workers,prefix,leader,str(original),str(training_field)) for i in range(workers)],start_method='spawn')
common.vector=vector
if __name__=='__main__':
    from weakest_league import main
    main()
