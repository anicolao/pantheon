"""Raw RL first, then fixed-budget planning, against the unchanged two-planner table."""
import hashlib,json,math,multiprocessing,os,shutil,statistics,subprocess,sys,time,uuid
from concurrent.futures import ProcessPoolExecutor,ThreadPoolExecutor,as_completed
from pathlib import Path
import numpy as np
import torch
from stable_baselines3.common.logger import configure
from anchored_ppo import AnchoredPPO
from collect_planning_ppo import collect
from episode_ppo_buffer import episode_buffer
from native_evaluate import evaluate_native
from train_four import summary

def write(p,v):
 tmp=p.with_suffix(p.suffix+'.tmp');tmp.write_text(json.dumps(v,indent=2)+'\n');tmp.replace(p)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def export(checkpoint,actor):subprocess.run([sys.executable,'scripts/rl/export_actor.py',str(checkpoint),'nereon',str(actor)],check=True,capture_output=True,text=True)
def prepare(r):
 r.mkdir(exist_ok=False);s=Path('balance-results/thaleia-planner-v1');old=json.loads((s/'config.json').read_text())
 shutil.copytree(s/'actors',r/'actors')
 for name in ['doreios-critic.json','thaleia-critic.json']:shutil.copyfile(s/name,r/name)
 base=Path('balance-results/league-rl-v1/champions/round-2/nereon.zip');assert sha(base)==json.loads((r/'actors/nereon.json').read_text())['checkpointSHA256'];shutil.copyfile(base,r/'incumbent.zip')
 world=json.loads((s/'opponents.json').read_text())
 for leader,entry in world['actors'].items():
  p=r/'actors'/f'{leader}.json';assert sha(p)==entry['sha256'];entry['path']=str(p.resolve())
 write(r/'world.json',world)
 manifest=json.loads(json.dumps(world));manifest.pop('observationKind',None);manifest.pop('reward',None)
 policies={}
 for leader in ['doreios','thaleia']:
  path=r/f'{leader}-critic.json';policies[leader]=dict(critic=dict(path=str(path.resolve()),sha256=sha(path)),rule=old[leader+'Rule'])
 manifest['planning']=dict(worldManifest=str((r/'world.json').resolve()),policies=policies);write(r/'opponents.json',manifest)
 for source,target in [('planning_pair_worker.ts','pair-worker.js'),('planning_native_worker.ts','native-worker.js')]:subprocess.run(['bun','build','scripts/rl/'+source,'--target=bun','--outfile='+str(r/target)],check=True)
 c=dict(output=str(r),prefix='n4plan-'+uuid.uuid4().hex[:12],seed=8541,workers=16,batches=16,gamesPerBatch=64,gamesPerJob=4,screenRounds=[8,16],screenGames=128,confirmationGames=400,learningRate=.0001,entropy=.003,gamma=1.,gaeLambda=.95,epochs=4,batchSize=512,checkpointEveryBatch=True,base=str(r/'incumbent.zip'),manifest=str(r/'opponents.json'),baselineSource=str(s/'candidate.json'),comparisonPrefix=old['prefix'],pairWorker=str(r/'pair-worker.js'),nativeWorker=str(r/'native-worker.js'),protocol='Initial pure masked-PPO pilot:1024 complete training games in16 on-policy batches of64, against frozen Doreios and Thaleia planners and plain Melia. Learner remains171-input128x128; terminal reward2*splitWin-1 only. Independent complete-game collection avoids synchronized per-action stalls; all episode boundaries retained, no exclusions. Save each update and RNG state. Common128 separate screen games for incumbent and checkpoints after512/1024 training games; select best trained checkpoint before reserved comparison. Compare original Nereon, selected raw RL, then that same checkpoint plus16sample/4candidate/risk1/four-own-turn win-value planning on the same400 reserved prior-table games. These test seeds appeared in the prior Thaleia study but are excluded from training and screening. No tuning on comparison outcomes. Opponent planner world models stay frozen at original actors even as learner changes. Reproduce16 cached baseline games and counts;16-game exact trained actor export parity; full-state replay every actual game. No deployment.')
 write(r/'config.json',c);write(r/'protocol.json',dict(c,sourceCommit=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),scriptSHA256={str(p):sha(p) for p in Path('scripts/rl').glob('*') if p.is_file()},baselineSHA256=sha(Path(c['baselineSource'])),initialCheckpointSHA256=sha(r/'incumbent.zip')))
 (r/'chunks').mkdir();(r/'trajectories').mkdir();return c

