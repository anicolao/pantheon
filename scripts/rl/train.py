"""Small, CPU-only, outcome-reward Doreios pilot. Run inside the Nix dev shell."""
import argparse, json, os, subprocess, time, hashlib
from pathlib import Path
import numpy as np
import torch
import gymnasium as gym
from stable_baselines3.common.vec_env import SubprocVecEnv
from stable_baselines3.common.callbacks import BaseCallback
from sb3_contrib import MaskablePPO
from sb3_contrib.common.maskable.utils import get_action_masks

ROOT=Path(__file__).resolve().parents[2]
class Game(gym.Env):
    def __init__(self, rank=0, workers=1, namespace="train", seed_prefix="rl-doreios-v1", potential_scale=0.,leader="doreios",teacher="classic-engine",opponent="mm"):
        self.rank,self.workers,self.namespace,self.counter=rank,workers,namespace,0
        self.seed_prefix=seed_prefix
        self.potential_scale=potential_scale;self.potential=0.;self.initial_potential=0.;self.first_step=True
        self.proc=subprocess.Popen(["bun",str(ROOT/"scripts/rl/bridge.ts"),leader,teacher,opponent],cwd=ROOT,stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,bufsize=1)
        state=self.call(dict(op="reset",seed="rl-v1-schema",first=True))
        self.observation_space=gym.spaces.Box(-np.inf,np.inf,shape=(len(state["observation"]),),dtype=np.float32)
        self.action_space=gym.spaces.Discrete(len(state["mask"]))
        self.mask=np.array(state["mask"],dtype=bool)
    def call(self,q):
        self.proc.stdin.write(json.dumps(q)+"\n");self.proc.stdin.flush()
        line=self.proc.stdout.readline()
        if not line: raise RuntimeError("Game bridge failed; aborting without excluding game")
        return json.loads(line)
    def schedule(self,namespace):
        self.namespace,self.counter=namespace,0
    def reset(self,seed=None,options=None):
        super().reset(seed=seed)
        i=self.rank+self.counter*self.workers;self.counter+=1
        self.state=self.call(dict(op="reset",seed=f"{self.seed_prefix}:{self.namespace}:{i}",first=i%2==0))
        self.mask=np.array(self.state["mask"],dtype=bool)
        self.potential=self.initial_potential=self.state.get("potential",0.);self.first_step=True
        return np.array(self.state["observation"],dtype=np.float32),{}
    def action_masks(self):return self.mask
    def teacher(self):return self.call(dict(op="teacher"))
    def teacher_preview(self):return self.call(dict(op="teacher-preview"))
    def step(self,action):
        s=self.call(dict(op="step",action=int(action)))
        potential=0. if s["done"] else s.get("potential",0.)
        shaping=self.potential_scale*(potential-self.potential+(self.initial_potential if self.first_step else 0.))
        self.potential=potential;self.first_step=False
        if s["done"]:
            s["info"]["outcome"]=s["reward"]
            if self.namespace=="test":s["info"]["replayVerified"]=self.call(dict(op="verify"))
            self.mask=np.zeros(self.action_space.n,dtype=bool)
            return np.zeros(self.observation_space.shape,dtype=np.float32),s["reward"]+shaping,True,False,s["info"]
        self.mask=np.array(s["mask"],dtype=bool)
        return np.array(s["observation"],dtype=np.float32),shaping,False,False,{}
    def close(self):
        if self.proc.poll() is None:
            self.proc.stdin.close()
            self.proc.wait(timeout=10)
        self.proc.stdout.close()

def vector(workers,namespace,seed_prefix="rl-doreios-v1",potential_scale=0.,leader="doreios",teacher="classic-engine",opponent="mm"):
    return SubprocVecEnv([lambda i=i:Game(i,workers,namespace,seed_prefix,potential_scale,leader,teacher,opponent) for i in range(workers)],start_method="spawn")

