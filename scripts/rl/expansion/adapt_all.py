"""Wait for Achilles, adapt all eight leaders, then audit on untouched matched seeds."""
import argparse,copy,itertools,shutil,concurrent.futures
from common import *
from weakest_league import write,paired
from league_transport import league_vector

def port(checkpoint,out,vec,meta):
 old=MaskablePPO.load(checkpoint,device='cpu')
 if old.observation_space.shape[0]==meta['features']:
  old.save(out);return str(out.with_suffix('.zip'))
 model=MaskablePPO('MlpPolicy',vec,device='cpu',policy_kwargs=dict(net_arch=dict(pi=[128,128],vf=[128,128])))
 source=old.policy.state_dict();target=model.policy.state_dict()
 for key in target:
  if key in ['mlp_extractor.policy_net.0.weight','mlp_extractor.value_net.0.weight']:
   target[key].zero_();target[key][:,:source[key].shape[1]]=source[key]
  else:target[key]=source[key].clone()
 model.policy.load_state_dict(target)
 with torch.no_grad():
  x=torch.randn(128,meta['features']);assert torch.allclose(old.policy.get_distribution(x[:,:old.observation_space.shape[0]]).distribution.logits,model.policy.get_distribution(x).distribution.logits,atol=1e-5,rtol=1e-5)
 model.save(out);return str(out.with_suffix('.zip'))

