"""Improve the last-ranked policy; frozen opponents, paired gates, recoverable artifacts."""
import argparse, copy, json, subprocess, time, hashlib
from pathlib import Path
from common import *

NEW = {'echo','theseus','achilles','perseus'}

def write(path, data):
    path=Path(path); tmp=path.with_suffix(path.suffix+'.tmp')
    tmp.write_text(json.dumps(data,indent=2));tmp.replace(path)

def paired(before,after):
    assert [r['seed'] for r in before]==[r['seed'] for r in after]
    blocks={}
    for a,b in zip(before,after):
        assert (a['opponentLeader'],a['first'],a['gameSeed'])==(b['opponentLeader'],b['first'],b['gameSeed'])
        blocks.setdefault(a['block'],[]).append(b['share']-a['share'])
    assert all(len(v)==2 for v in blocks.values())
    values=np.array([np.mean(v) for v in blocks.values()])
    mean=float(values.mean());half=1.96*float(values.std(ddof=1))/len(values)**.5
    return dict(delta=mean,CI95=[mean-half,mean+half],pairedSeeds=len(values))

def rankings(matrix):
    return {a:float(np.mean(list(row.values()))) for a,row in matrix.items()}

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--previous',required=True);p.add_argument('--output',required=True)
    p.add_argument('--workers',type=int,default=16);p.add_argument('--steps',type=int,default=262144)
    p.add_argument('--screen',type=int,default=448);p.add_argument('--confirm',type=int,default=1792)
    p.add_argument('--rank-games',type=int,default=224);p.add_argument('--max-attempts',type=int,default=80)
    p.add_argument('--resume',action='store_true');args=p.parse_args()
    out=Path(args.output).resolve();out.mkdir(parents=True,exist_ok=args.resume)
    assert args.workers%2==0 and args.screen%args.workers==args.confirm%args.workers==0
    torch.set_num_threads(1)
    initial=json.loads(Path(args.previous).read_text());initial['focusNewest']=False
    meta=json.loads(subprocess.check_output(['bun','scripts/rl/expansion/metadata.ts'],text=True))
    prefix='weakest-20261128-v1'
    sources=[*sorted((ROOT/'scripts/rl/expansion').glob('*.py')),*sorted((ROOT/'scripts/rl/expansion').glob('*.ts')),*sorted((ROOT/'src/lib/game').glob('*.ts')),ROOT/'src/lib/bots/expansion-schema.ts',ROOT/'src/lib/bots/rl-runtime.ts',ROOT/'flake.nix',ROOT/'flake.lock']
    hashes={str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for f in sources}
    protocol=dict(args=vars(args),prefix=prefix,sources=hashes,initial=initial,reward='terminal win/tie/loss +1/0/-1; gamma=1; no shaping',selection='4 checkpoints screened; fresh paired confirmation lower 95% bound >0 vs incumbent AND original; field ranking adapts, final audit uses untouched seeds')
    if args.resume:
        old=json.loads((out/'protocol.json').read_text())
        assert old['sources']==hashes and old['initial']==initial
        assert {k:v for k,v in old['args'].items() if k!='resume'}=={k:v for k,v in vars(args).items() if k!='resume'}
        state=json.loads((out/'status.json').read_text())
    else:
        write(out/'protocol.json',protocol);write(out/'initial-field.json',initial)
        baseline=json.loads((ROOT/'docs/research/eight-house-league-2026-11-27/analysis.json').read_text())['matrix']
        state=dict(attempt=0,field=initial,matrix={a:{b:r['share'] for b,r in row.items()} for a,row in baseline.items()},promoted=[],escaped=[],history=[],state='running')
        write(out/'status.json',state)
    def rank_field(field,folder,seed_prefix,games):
        folder.mkdir(exist_ok=True);manifest=folder/'field.json';write(manifest,field)
        with (folder/'matrix.log').open('a') as log:
            subprocess.run(['bun','scripts/rl/expansion/matrix.ts',str(manifest),str(folder/'matrix'),str(games),str(args.workers),seed_prefix],stdout=log,stderr=subprocess.STDOUT,check=True)
        matrix={a:{} for a in field['stageLeaders']}
        for result in (folder/'matrix').glob('*/results.json'):
            a,b=result.parent.name.split('--');rows=json.loads(result.read_text());score=summary(rows)['share']
            matrix[a][b]=score;matrix[b][a]=1-score
        assert all(len(row)==7 for row in matrix.values())
        write(folder/'ranking.json',rankings(matrix))
        return matrix
    for attempt in range(state['attempt']+1,args.max_attempts+1):
        shares=rankings(state['matrix']);leader=min(shares,key=shares.get)
        folder=out/f'attempt-{attempt:03d}-{leader}'
        if folder.exists():folder.rename(out/(folder.name+f'-interrupted-{time.time_ns()}'))
        folder.mkdir();frozen=folder/'frozen-field.json';write(frozen,state['field'])
        write(out/'progress.json',dict(state='training',attempt=attempt,leader=leader,ranking=shares,improved=state['promoted'],escaped=state['escaped']))
        print(json.dumps(dict(stage='attempt',attempt=attempt,leader=leader,ranking=shares)),flush=True)
        vec=vector(args.workers,f'{prefix}:attempt-{attempt}',leader,str(frozen))
        try:
            # Continue rejected training while the field is unchanged, preserving the accepted incumbent.
            warm=state.get('warm')
            start=warm['checkpoint'] if warm and warm['leader']==leader else state['field']['checkpoints'][leader]
            failed=sum(h['leader']==leader and not h['accepted'] for h in state['history'])
            lr=[1e-4,1e-4,5e-5,2e-4][failed%4]
            entropy=[.003,.006,.003,.01][failed%4]
            model=MaskablePPO.load(start,env=vec,device='cpu',learning_rate=lr,ent_coef=entropy)
            model.set_random_seed(28112026+attempt)
            def assess(model,label,namespace,n):
                rows=evaluate(vec,model,namespace,n);write(folder/f'{label}-{namespace}.json',rows)
                print(json.dumps(dict(stage=namespace,attempt=attempt,leader=leader,label=label,**summary(rows))),flush=True)
                return rows
            incumbent=MaskablePPO.load(state['field']['checkpoints'][leader],device='cpu')
            screen={'incumbent':summary(assess(incumbent,'incumbent','screen',args.screen))['share']}
            for segment in range(4):
                vec.env_method('schedule',f'train-{segment}');model._last_obs=None
                model.learn(total_timesteps=args.steps//4,reset_num_timesteps=segment==0,callback=Progress())
                label=f'ppo-{segment+1}';model.save(folder/label)
                screen[label]=summary(assess(model,label,'screen',args.screen))['share']
            best=max(screen,key=screen.get)
            write(folder/'selection.json',dict(selected=best,screen=screen,learningRate=lr,entropy=entropy))
            if best!='incumbent':
                state['warm']=dict(leader=leader,checkpoint=str(folder/(best+'.zip')))
            else:
                # A continuation that loses even on screening should not replace
                # the accepted starting point for the following attempt.
                state.pop('warm',None)
            accepted=False;detail={}
            if best!='incumbent':
                candidate=MaskablePPO.load(folder/best,device='cpu')
                before=assess(incumbent,'incumbent','confirm',args.confirm)
                after=assess(candidate,best,'confirm',args.confirm)
                original=MaskablePPO.load(initial['checkpoints'][leader],device='cpu')
                original_rows=before if state['field']['checkpoints'][leader]==initial['checkpoints'][leader] else assess(original,'original','confirm',args.confirm)
                detail=dict(vsIncumbent=paired(before,after),vsOriginal=paired(original_rows,after),before=summary(before),after=summary(after))
                accepted=detail['vsIncumbent']['CI95'][0]>0 and detail['vsOriginal']['CI95'][0]>0
                if accepted:
                    field=copy.deepcopy(state['field'])
                    field['actors'][leader]=export(candidate,leader,folder/'selected.json',meta['schema'],folder/(best+'.zip'))
                    field['checkpoints'][leader]=str(folder/(best+'.zip'))
                    state['field']=field
                    if leader not in state['promoted']:state['promoted'].append(leader)
                    state.pop('warm',None)
            write(folder/'result.json',dict(leader=leader,accepted=accepted,selected=best,**detail))
        finally:close_vector(vec)
        if accepted:
            state['matrix']=rank_field(state['field'],folder/'ranking',prefix+f':rank-{attempt}',args.rank_games)
            ranked=rankings(state['matrix'])
            if leader!=min(ranked,key=ranked.get) and leader not in state['escaped']:state['escaped'].append(leader)
        state['attempt']=attempt;state['history'].append(dict(attempt=attempt,leader=leader,accepted=accepted,selected=best,**detail))
        write(out/'selected-field.json',state['field']);write(out/'status.json',state)
        print(json.dumps(dict(stage='result',attempt=attempt,leader=leader,accepted=accepted,ranking=rankings(state['matrix']),improved=state['promoted'],escaped=state['escaped'])),flush=True)
        if NEW.issubset(state['promoted']) and NEW.issubset(state['escaped']):
            # Audit all four against their original actors in the SAME final opponent field.
            final=out/f'final-{attempt}';final.mkdir();frozen=final/'field.json';write(frozen,state['field'])
            audits={}
            for hero in sorted(NEW):
                vec=vector(args.workers,prefix+f':final-{attempt}',hero,str(frozen))
                try:
                    a=evaluate(vec,MaskablePPO.load(initial['checkpoints'][hero],device='cpu'),'audit',3584)
                    b=evaluate(vec,MaskablePPO.load(state['field']['checkpoints'][hero],device='cpu'),'audit',3584)
                    write(final/f'{hero}-original.json',a);write(final/f'{hero}-new.json',b)
                    audits[hero]=dict(before=summary(a),after=summary(b),paired=paired(a,b))
                finally:close_vector(vec)
            write(final/'comparisons.json',audits)
            if all(r['paired']['CI95'][0]>0 for r in audits.values()):
                state['matrix']=rank_field(state['field'],final/'crossplay',prefix+f':final-matrix-{attempt}',1000)
                state['state']='complete';state['finalAudit']=str(final);write(out/'status.json',state)
                print(json.dumps(dict(stage='complete',audit=str(final),ranking=rankings(state['matrix']))),flush=True);return
            # A failed final comparison becomes development evidence; subsequent audit uses fresh seeds.
            for hero,r in audits.items():
                if r['paired']['CI95'][0]<=0:state['promoted'].remove(hero)
            write(out/'status.json',state)
    state['state']='attempt-limit';write(out/'status.json',state)
    raise RuntimeError('Attempt limit reached; objective incomplete, checkpoints preserved')
if __name__=='__main__':main()