def evaluate(vec,model,namespace,n,teacher=False):
    assert n%vec.num_envs==0
    vec.env_method("schedule",namespace);obs=vec.reset()
    counts=np.zeros(vec.num_envs,dtype=int);quota=n//vec.num_envs;rows=[]
    while np.any(counts<quota):
        if teacher:actions=vec.env_method("teacher")
        else:actions,_=model.predict(obs,action_masks=get_action_masks(vec),deterministic=True)
        obs,rew,done,infos=vec.step(actions)
        for i in range(vec.num_envs):
            if done[i] and counts[i]<quota:
                info={k:v for k,v in infos[i].items() if k not in ["terminal_observation","TimeLimit.truncated"]}
                rows.append(dict(**info,reward=float(rew[i])));counts[i]+=1
    rows.sort(key=lambda r:int(r["seed"].rsplit(":",1)[1]))
    assert len({r["seed"] for r in rows})==n
    return rows

def stats(rows,by_opponent=True):
    n=len(rows);w=sum(r["reward"]==1 for r in rows);t=sum(r["reward"]==0 for r in rows)
    z=1.95996398454;p=w/n;den=1+z*z/n;center=(p+z*z/(2*n))/den;half=z*((p*(1-p)/n+z*z/(4*n*n))**.5)/den
    result=dict(games=n,wins=w,ties=t,losses=n-w-t,share=(w+t*.5)/n,winCI95=[center-half,center+half])
    if by_opponent and rows and "opponentLeader" in rows[0]:
        result["opponents"]={leader:stats([r for r in rows if r["opponentLeader"]==leader],False) for leader in sorted({r["opponentLeader"] for r in rows})}
    if by_opponent and rows and "opponentId" in rows[0]:
        result["matchups"]={key:stats([r for r in rows if r["opponentId"]==key],False) for key in sorted({r["opponentId"] for r in rows})}
    return result
def paired(a,b):
    assert [r["seed"] for r in a]==[r["seed"] for r in b]
    d=np.array([(x["reward"]-y["reward"])/2 for x,y in zip(a,b)])
    m=float(d.mean());h=1.96*float(d.std(ddof=1))/len(d)**.5
    return dict(shareDelta=m,pairedApprox95CI=[m-h,m+h])
class Progress(BaseCallback):
    def __init__(self):
        super().__init__();self.started=time.monotonic();self.games=0;self.rewards=[]
    def _on_step(self):
        for done,reward,info in zip(self.locals["dones"],self.locals["rewards"],self.locals["infos"]):
            if done:self.games+=1;self.rewards.append(float(info.get("outcome",reward)))
        if self.num_timesteps%16384==0:
            print(json.dumps(dict(stage="training",steps=self.num_timesteps,games=self.games,
                recentMeanReward=float(np.mean(self.rewards[-100:])) if self.rewards else None,
                elapsedSeconds=time.monotonic()-self.started)),flush=True)
        return True