def main():
 p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--pending',required=True);p.add_argument('--field',required=True);p.add_argument('--steps',type=int,default=4194304);p.add_argument('--workers',type=int,default=8);p.add_argument('--resume',action='store_true');args=p.parse_args()
 torch.set_num_threads(1)
 out=Path(args.output).resolve();out.mkdir(parents=True,exist_ok=args.resume)
 source_paths=[*sorted((ROOT/'scripts/rl/expansion').glob('*.py')),*sorted((ROOT/'scripts/rl/expansion').glob('*.ts')),*sorted((ROOT/'src/lib/game').glob('*.ts')),ROOT/'src/lib/bots/expansion-schema.ts',ROOT/'src/lib/bots/rl-runtime.ts',ROOT/'flake.nix',ROOT/'flake.lock']
 hashes={str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for f in source_paths}
 protocol=dict(args={k:v for k,v in vars(args).items() if k!='resume'},sources=hashes,selection='Choose Achilles run by screening only; require its predeclared improvement gate. Train every leader against one frozen starting field, retain incumbent on failed paired gate. Final audit seeds never used for selection.',matrix='28 unordered pairings, 512 games each, 256 paired seats per matchup. Identical seeds before/after. No mirror matches.',audit='3584 games for old and new policy per leader, both against identical final opponents, paired by seed and seat. Descriptive intervals; not an all-eight multiplicity-adjusted superiority claim.')
 if (out/'protocol.json').exists():assert json.loads((out/'protocol.json').read_text())==protocol
 else:write(out/'protocol.json',protocol)
 def intact():
  assert all(hashlib.sha256((ROOT/f).read_bytes()).hexdigest()==h for f,h in hashes.items()),'Sources changed; stop rather than mix rules'
 pending=Path(args.pending)
 while not all((pending/run/'status.json').exists() and json.loads((pending/run/'status.json').read_text())['state']=='complete' for run in ['standard','exploratory']):
  write(out/'status.json',dict(state='waiting-for-achilles',checkedAt=time.time()))
  if not any('train_deploy.py' in line for line in subprocess.check_output(['ps','-axo','command'],text=True).splitlines()):raise RuntimeError('Achilles runs stopped without completion')
  time.sleep(30);intact()
 intact()
 meta=json.loads(subprocess.check_output(['bun','scripts/rl/expansion/deploy_metadata.ts'],text=True))
 if not (out/'before-field.json').exists():
  original=json.loads(Path(args.field).read_text());original['focusNewest']=False
  # Snapshot all originals, so future promotion cannot change this experiment.
  snapshots=out/'originals';snapshots.mkdir(exist_ok=True)
  for leader in original['stageLeaders']:
   for kind,source,dest in [('actor',original['actors'][leader]['path'],snapshots/(leader+'.json')),('checkpoint',original['checkpoints'][leader],snapshots/(leader+'.zip'))]:shutil.copy2(source,dest)
   original['actors'][leader]=dict(path=str(snapshots/(leader+'.json')),sha256=hashlib.sha256((snapshots/(leader+'.json')).read_bytes()).hexdigest())
   original['checkpoints'][leader]=str(snapshots/(leader+'.zip'))
  raw=out/'base-field.json';write(raw,original);original['baseField']=str(raw)
  write(out/'original-field.json',original)
  vec=league_vector(1,'all-adapt-port','achilles',str(out/'original-field.json'))
  try:
   for leader in original['stageLeaders']:original['checkpoints'][leader]=port(original['checkpoints'][leader],snapshots/(leader+'-queue'),vec,meta)
  finally:close_vector(vec)
  write(out/'original-field.json',original)
  results={name:json.loads((pending/name/'result.json').read_text()) for name in ['standard','exploratory']}
  # Choose by screening, not by which held-out confirmation happened to be larger.
  selected=max(results,key=lambda name:json.loads((pending/name/'selection.json').read_text())['scores'][results[name]['selected']]['share'])
  result=results[selected];checkpoint=result['checkpoint'] if result['accepted'] else str(pending/selected/'incumbent.zip')
  before=copy.deepcopy(original);model=MaskablePPO.load(checkpoint,device='cpu');model.save(out/'achilles-start')
  before['checkpoints']['achilles']=str(out/'achilles-start.zip');before['actors']['achilles']=export(model,'achilles',out/'achilles-start.json',meta['schema'],out/'achilles-start.zip')
  write(out/'achilles-selection.json',dict(run=selected,accepted=result['accepted'],checkpoint=checkpoint,selection='screening only'))
  write(out/'before-field.json',before)
 before=json.loads((out/'before-field.json').read_text())
 def train(leader):
  folder=out/('train-'+leader)
  if (folder/'status.json').exists() and json.loads((folder/'status.json').read_text())['state']=='complete':return
  if folder.exists():folder.rename(out/(folder.name+'-interrupted-'+str(time.time_ns())))
  intact()
  with (out/('train-'+leader+'.log')).open('w') as log:
   subprocess.run([sys.executable,'scripts/rl/expansion/train_league_member.py','--leader',leader,'--field',str(out/'before-field.json'),'--output',str(folder),'--prefix','all-adapt-20261128:'+leader,'--eval-prefix','all-adapt-select-20261128:'+leader,'--ruleset','independent-action-treasure-territory-deploy','--steps',str(args.steps),'--workers',str(args.workers)],stdout=log,stderr=subprocess.STDOUT,check=True)
 write(out/'status.json',dict(state='training-all',leaders=before['stageLeaders']))
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:list(pool.map(train,before['stageLeaders']))
 intact();after=copy.deepcopy(before);promotions={}
 for leader in before['stageLeaders']:
  r=json.loads((out/('train-'+leader)/'result.json').read_text());promotions[leader]=r
  if r['accepted']:after['actors'][leader]=r['actor'];after['checkpoints'][leader]=r['checkpoint']
 write(out/'after-field.json',after);write(out/'promotions.json',promotions)
 def assess(field,leader,prefix,namespace,n,path,opponent=None):
  if path.exists():return json.loads(path.read_text())
  intact();vec=league_vector(args.workers,prefix,leader,str(field),opponent)
  try:
   manifest=json.loads(field.read_text());model=MaskablePPO.load(manifest['checkpoints'][leader],device='cpu');rows=evaluate(vec,model,namespace,n);write(path,rows);return rows
  finally:close_vector(vec)
 matrices={};comparisons={}
 for label in ['original','before','after']:
  field=out/(label+'-field.json');folder=out/('matrix-'+label);folder.mkdir(exist_ok=True);matrix={hero:{} for hero in before['stageLeaders']}
  for a,b in itertools.combinations(before['stageLeaders'],2):
   write(out/'status.json',dict(state='matrix',field=label,pair=[a,b]))
   rows=assess(field,a,'all-adapt-matrix-20261128:'+a+':'+b,'audit',512,folder/(a+'--'+b+'.json'),b)
   result=summary(rows);matrix[a][b]=result['share'];matrix[b][a]=1-result['share']
   if label=='after':comparisons[a+'--'+b]=paired(json.loads((out/'matrix-before'/(a+'--'+b+'.json')).read_text()),rows)
  matrices[label]=matrix;write(out/('matrix-'+label+'.json'),matrix)
 audits={}
 for leader in before['stageLeaders']:
  write(out/'status.json',dict(state='final-individual-audit',leader=leader))
  # Swap only the focal checkpoint; all final opponents and seeds remain identical.
  field=copy.deepcopy(after);field['checkpoints'][leader]=before['checkpoints'][leader];old=out/(leader+'-audit-old-field.json');write(old,field)
  a=assess(old,leader,'all-adapt-final-20261128:'+leader,'audit',3584,out/(leader+'-old-audit.json'))
  b=assess(out/'after-field.json',leader,'all-adapt-final-20261128:'+leader,'audit',3584,out/(leader+'-new-audit.json'))
  audits[leader]=dict(before=summary(a),after=summary(b),paired=paired(a,b));write(out/'individual-audits.json',audits)
 write(out/'result.json',dict(matrices=matrices,matchupChanges=comparisons,individualAudits=audits,promoted=[l for l,r in promotions.items() if r['accepted']]))
 lines=['# All-leader Territory Deploy adaptation','', 'All comparisons use the new rules. These are heads-up results; ties split win credit. The field average is necessarily 50%.','']
 for label,matrix in matrices.items():
  heroes=before['stageLeaders'];lines += ['## '+label,'','| Leader | '+' | '.join(heroes)+' | Mean |','|---|'+'---:|'*(len(heroes)+1)]
  for hero in heroes:lines.append('| '+hero+' | '+' | '.join('—' if hero==other else f'{100*matrix[hero][other]:.2f}%' for other in heroes)+f" | {100*np.mean(list(matrix[hero].values())):.2f}% |")
  lines.append('')
 lines += ['## Individual improvement against the identical final field','','| Leader | Old | Adapted | Paired difference, percentage points (95% CI) |','|---|---:|---:|---:|']
 for leader,r in audits.items():
  d=r['paired'];lo,hi=d['CI95'];lines.append(f"| {leader} | {100*r['before']['share']:.2f}% | {100*r['after']['share']:.2f}% | {100*d['delta']:+.2f} [{100*lo:+.2f}, {100*hi:+.2f}] |")
 lines += ['', 'Intervals are descriptive, without correction for testing eight leaders. Checkpoints that failed their selection gate were retained as incumbents. All evaluated games passed replay verification. Nothing is deployed automatically.']
 (out/'REPORT.md').write_text('\n'.join(lines)+'\n')
 write(out/'status.json',dict(state='complete',result=str(out/'result.json'),report=str(out/'REPORT.md')))
if __name__=='__main__':
 try:main()
 except Exception as error:
  if '--output' in sys.argv:
   folder=Path(sys.argv[sys.argv.index('--output')+1])
   if folder.exists():write(folder/'failure.json',dict(error=repr(error),failedAt=time.time()))
  raise

