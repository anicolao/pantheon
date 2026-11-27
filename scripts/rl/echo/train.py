"""Checkpointed Echo-first league pilot. All dependencies come from flake.nix#rl."""
import argparse, base64, hashlib, json, math, subprocess, sys, time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import numpy as np
import torch
import gymnasium as gym
from sb3_contrib import MaskablePPO
from stable_baselines3.common.vec_env import SubprocVecEnv
from train import evaluate, Progress
from train_v2 import collect, fit
ROOT=Path(__file__).resolve().parents[3]
LEADERS=['echo','thaleia','nereon','melia','doreios']
class Game(gym.Env):
    def __init__(self,rank,workers,prefix,leader,opponent):
        self.rank,self.workers,self.prefix=rank,workers,prefix
        self.namespace,self.counter='schema',0
        self.proc=subprocess.Popen(['bun',str(ROOT/'scripts/rl/echo/bridge.ts'),leader,'teacher',opponent],cwd=ROOT,stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,bufsize=1)
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
        assert len(group)==4 and {r['turnPosition'] for r in group}==set(range(4))
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
def initialize_shipped_actor(model,leader,action_map):
    data=json.loads((ROOT/f'src/lib/bots/models/{leader}.json').read_text())
    def tensor(text,shape):return torch.from_numpy(np.frombuffer(base64.b64decode(text),dtype='<f4').copy().reshape(shape))
    with torch.no_grad():
        for i,key in enumerate(['mlp_extractor.policy_net.0','mlp_extractor.policy_net.2','action_net']):
            layer=data['layers'][i];w=tensor(layer['weights'],(layer['output'],layer['input']));b=tensor(layer['bias'],(layer['output'],))
            target=dict(model.policy.named_parameters())
            if i==0:
                target[key+'.weight'].zero_();target[key+'.weight'][:,:w.shape[1]].copy_(w);target[key+'.bias'].copy_(b)
            elif i==1:
                target[key+'.weight'].copy_(w);target[key+'.bias'].copy_(b)
            else:
                for old,new in enumerate(action_map):
                    assert new>=0
                    target[key+'.weight'][new].copy_(w[old]);target[key+'.bias'][new].copy_(b[old])
def main():
    p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--prefix',required=True);p.add_argument('--workers',type=int,default=8);p.add_argument('--imitation-games',type=int,default=128);p.add_argument('--screen-games',type=int,default=64);p.add_argument('--test-games',type=int,default=256);p.add_argument('--steps',type=int,default=65536);p.add_argument('--epochs',type=int,default=12);a=p.parse_args()
    assert a.workers%4==0 and a.screen_games%a.workers==0 and a.test_games%a.workers==0
    out=Path(a.output).resolve();out.mkdir(parents=True,exist_ok=False)
    torch.set_num_threads(1);torch.manual_seed(27112026);np.random.seed(27112026)
    schema=subprocess.check_output(['bun','-e',"import {schemaSignature} from './scripts/rl/echo/schema';console.log(schemaSignature)"],cwd=ROOT,text=True).strip()
    action_map=json.loads(subprocess.check_output(['bun','-e',"import {legacyActionMap} from './scripts/rl/echo/schema';console.log(JSON.stringify(legacyActionMap))"],cwd=ROOT,text=True))
    protocol=dict(vars(a),sourceCommit=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),schema=schema,seed=27112026,architecture='128x128 tanh actor and critic; original leaders transfer shipped actor weights and retain old action logits; Echo starts from heuristic imitation; new feature columns zero for transfers; new action rows initialized by PPO',reward='terminal 2*winShare-1; gamma=1; zero intermediate rewards',curriculum='Echo + three original leaders, omitted original rotates per block; four seats per game seed; no Hermes/Nike/Hades',opponents='Bootstrap heuristic, then frozen imitation policies for the entire PPO round',selection='Highest screen win share among BC and two PPO checkpoints; earlier checkpoint breaks ties; final tests never select models',sourceHashes={str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for f in [ROOT/'flake.nix',ROOT/'flake.lock',*sorted((ROOT/'scripts/rl/echo').glob('*.ts')),*sorted((ROOT/'scripts/rl/echo').glob('*.py')),*sorted((ROOT/'src/lib/bots/models').glob('*.json')),ROOT/'src/lib/game/actions.ts',ROOT/'src/lib/game/setup.ts']})
    (out/'protocol.json').write_text(json.dumps(protocol,indent=2));actors={};results={};start=time.monotonic()
    for leader in LEADERS:
        folder=out/leader;folder.mkdir();vec=vector(a.workers,a.prefix,leader,'teacher')
        try:
            model=MaskablePPO('MlpPolicy',vec,seed=27112026+LEADERS.index(leader),device='cpu',n_steps=256,batch_size=256,n_epochs=4,learning_rate=1e-4,gamma=1.,gae_lambda=1.,ent_coef=.003,target_kl=.02,policy_kwargs=dict(net_arch=dict(pi=[128,128],vf=[128,128])))
            if leader=='echo':
                data,n=collect(vec,model,a.imitation_games,'imitation');fit(model,data,a.epochs,leader+'-imitation')
            else:
                initialize_shipped_actor(model,leader,action_map);n=0
            model.save(folder/'bc');actors[leader]=export(model,leader,folder/'bc.json',schema,folder/'bc.zip')
            print(json.dumps(dict(stage='bootstrap-complete',leader=leader,games=n,seconds=time.monotonic()-start)),flush=True)
        finally:vec.close()
    manifest=out/'frozen-round-1.json';manifest.write_text(json.dumps(dict(actors=actors),indent=2))
    selected={}
    for leader in LEADERS:
        folder=out/leader;vec=vector(a.workers,a.prefix,leader,str(manifest));scores={}
        try:
            model=MaskablePPO.load(folder/'bc',env=vec,device='cpu')
            def assess(label,namespace,n):
                rows=evaluate(vec,model,namespace,n);(folder/f'{label}-{namespace}.json').write_text(json.dumps(rows));s=summary(rows);print(json.dumps(dict(stage=namespace,leader=leader,checkpoint=label,**s)),flush=True);return s
            scores['bc']=assess('bc','screen',a.screen_games)
            for stage in range(2):
                vec.env_method('schedule',f'train-{stage}');model.learn(total_timesteps=a.steps//2,reset_num_timesteps=stage==0,callback=Progress());label=f'ppo-{stage+1}';model.save(folder/label);scores[label]=assess(label,'screen',a.screen_games)
            best=max(scores,key=lambda k:scores[k]['share']);(folder/'selection.json').write_text(json.dumps(dict(selected=best,screen=scores),indent=2))
            model=MaskablePPO.load(folder/'bc',device='cpu');baseline=assess('bc','test',a.test_games)
            model=MaskablePPO.load(folder/best,device='cpu');candidate=assess(best,'test',a.test_games)
            selected[leader]=export(model,leader,folder/'selected.json',schema,folder/(best+'.zip'))
            results[leader]=dict(selected=best,baseline=baseline,candidate=candidate)
            (out/'results.json').write_text(json.dumps(results,indent=2))
        finally:vec.close()
    (out/'selected-field.json').write_text(json.dumps(dict(actors=selected),indent=2))
if __name__=='__main__':main()