def paired_table(before,after):
 assert [(x['seed'],x['block'],x['rotation']) for x in before]==[(x['seed'],x['block'],x['rotation']) for x in after]
 def credit(row,leader):scores=row['scores'];top=max(scores.values());return (1/sum(x==top for x in scores.values())) if scores[leader]==top else 0.
 def ci(v):mean=statistics.mean(v);half=1.96*statistics.stdev(v)/math.sqrt(len(v));return dict(share=mean,CI95=[mean-half,mean+half])
 table={}
 for leader in ['melia','nereon','thaleia','doreios']:
  b=[];a=[]
  for start in range(0,len(before),4):
   x=before[start:start+4];y=after[start:start+4];assert len({q['block'] for q in x})==1 and {q['rotation'] for q in x}==set(range(4)) and all(q['replayVerified'] for q in x+y)
   b.append(statistics.mean(credit(q,leader) for q in x));a.append(statistics.mean(credit(q,leader) for q in y))
  table[leader]=dict(before=ci(b),after=ci(a),paired=ci([v-u for u,v in zip(b,a)]))
 return table

def main():
 r=Path('balance-results/nereon-planning-rl-v1');resume='--resume' in sys.argv
 if resume:
  c=json.loads((r/'config.json').read_text());q=json.loads((r/'queue.json').read_text())
  try:os.kill(q['pid'],0)
  except ProcessLookupError:pass
  else:raise RuntimeError('Previous controller still exists; do not duplicate')
  protocol=json.loads((r/'protocol.json').read_text());assert all(sha(Path(p))==v for p,v in protocol['scriptSHA256'].items()),'Research source changed'
 else:c=prepare(r)
 write(r/'queue.json',dict(pid=os.getpid(),time=time.time(),resume=resume))
 baseline=json.loads(Path(c['baselineSource']).read_text());assert len(baseline)==400
 def run_pair(start,manifest,label):
  path=r/'chunks'/f'{label}-{start}.json'
  if path.exists():
   cached=json.loads(path.read_text());assert cached['manifestSHA256']==sha(Path(manifest)) and cached['start']==start and cached['prefix']==c['comparisonPrefix'] and all(x['replayVerified'] for x in cached['rows']);return cached
  config=r/f'{label}-worker.json';job=dict(prefix=c['comparisonPrefix'],start=start,games=4)
  p=subprocess.run(['bun',c['pairWorker'],str(config),json.dumps(job)],text=True,capture_output=True,check=True)
  result=dict(job,**json.loads(p.stdout),manifestSHA256=sha(Path(manifest)));assert len(result['rows'])==4 and all(x['replayVerified'] for x in result['rows']);write(path,result);return result
 write(r/'parity-worker.json',dict(leader='nereon',manifest=c['manifest']))
 if not (r/'baseline-parity.json').exists():
  with ThreadPoolExecutor(max_workers=4) as pool:parts=list(pool.map(lambda i:run_pair(i,c['manifest'],'parity'),[0,4,196,396]))
  for part in parts:
   for x,y in zip(part['rows'],baseline[part['start']:part['start']+4]):
    for key in ['seed','block','rotation','scores','turns','winnerCount','replayVerified']:assert x[key]==y[key],(key,x,y)
   prior=json.loads(Path(f"balance-results/thaleia-planner-v1/chunks/candidate-{part['start']}.json").read_text());assert part['counts']==prior['counts']
  write(r/'baseline-parity.json',dict(games=16,exactOutcomesAndPlanningCounts=True,fullReplays=True));print('Baseline parity passed',flush=True)
 torch.set_num_threads(1);torch.manual_seed(c['seed']);np.random.seed(c['seed'])
 done=json.loads((r/'training-state.json').read_text())['round'] if (r/'training-state.json').exists() else 0
 initial=AnchoredPPO.load(r/'incumbent',device='cpu');initial.policy.set_training_mode(False)
 for p in initial.policy.parameters():p.requires_grad_(False)
 model=AnchoredPPO.load(r/f'round-{done:02}' if done else r/'incumbent',device='cpu',learning_rate=c['learningRate'],gamma=1.,gae_lambda=.95,ent_coef=c['entropy'],n_epochs=4,batch_size=512,target_kl=.02)
 model.reference=initial.policy;model.anchor_coefficient=0.;model.auxiliary_coefficient=0.;model.set_logger(configure(str(r/'training-metrics'),['json']))
 if done:
  rng=torch.load(r/f'round-{done:02}.rng.pt',weights_only=False);torch.set_rng_state(rng['torch']);np.random.set_state(rng['numpy'])
 else:
  model.policy.optimizer=torch.optim.Adam(model.policy.parameters(),lr=c['learningRate'],eps=1e-5);model.num_timesteps=0;model.save(r/'round-00');torch.save(dict(torch=torch.get_rng_state(),numpy=np.random.get_state()),r/'round-00.rng.pt')
 def screen(label,checkpoint):
  path=r/f'{label}-screen.json'
  if path.exists():rows=json.loads(path.read_text())
  else:
   rows=evaluate_native(checkpoint,'planning:'+c['manifest'],c['prefix'],'screen',c['screenGames'],c['workers'],leader='nereon',observation_kind=None,worker=c['nativeWorker']);write(path,rows)
  value=summary(rows);print(json.dumps(dict(stage='screen',model=label,**value)),flush=True);return value
 scores={'incumbent':screen('incumbent',r/'incumbent')}
 with ProcessPoolExecutor(max_workers=c['workers'],mp_context=multiprocessing.get_context('spawn')) as pool:
  for batch in range(1,c['batches']+1):
   if batch<=done:
    if batch in c['screenRounds']:scores[f'round-{batch:02}']=screen(f'round-{batch:02}',r/f'round-{batch:02}')
    continue
   previous=r/f'round-{batch-1:02}.zip';jobs=[];metas=[]
   for start in range((batch-1)*c['gamesPerBatch'],batch*c['gamesPerBatch'],c['gamesPerJob']):
    out=r/'trajectories'/f'{start:05}.npz';job=dict(checkpoint=str(previous),manifest=c['manifest'],prefix=c['prefix']+':train',start=start,games=4,output=str(out))
    if out.exists() and out.with_suffix('.json').exists():
     meta=json.loads(out.with_suffix('.json').read_text());assert meta['checkpointSHA256']==sha(previous) and meta['trajectorySHA256']==sha(out);metas.append(meta)
    else:jobs.append(pool.submit(collect,job))
   for f in as_completed(jobs):metas.append(f.result());print(json.dumps(dict(stage='collect',round=batch,games=len(metas)*4,total=64)),flush=True)
   metas.sort(key=lambda x:x['start']);arrays=[]
   for meta in metas:
    assert meta['checkpointSHA256']==sha(previous) and all(x['replayVerified'] for x in meta['rows']);arrays.append(dict(np.load(meta['output'])))
   data={key:np.concatenate([a[key] for a in arrays]) for key in arrays[0]};assert int(data['starts'].sum())==64
   model.rollout_buffer=episode_buffer(model,data);model.batch_size=511 if len(data['actions'])%512==1 else 512
   model._current_progress_remaining=1-(batch-1)/c['batches'];model.train();model.num_timesteps+=len(data['actions']);model.logger.dump(model.num_timesteps)
   assert all(torch.isfinite(p).all() for p in model.policy.parameters());model.save(r/f'round-{batch:02}');torch.save(dict(torch=torch.get_rng_state(),numpy=np.random.get_state()),r/f'round-{batch:02}.rng.pt')
   write(r/'training-state.json',dict(round=batch,decisions=model.num_timesteps,games=batch*64));print(json.dumps(dict(stage='trained',round=batch,decisions=model.num_timesteps,games=batch*64)),flush=True)
   if batch in c['screenRounds']:scores[f'round-{batch:02}']=screen(f'round-{batch:02}',r/f'round-{batch:02}')
 best=max([f'round-{n:02}' for n in c['screenRounds']],key=lambda x:scores[x]['share'])
 if not (r/'selection.json').exists():shutil.copyfile(r/(best+'.zip'),r/'selected.zip');write(r/'selection.json',dict(selected=best,screening=scores,checkpointSHA256=sha(r/'selected.zip')))
 else:assert json.loads((r/'selection.json').read_text())['selected']==best
 export(r/'selected',r/'selected-actor.json');manifest=json.loads(Path(c['manifest']).read_text());manifest['actors']['nereon']=dict(path=str((r/'selected-actor.json').resolve()),sha256=sha(r/'selected-actor.json'));write(r/'raw-manifest.json',manifest)
 if not (r/'export-parity.json').exists():subprocess.run([sys.executable,'scripts/rl/verify_export.py','--output',str(r/'export-parity.json'),'--games','16','--leaders','nereon','--checkpoint',str(r/'selected'),'--actor',str(r/'selected-actor.json'),'--opponent','planning:'+str(r/'raw-manifest.json')],check=True)
 raw=None;planned=None
 for label in ['raw','planned']:
  if label=='planned':
   subprocess.run([sys.executable,'scripts/rl/export_signed_win_critic.py',str(r/'selected.zip'),str(r/'selected-actor.json'),str(r/'selected-critic.json')],check=True)
   subprocess.run([sys.executable,'scripts/rl/verify_critic_export.py',str(r/'selected.zip'),str(r/'selected-critic.json'),str(r/'critic-validation.json')],check=True)
   manifest['planning']['policies']['nereon']=dict(critic=dict(path=str((r/'selected-critic.json').resolve()),sha256=sha(r/'selected-critic.json')),rule=dict(manifest['planning']['policies']['thaleia']['rule']),useCurrentActor=True);write(r/'planned-manifest.json',manifest)
  m=r/f'{label}-manifest.json';write(r/f'{label}-worker.json',dict(leader='nereon',manifest=str(m)));parts=[]
  with ThreadPoolExecutor(max_workers=c['workers']) as pool:
   for f in as_completed([pool.submit(run_pair,start,str(m),label) for start in range(0,400,4)]):parts.append(f.result());print(json.dumps(dict(stage=label,games=len(parts)*4,total=400)),flush=True)
  parts.sort(key=lambda x:x['start']);rows=[x for p in parts for x in p['rows']];write(r/f'{label}-comparison.json',rows)
  if label=='raw':raw=rows;write(r/'raw-results.json',dict(table=paired_table(baseline,raw),gamesPerArm=400))
  else:planned=rows
 result=dict(gamesPerArm=400,seedBlocks=100,rawVsOriginal=paired_table(baseline,raw),plannerVsRaw=paired_table(raw,planned),plannerVsOriginal=paired_table(baseline,planned),trainingGames=1024,trainingDecisions=model.num_timesteps,baselineReused=True,newComparisonGamesReplayed=800,exportParityGames=16,productionUpdated=False)
 write(r/'results.json',result);lines=[c['protocol'],'','Leader | Original | Raw RL | Raw RL + planning']
 for leader in ['melia','nereon','thaleia','doreios']:
  a=result['rawVsOriginal'][leader];b=result['plannerVsRaw'][leader];lines.append(f"{leader}: {a['before']['share']:.2%} | {a['after']['share']:.2%} | {b['after']['share']:.2%}")
 for name in ['rawVsOriginal','plannerVsRaw','plannerVsOriginal']:
  d=result[name]['nereon']['paired'];lines.append(f"Nereon {name}: {100*d['share']:+.2f}pp,95%CI [{100*d['CI95'][0]:+.2f},{100*d['CI95'][1]:+.2f}]")
 (r/'report.txt').write_text('\n'.join(lines)+'\n');write(r/'queue-finished.json',dict(completed=True,time=time.time()));print('\n'.join(lines),flush=True)
if __name__=='__main__':main()
