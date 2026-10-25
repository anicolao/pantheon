"""Matched model evaluation with independent whole-game workers and resumable rows."""
import argparse,json,time,hashlib,threading,queue
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import torch
from anchored_ppo import AnchoredPPO
from train import Game,stats,paired
p=argparse.ArgumentParser();p.add_argument('config');args=p.parse_args();c=json.loads(Path(args.config).read_text());out=Path(c['output']);out.mkdir(parents=True,exist_ok=True)
if (out/'results.json').exists():raise RuntimeError('Refusing overwrite')
workers=c.get('workers',8);assert c['games']%workers==0
torch.set_num_threads(1);started=time.monotonic();hashes={k:hashlib.sha256(Path(v+'.zip').read_bytes()).hexdigest() for k,v in c['models'].items()}
protocol=dict(c,checkpointSHA256=hashes,leagueSHA256=hashlib.sha256(Path(c['opponent'][7:]).read_bytes()).hexdigest())
protocol_path=out/'protocol.json'
if protocol_path.exists():assert json.loads(protocol_path.read_text())==protocol,'Evaluation drift'
protocol_path.write_text(json.dumps(protocol,indent=2));cache=out/'.progress';cache.mkdir(exist_ok=True);stop=threading.Event();allrows={}
def run(rank):
 models={};env=Game(0,1,c['namespace'],c['prefix'],leader=c['leader'],teacher=c['teacher'],opponent=c['opponent']);rows=[]
 try:
  completed=0
  while True:
   if stop.is_set():raise RuntimeError('Another worker failed')
   try:name,index=jobs.get_nowait()
   except queue.Empty:break
   if name not in models:models[name]=AnchoredPPO.load(c['models'][name],device='cpu')
   model=models[name]
   file=cache/f'{name}-{index}.json';expected=f"{c['prefix']}:{c['namespace']}:{index}"
   if file.exists():
    row=json.loads(file.read_text());assert row['seed']==expected and row['replayVerified'];rows.append((name,row));continue
   env.counter=index;obs,_=env.reset();done=False
   while not done:
    if stop.is_set():raise RuntimeError('Another worker failed')
    action,_=model.predict(obs,action_masks=env.action_masks(),deterministic=True);obs,reward,done,_,info=env.step(action)
   assert env.call(dict(op='verify'));row=dict(**{k:v for k,v in info.items() if k!='replayVerified'},reward=reward,replayVerified=True);assert row['seed']==expected
   temp=file.with_suffix('.tmp');temp.write_text(json.dumps(row));temp.replace(file);rows.append((name,row))
   completed+=1
   if completed%16==0:print(json.dumps(dict(model=name,worker=rank,games=completed)),flush=True)
 except BaseException:stop.set();raise
 finally:env.close()
 return rows
jobs=queue.Queue()
for name in c['models']:
 for index in range(c['games']):jobs.put((name,index))
with ThreadPoolExecutor(max_workers=workers) as pool:collected=[item for chunk in pool.map(run,range(workers)) for item in chunk]
for name in c['models']:
 rows=[row for label,row in collected if label==name];rows.sort(key=lambda r:int(r['seed'].rsplit(':',1)[1]));assert len(rows)==c['games'] and len({r['seed'] for r in rows})==c['games'];allrows[name]=rows;(out/f'{name}.json').write_text(json.dumps(rows));print(json.dumps(dict(model=name,**stats(rows))),flush=True)
keys=list(allrows);result=dict(summary={k:stats(v) for k,v in allrows.items()},comparisons={f'{k}-vs-{keys[0]}':paired(v,allrows[keys[0]]) for k,v in allrows.items() if k!=keys[0]},checkpointSHA256=hashes,elapsedSeconds=time.monotonic()-started)
(out/'results.json').write_text(json.dumps(result,indent=2));print(json.dumps(result),flush=True)
# Completed rows are preserved in the model JSON files; per-game cache is temporary.
import shutil
shutil.rmtree(cache)
