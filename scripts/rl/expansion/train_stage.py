"""Sequential introduction: frozen opponents per round, immutable checkpoints and held-out audits."""
import argparse,json,signal,subprocess,time
from pathlib import Path
from common import *
def main():
    def stop(signum,frame):raise KeyboardInterrupt
    signal.signal(signal.SIGTERM,stop)
    p=argparse.ArgumentParser();p.add_argument('--previous',required=True);p.add_argument('--output',required=True);p.add_argument('--newest',required=True);p.add_argument('--prefix',required=True)
    p.add_argument('--workers',type=int,default=16);p.add_argument('--steps',type=int,default=131072);p.add_argument('--rounds',type=int,default=2);p.add_argument('--imitation-games',type=int,default=512);p.add_argument('--epochs',type=int,default=20);p.add_argument('--screen-games',type=int,default=128);p.add_argument('--test-games',type=int,default=384);p.add_argument('--uniform',action='store_true');args=p.parse_args()
    assert args.workers%2==0 and args.screen_games%args.workers==0 and args.test_games%args.workers==0
    out=Path(args.output).resolve();out.mkdir(parents=True,exist_ok=False)
    torch.set_num_threads(1);torch.manual_seed(27112028);np.random.seed(27112028)
    previous=json.loads(Path(args.previous).read_text());heroes=previous['stageLeaders'][:];is_new=args.newest not in heroes
    if is_new:heroes.append(args.newest)
    assert heroes==['echo','thaleia','nereon','melia','doreios','theseus','achilles','perseus'][:len(heroes)]
    assert args.newest==heroes[-1]
    meta=json.loads(subprocess.check_output(['bun','scripts/rl/expansion/metadata.ts'],text=True))
    protocol=dict(vars(args),stageLeaders=heroes,sourceCommit=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),previousSHA256=hashlib.sha256(Path(args.previous).read_bytes()).hexdigest(),schema=meta['schema'],reward='terminal win=1 tie=0 loss=-1; gamma=1; no intermediate rewards',sampling='balanced first/second per seed; 50% newest opponent and 50% other introduced opponents (newest learner faces all others); consolidation uses uniform opponents',market='Reject only seeds whose filler houses are not yet introduced; never condition on cards drawn or outcomes',selection='BC/incumbent and two PPO checkpoints on disjoint screening seeds; earliest breaks ties; fresh confirmation reports do not select policies',sourceHashes={str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for f in [ROOT/'flake.nix',ROOT/'flake.lock',*sorted((ROOT/'scripts/rl/expansion').glob('*.ts')),*sorted((ROOT/'scripts/rl/expansion').glob('*.py')),*sorted((ROOT/'src/lib/game').glob('*.ts')),ROOT/'src/lib/bots/rl-runtime.ts',ROOT/'scripts/rl/train.py',ROOT/'scripts/rl/train_v2.py']})
    (out/'protocol.json').write_text(json.dumps(protocol,indent=2))
    current=dict(stageLeaders=heroes,newest=args.newest,focusNewest=not args.uniform,actors=previous['actors'].copy(),checkpoints=previous['checkpoints'].copy())
    bootstrap=out/'bootstrap-field.json';bootstrap.write_text(json.dumps(current,indent=2))
    if is_new:
        vec=vector(args.workers,args.prefix+':bootstrap',args.newest,str(bootstrap))
        try:
            model=MaskablePPO('MlpPolicy',vec,seed=27112028+len(heroes),device='cpu',n_steps=256,batch_size=256,n_epochs=4,learning_rate=1e-4,gamma=1.,gae_lambda=1.,ent_coef=.003,target_kl=.02,policy_kwargs=dict(net_arch=dict(pi=[128,128],vf=[128,128])))
            data,n=collect(vec,model,args.imitation_games,'imitation');fit(model,data,args.epochs,args.newest+'-imitation');model.save(out/args.newest)
            current['actors'][args.newest]=export(model,args.newest,out/(args.newest+'.json'),meta['schema'],out/(args.newest+'.zip'));current['checkpoints'][args.newest]=str(out/(args.newest+'.zip'))
        finally:vec.close()
    for round_index in range(1,args.rounds+1):
        folder=out/f'round-{round_index}';folder.mkdir();frozen=folder/'frozen-field.json';frozen.write_text(json.dumps(current,indent=2));selected=dict(stageLeaders=heroes,newest=args.newest,focusNewest=not args.uniform,actors={},checkpoints={});results={}
        for leader in heroes:
            target=folder/leader;target.mkdir();vec=vector(args.workers,args.prefix+f':round-{round_index}',leader,str(frozen))
            try:
                model=MaskablePPO.load(current['checkpoints'][leader],env=vec,device='cpu',learning_rate=1e-4);model.set_random_seed(27112028+100*len(heroes)+10*round_index+heroes.index(leader));model.save(target/'incumbent')
                def assess(label,namespace,n):
                    rows=evaluate(vec,model,namespace,n);(target/f'{label}-{namespace}.json').write_text(json.dumps(rows));result=summary(rows)
                    result['opponents']={other:dict(games=len([r for r in rows if r['opponentLeader']==other]),share=float(np.mean([r['share'] for r in rows if r['opponentLeader']==other]))) for other in sorted({r['opponentLeader'] for r in rows})}
                    print(json.dumps(dict(stage=namespace,newest=args.newest,round=round_index,leader=leader,checkpoint=label,**result)),flush=True);return result
                scores={'incumbent':assess('incumbent','screen',args.screen_games)}
                for segment in range(2):
                    vec.env_method('schedule',f'train-{segment}');model._last_obs=None
                    model.learn(total_timesteps=args.steps//2,reset_num_timesteps=segment==0,callback=Progress());label=f'ppo-{segment+1}';model.save(target/label);scores[label]=assess(label,'screen',args.screen_games)
                best=max(scores,key=lambda k:scores[k]['share']);(target/'selection.json').write_text(json.dumps(dict(selected=best,screen=scores),indent=2))
                model=MaskablePPO.load(target/'incumbent',device='cpu');baseline=assess('incumbent','test',args.test_games)
                model=MaskablePPO.load(target/best,device='cpu');candidate=assess(best,'test',args.test_games)
                selected['actors'][leader]=export(model,leader,target/'selected.json',meta['schema'],target/(best+'.zip'));selected['checkpoints'][leader]=str(target/(best+'.zip'))
                results[leader]=dict(selected=best,baseline=baseline,candidate=candidate);(folder/'results.json').write_text(json.dumps(results,indent=2))
            finally:vec.close()
        current=selected;(folder/'selected-field.json').write_text(json.dumps(current,indent=2))
    (out/'selected-field.json').write_text(json.dumps(current,indent=2));print(json.dumps(dict(stage='stage-complete',newest=args.newest,rounds=args.rounds)),flush=True)
if __name__=='__main__':main()
