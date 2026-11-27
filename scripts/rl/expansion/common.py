"""Shared transport and tensor export for sequential expansion training."""
import base64,hashlib,json,math,subprocess,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import numpy as np
import torch
import gymnasium as gym
from sb3_contrib import MaskablePPO
from stable_baselines3.common.vec_env import SubprocVecEnv
from train import evaluate,Progress
from train_v2 import collect,fit
ROOT=Path(__file__).resolve().parents[3]
class Game(gym.Env):
    def __init__(self,rank,workers,prefix,leader,opponent):
        self.rank,self.workers,self.prefix=rank,workers,prefix
        self.namespace,self.counter='schema',0
        self.proc=subprocess.Popen(['bun',str(ROOT/'scripts/rl/expansion/bridge.ts'),leader,'teacher',opponent],cwd=ROOT,stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,bufsize=1)
        s=self.call(dict(op='reset',seed=prefix+':schema:0'))
        self.observation_space=gym.spaces.Box(-np.inf,np.inf,shape=(len(s['observation']),),dtype=np.float32)
        self.action_space=gym.spaces.Discrete(len(s['mask']));self.mask=np.array(s['mask'],dtype=bool)
    def call(self,q):
        self.proc.stdin.write(json.dumps(q)+'\n');self.proc.stdin.flush()
        line=self.proc.stdout.readline()
        if not line:raise RuntimeError('Bridge failed: no games may be excluded')
        return json.loads(line)
    def schedule(self,namespace):self.namespace,self.counter=namespace,0
    def reset(self,seed=None,options=None):
        super().reset(seed=seed);i=self.rank+self.counter*self.workers;self.counter+=1
        s=self.call(dict(op='reset',seed=f'{self.prefix}:{self.namespace}:{i}'));self.mask=np.array(s['mask'],dtype=bool)
        return np.array(s['observation'],dtype=np.float32),{}
    def action_masks(self):return self.mask
    def teacher(self):return self.call(dict(op='teacher'))
    def teacher_preview(self):return self.teacher()
    def step(self,action):
        s=self.call(dict(op='step',action=int(action)))
        if s['done']:
            self.mask=np.zeros(self.action_space.n,dtype=bool)
            return np.zeros(self.observation_space.shape,dtype=np.float32),s['reward'],True,False,s['info']
        self.mask=np.array(s['mask'],dtype=bool)
        return np.array(s['observation'],dtype=np.float32),0.,False,False,{}
    def close(self):
        if self.proc.poll() is None:self.proc.stdin.close();self.proc.wait(timeout=10)
        self.proc.stdout.close()
def vector(workers,prefix,leader,opponent):
    return SubprocVecEnv([lambda i=i:Game(i,workers,prefix,leader,opponent) for i in range(workers)],start_method='spawn')
def summary(rows):
    blocks={}
    for r in rows:
        assert r['replayVerified'];blocks.setdefault(r['block'],[]).append(r)
    for group in blocks.values():
        assert len(group)==2 and {r['first'] for r in group}=={True,False}
    values=np.array([np.mean([r['share'] for r in group]) for group in blocks.values()]);mean=float(values.mean())
    # Bounded Wilson approximation at the independent seed-block level, including all-zero/all-one results.
    z=1.96;n=len(values);den=1+z*z/n;center=(mean+z*z/(2*n))/den;half=z*math.sqrt(mean*(1-mean)/n+z*z/(4*n*n))/den
    return dict(games=len(rows),share=mean,blockWilson95CI=[max(0,center-half),min(1,center+half)],meanTurns=float(np.mean([r['turns'] for r in rows])))
def export(model,leader,path,schema,checkpoint):
    state=model.policy.state_dict();layers=[]
    for key in ['mlp_extractor.policy_net.0','mlp_extractor.policy_net.2','action_net']:
        w=state[key+'.weight'].cpu().numpy().astype('<f4');b=state[key+'.bias'].cpu().numpy().astype('<f4')
        layers.append(dict(input=w.shape[1],output=w.shape[0],weights=base64.b64encode(w.tobytes()).decode(),bias=base64.b64encode(b.tobytes()).decode()))
    path.write_text(json.dumps(dict(version=1,leader=leader,schemaSignature=schema,checkpointSHA256=hashlib.sha256(checkpoint.read_bytes()).hexdigest(),dtype='float32-le',activation='tanh',layers=layers)))
    return dict(path=str(path.resolve()),sha256=hashlib.sha256(path.read_bytes()).hexdigest())

def close_vector(vec):
    # SubprocVecEnv.close() may wait for replies already consumed before a worker
    # exception. On failure terminate owned workers and propagate the exception.
    if sys.exc_info()[0] is not None:
        for process in vec.processes:
            if process.is_alive():process.terminate()
        for process in vec.processes:process.join(timeout=5)
        vec.closed=True
    else:vec.close()
