"""Run the predeclared sequential campaign; stop visibly on any failure."""
import argparse,hashlib,json,subprocess,sys,time
from pathlib import Path

def main():
    p=argparse.ArgumentParser();p.add_argument('--bootstrap',required=True);p.add_argument('--output',required=True);p.add_argument('--workers',type=int,default=16);a=p.parse_args()
    root=Path(a.output).resolve();root.mkdir(parents=True,exist_ok=True)
    config=dict(bootstrap=str(Path(a.bootstrap).resolve()),bootstrapSHA256=hashlib.sha256(Path(a.bootstrap).read_bytes()).hexdigest(),workers=a.workers,order=['theseus','achilles','perseus'],roundsPerHouse=2,stepsPerLearnerPerRound=131072,finalConsolidationRounds=1,matrixGamesPerPair=1000,matrixSeedPrefix='eight-house-final-20261127-v1',selection='Each round freezes opponents and selects checkpoints on screening seeds only; matrix is untouched until all training is frozen',python=sys.executable,flakeSHA256=hashlib.sha256(Path('flake.nix').read_bytes()).hexdigest(),lockSHA256=hashlib.sha256(Path('flake.lock').read_bytes()).hexdigest())
    protocol=root/'protocol.json'
    if protocol.exists():assert json.loads(protocol.read_text())==config,'Different campaign protocol'
    else:protocol.write_text(json.dumps(config,indent=2))
    def status(stage,state,**extra):(root/'status.json').write_text(json.dumps(dict(stage=stage,state=state,updatedAt=time.time(),**extra),indent=2))
    def command(stage,args):
        status(stage,'running');print(json.dumps(dict(stage=stage,state='running')),flush=True)
        path=root/(stage+'.log')
        with path.open('a') as log:
            result=subprocess.run(args,stdout=log,stderr=subprocess.STDOUT)
        if result.returncode:
            status(stage,'failed',exitCode=result.returncode,log=str(path));raise RuntimeError(f'{stage} failed: {path}')
        status(stage,'complete')
    previous=config['bootstrap']
    for house in config['order']+['consolidation']:
        folder=root/house;field=folder/'selected-field.json'
        if not field.exists():
            if folder.exists():status(house,'interrupted',message='Partial checkpoints retained; review before resuming');raise RuntimeError('Partial stage needs explicit checkpoint recovery: '+str(folder))
            args=[sys.executable,'scripts/rl/expansion/train_stage.py','--previous',previous,'--output',str(folder),'--newest',house if house!='consolidation' else 'perseus','--prefix','eight-house-20261127-v1:'+house,'--workers',str(a.workers),'--steps','131072','--rounds','1' if house=='consolidation' else '2']
            if house=='consolidation':args.append('--uniform')
            command(house,args)
        previous=str(field)
    status('matrix','running',field=previous)
    command('matrix',['bun','scripts/rl/expansion/matrix.ts',previous,str(root/'matrix'),'1000',str(a.workers),config['matrixSeedPrefix']])
    command('analysis',[sys.executable,'scripts/rl/expansion/report_matrix.py',str(root/'matrix')])
    status('campaign','complete',field=previous,report=str(root/'matrix'/'REPORT.md'));print('Campaign and final matrix complete',flush=True)
if __name__=='__main__':main()
