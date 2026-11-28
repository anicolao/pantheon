import sys,json,subprocess
from pathlib import Path
sys.path.insert(0,str(Path.cwd()/'scripts/rl/expansion'))
from common import *
from weakest_league import paired,write

def main():
 torch.set_num_threads(1)
 root=ROOT/'balance-diagnostics/weakest-eight-house-20261128';folder=root/'bias-search';field=json.loads((folder/'field.json').read_text());protocol=json.loads((folder/'protocol.json').read_text())
 assert (folder/'g11/results.json').exists()
 vec=vector(8,'weakest-bias-validation-v1','achilles',str(folder/'field.json'))
 try:
  incumbent=MaskablePPO.load(field['checkpoints']['achilles'],device='cpu')
  def assess(model,label,namespace,n):
   rows=evaluate(vec,model,namespace,n);write(folder/f'{label}-{namespace}.json',rows);print(json.dumps(dict(label=label,namespace=namespace,**summary(rows))),flush=True);return rows
  scores={'incumbent':summary(assess(incumbent,'incumbent','screen',448))['share']}
  for gen in [3,7,11]:
   result=json.loads((folder/f'g{gen}/results.json').read_text())
   for key in ['best','mean']:
    model=MaskablePPO.load(field['checkpoints']['achilles'],device='cpu')
    with torch.no_grad():
     for index,bias in zip(protocol['indices'],result[key]):model.policy.action_net.bias[index]+=bias
    model.policy.optimizer=torch.optim.Adam(model.policy.parameters(),lr=.00002,eps=1e-5)
    label=f'g{gen}-{key}';model.save(folder/label);scores[label]=summary(assess(model,label,'screen',448))['share']
  best=max(scores,key=scores.get);write(folder/'selection.json',dict(scores=scores,selected=best))
  if best=='incumbent':write(folder/'result.json',dict(accepted=False,selected=best));return
  candidate=MaskablePPO.load(folder/best,device='cpu');before=assess(incumbent,'incumbent','confirm',1792);after=assess(candidate,best,'confirm',1792)
  original=json.loads((root/'initial-field.json').read_text());originalrows=assess(MaskablePPO.load(original['checkpoints']['achilles'],device='cpu'),'original','confirm',1792)
  vsinc=paired(before,after);vsorig=paired(originalrows,after);accepted=vsinc['CI95'][0]>0 and vsorig['CI95'][0]>0
  meta=json.loads(subprocess.check_output(['bun','scripts/rl/expansion/metadata.ts'],text=True))
  actor=export(candidate,'achilles',folder/'selected.json',meta['schema'],folder/(best+'.zip'))
  write(folder/'result.json',dict(accepted=accepted,selected=best,vsIncumbent=vsinc,vsOriginal=vsorig,actor=actor,checkpoint=str(folder/(best+'.zip')),baseline=summary(before),candidate=summary(after)))
 finally:close_vector(vec)
if __name__=='__main__':main()
