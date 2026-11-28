"""Distill opponent-specific strengths of rejected models into one ordinary actor."""
import sys,json,statistics,hashlib,subprocess
from pathlib import Path
sys.path.insert(0,str(Path.cwd()/'scripts/rl/expansion'))
from common import *
from weakest_league import write,paired
from sb3_contrib.common.maskable.utils import get_action_masks

def main():
 torch.set_num_threads(1);torch.manual_seed(281136);np.random.seed(281136)
 root=ROOT/'balance-diagnostics/weakest-eight-house-20261128';out=root/'specialist-distillation';out.mkdir();state=json.loads((root/'status.json').read_text());field=state['field'];write(out/'field.json',field)
 incumbentPath=field['checkpoints']['achilles'];choices={opp:[(0.,incumbentPath)] for opp in field['stageLeaders'] if opp!='achilles'}
 for i in range(27,36):
  folder=root/f'attempt-{i:03}-achilles';r=json.loads((folder/'result.json').read_text());label=r['selected']
  if label=='incumbent':continue
  assert json.loads((folder/'frozen-field.json').read_text())==field
  before={r['seed']:r for r in json.loads((folder/'incumbent-confirm.json').read_text())};after=json.loads((folder/(label+'-confirm.json')).read_text())
  for opp in choices:
   delta=statistics.mean(r['share']-before[r['seed']]['share'] for r in after if r['opponentLeader']==opp)
   choices[opp].append((delta,str(folder/(label+'.zip'))))
 selected={opp:max(items) for opp,items in choices.items()};meta=json.loads(subprocess.check_output(['bun','scripts/rl/expansion/metadata.ts'],text=True));features=json.loads(meta['schema'])['featureKeys']
 models={p:MaskablePPO.load(p,device='cpu') for _,p in selected.values()};incumbent=MaskablePPO.load(incumbentPath,device='cpu')
 write(out/'protocol.json',dict(selected=selected,selection='Historical paired comparisons are now development data; fresh teacher screen and fresh final confirmation',inputs='Public opponent leader feature only',hashes={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in models}))
 class Teacher:
  def predict(self,obs,action_masks,deterministic=True,**kwargs):
   actions=np.empty(len(obs),dtype=np.int64);covered=np.zeros(len(obs),dtype=bool)
   for opp,(_,path) in selected.items():
    ids=np.where(obs[:,features.index('seat:1:leader:'+opp)]>.5)[0]
    if len(ids):actions[ids]=models[path].predict(obs[ids],action_masks=np.asarray(action_masks)[ids],deterministic=True)[0];covered[ids]=True
   assert covered.all();return actions,None
 teacher=Teacher();vec=vector(8,'weakest-specialist-distillation-v1','achilles',str(out/'field.json'))
 try:
  def assess(model,label,namespace,n):
   rows=evaluate(vec,model,namespace,n);write(out/f'{label}-{namespace}.json',rows);print(json.dumps(dict(label=label,namespace=namespace,**summary(rows))),flush=True);return rows
  a=assess(incumbent,'incumbent','teacher-screen',896);b=assess(teacher,'teacher','teacher-screen',896)
  write(out/'teacher-comparison.json',paired(a,b))
  if summary(b)['share']<=summary(a)['share']:write(out/'result.json',dict(accepted=False,reason='teacher failed screening'));return
  vec.env_method('schedule','imitation');obs=vec.reset();xs=[];ms=[];ys=[];games=0
  while games<1024:
   mask=get_action_masks(vec);labels=teacher.predict(obs,mask)[0];xs.append(obs.copy());ms.append(mask.copy());ys.append(labels)
   obs,_,done,_=vec.step(labels);games+=int(done.sum())
  data=tuple(np.concatenate(v) for v in [xs,ms,ys]);np.savez_compressed(out/'demonstrations.npz',observations=data[0],masks=data[1],labels=data[2]);print(json.dumps(dict(stage='collection',games=games,decisions=len(data[2]))),flush=True)
  model=MaskablePPO.load(incumbentPath,device='cpu');scores={'incumbent':summary(assess(incumbent,'incumbent','screen',448))['share']}
  for segment in range(4):
   label=f'bc-{3*(segment+1)}';fit(model,data,3,label);model.save(out/label);scores[label]=summary(assess(model,label,'screen',448))['share']
  best=max(scores,key=scores.get);write(out/'selection.json',dict(selected=best,scores=scores))
  if best=='incumbent':write(out/'result.json',dict(accepted=False,selected=best));return
  candidate=MaskablePPO.load(out/best,device='cpu');a=assess(incumbent,'incumbent','confirm',1792);b=assess(candidate,best,'confirm',1792)
  original=json.loads((root/'initial-field.json').read_text());c=assess(MaskablePPO.load(original['checkpoints']['achilles'],device='cpu'),'original','confirm',1792)
  vsinc=paired(a,b);vsorig=paired(c,b);accepted=vsinc['CI95'][0]>0 and vsorig['CI95'][0]>0;actor=export(candidate,'achilles',out/'selected.json',meta['schema'],out/(best+'.zip'))
  write(out/'result.json',dict(accepted=accepted,selected=best,vsIncumbent=vsinc,vsOriginal=vsorig,actor=actor,checkpoint=str(out/(best+'.zip')),baseline=summary(a),candidate=summary(b)))
 finally:close_vector(vec)
if __name__=='__main__':main()