def main():
    p=argparse.ArgumentParser();p.add_argument("--output",required=True);p.add_argument("--workers",type=int,default=8)
    p.add_argument("--imitation-games",type=int,default=256);p.add_argument("--steps",type=int,default=524288)
    p.add_argument("--evaluation-games",type=int,default=1000);p.add_argument("--validation-games",type=int,default=128)
    args=p.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
    if (out/"protocol.json").exists():raise RuntimeError("Use a fresh output directory")
    torch.set_num_threads(1);torch.manual_seed(1701);np.random.seed(1701)
    protocol=dict(vars(args),seed=1701,algorithm="MaskablePPO",reward="terminal loss=-1 tie=0 win=1; zero intermediate reward",
      opponent="frozen MM v3 Melia",leader="Doreios",split="disjoint imitation/train/validation/test seed namespaces",
      sourceCommit=subprocess.check_output(["git","rev-parse","HEAD"],text=True).strip(),
      sourceHashes={str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for f in (ROOT/"scripts/rl").glob("*") if f.is_file()},
      learner="two 64-unit tanh layers; all gameplay commands; no hidden order or opponent hands; deterministic evaluation",
      selection="highest validation share among BC and fixed RL checkpoints; earlier checkpoint wins ties")
    (out/"protocol.json").write_text(json.dumps(protocol,indent=2))
    started=time.monotonic();vec=vector(args.workers,"imitation")
    model=MaskablePPO("MlpPolicy",vec,seed=1701,device="cpu",n_steps=256,batch_size=256,n_epochs=4,
      learning_rate=1e-4,gamma=1.,gae_lambda=.95,ent_coef=.003,target_kl=.03,policy_kwargs=dict(net_arch=dict(pi=[64,64],vf=[64,64])),verbose=0)
    # Teacher trajectories on separate seeds, including losses: do not select winners only.
    obs=vec.reset();xs=[];ms=[];ys=[];completed=0
    while completed<args.imitation_games:
        masks=get_action_masks(vec);actions=np.array(vec.env_method("teacher"))
        xs.append(obs.copy());ms.append(masks.copy());ys.append(actions)
        obs,_,done,_=vec.step(actions);completed+=int(done.sum())
    x=torch.tensor(np.concatenate(xs));m=torch.tensor(np.concatenate(ms));y=torch.tensor(np.concatenate(ys),dtype=torch.long)
    optimizer=torch.optim.Adam(model.policy.parameters(),lr=1e-3)
    for epoch in range(12):
        permutation=torch.randperm(len(y));losses=[]
        for idx in permutation.split(512):
            dist=model.policy.get_distribution(x[idx],action_masks=m[idx])
            loss=-dist.log_prob(y[idx]).mean()
            optimizer.zero_grad();loss.backward();torch.nn.utils.clip_grad_norm_(model.policy.parameters(),.5);optimizer.step()
            losses.append(float(loss.detach()))
        print(json.dumps(dict(stage="imitation",epoch=epoch+1,loss=float(np.mean(losses)),samples=len(y))),flush=True)
    model.save(out/"bc")
    evaluations={};validation=evaluate(vec,model,"validation",args.validation_games)
    evaluations["bc"]=stats(validation);best="bc";best_share=evaluations["bc"]["share"]
    print(json.dumps(dict(stage="validation",checkpoint="bc",**evaluations["bc"])),flush=True)
    (out/"validation-bc.json").write_text(json.dumps(validation))
    vec.env_method("schedule","train");model.set_env(vec)
    train_start=time.monotonic();stages=4;progress=Progress()
    for stage in range(stages):
        model.learn(total_timesteps=args.steps//stages,reset_num_timesteps=stage==0,callback=progress)
        label=f"ppo-{model.num_timesteps}";model.save(out/label)
        # Separate environment ensures validation never enters rollout data.
        ev=vector(args.workers,"validation")
        try: rows=evaluate(ev,model,"validation",args.validation_games)
        finally:ev.close()
        evaluations[label]=stats(rows);(out/f"validation-{label}.json").write_text(json.dumps(rows))
        if evaluations[label]["share"]>best_share:best,best_share=label,evaluations[label]["share"]
        print(json.dumps(dict(stage="validation",checkpoint=label,elapsedSeconds=time.monotonic()-train_start,**evaluations[label])),flush=True)
    # Checkpoint selection is frozen before any final test result is inspected.
    (out/"selection.json").write_text(json.dumps(dict(selected=best,validation=evaluations),indent=2))
    ev=vector(args.workers,"test")
    try:
        baseline=evaluate(ev,None,"test",args.evaluation_games,teacher=True)
        bc=evaluate(ev,MaskablePPO.load(out/"bc",device="cpu"),"test",args.evaluation_games)
        chosen=bc if best=="bc" else evaluate(ev,MaskablePPO.load(out/best,device="cpu"),"test",args.evaluation_games)
    finally:ev.close();vec.close()
    results=dict(selected=best,classic=stats(baseline),imitation=stats(bc),selectedModel=stats(chosen),
      trainingGames=progress.games,trainingSteps=model.num_timesteps,selectedVsClassic=paired(chosen,baseline),selectedVsImitation=paired(chosen,bc),elapsedSeconds=time.monotonic()-started)
    for name,rows in [("classic",baseline),("bc",bc),("selected",chosen)]:
        (out/f"test-{name}.json").write_text(json.dumps(rows))
    (out/"results.json").write_text(json.dumps(results,indent=2));print(json.dumps(results),flush=True)

if __name__=="__main__":main()
