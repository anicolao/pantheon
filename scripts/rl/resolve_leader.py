"""Apply the saved Nereon promotion rule, freeze the winner, then run its final test."""
import argparse,json,statistics,math,hashlib,shutil,subprocess,sys
from pathlib import Path

def run(root):
    leader=root/'nereon';rule=json.loads((leader/'promotion-rule.json').read_text())
    if (leader/'decision.json').exists():raise RuntimeError('Decision already frozen')
    candidates=[]
    for direction in ['rl-a','explore','faster']:
        result=json.loads((leader/direction/'results.json').read_text())
        for name,score in result['checkpoints'].items():
            added=int(name.split('-')[-1]);lineage=added+(0 if direction=='rl-a' else 1048576)
            candidates.append(dict(path=str(leader/direction/name),screen=score,lineageDecisions=lineage))
    best=max(candidates,key=lambda x:(x['screen']['wins'],x['screen']['share'],-x['lineageDecisions']))
    incumbent=rule['incumbent'];selected=incumbent;comparison=None
    if best['path']!=incumbent:
        config=dict(leader='nereon',teacher='money',output=str(leader/'confirm-b'),workers=8,
            prefix=rule['prefix'],namespace=rule['namespace'],games=1024,
            models={'candidate':best['path'],'incumbent':incumbent},baselines=['incumbent'])
        file=root/'configs/nereon-confirm-b.json';file.write_text(json.dumps(config,indent=2))
        subprocess.run([sys.executable,'scripts/rl/evaluate_checkpoints.py',str(file)],check=True)
        a=json.loads((leader/'confirm-b/candidate.json').read_text());b=json.loads((leader/'confirm-b/incumbent.json').read_text())
        assert [r['seed'] for r in a]==[r['seed'] for r in b]
        d=[float(x['reward']==1)-float(y['reward']==1) for x,y in zip(a,b)]
        mean=statistics.mean(d);half=1.96*statistics.stdev(d)/math.sqrt(len(d));ci=[mean-half,mean+half]
        stats=json.loads((leader/'confirm-b/results.json').read_text())['summary']['candidate']
        promote=ci[0]>0 and stats['winCI95'][0]>.5
        comparison=dict(winDelta=mean,pairedApprox95WinCI=ci,promoted=promote)
        if promote:selected=best['path']
    decision=dict(incumbent=incumbent,screenCandidate=best,comparison=comparison,selected=selected,candidates=candidates)
    (leader/'decision.json').write_text(json.dumps(decision,indent=2));print(json.dumps(decision),flush=True)
    source=Path(selected+'.zip');shutil.copyfile(source,leader/'champion.zip')
    chosen=next(c for c in candidates if c['path']==selected)
    manifest=dict(leader='nereon',teacher='money',sourceCheckpoint=str(source),checkpoint='champion.zip',
        sha256=hashlib.sha256(source.read_bytes()).hexdigest(),lineageRLDecisions=chosen['lineageDecisions'],
        initialization='Independent random network imitating Money; no other leader weights transferred',
        selection='Saved independent promotion rule; frozen before final outcomes',finalGames=4000)
    (leader/'champion.json').write_text(json.dumps(manifest,indent=2))
    config=dict(leader='nereon',teacher='money',output=str(leader/'final'),workers=8,prefix='rl-leaders-v1-final',
        namespace='test',games=4000,models={'champion':str(leader/'champion')},baselines=[])
    file=root/'configs/nereon-final.json';file.write_text(json.dumps(config,indent=2))
    subprocess.run([sys.executable,'scripts/rl/evaluate_checkpoints.py',str(file)],check=True)
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('root',type=Path);args=p.parse_args();run(args.root)
