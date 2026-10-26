"""Compare new batch runtime evaluation with the established Python-driven evaluator."""
import json,time,sys
from pathlib import Path
import torch
from anchored_ppo import AnchoredPPO
from train import vector,evaluate
from native_evaluate import evaluate_native

def main():
 r=Path(sys.argv[1]);torch.set_num_threads(1);prefix='d4-native-equivalence';games=128;workers=4
 checkpoint=r/'incumbent';manifest='four:'+str(r/'opponents-evaluation.json');m=AnchoredPPO.load(checkpoint,device='cpu');start=time.monotonic()
 v=vector(workers,'verify',prefix,leader='doreios',opponent=manifest)
 try:old=evaluate(v,m,'verify',games)
 finally:v.close()
 python_seconds=time.monotonic()-start;start=time.monotonic();new=evaluate_native(checkpoint,manifest,prefix,'verify',games,workers);native_seconds=time.monotonic()-start
 (r/'native-evaluator-old.json').write_text(json.dumps(old)+'\n');(r/'native-evaluator-new.json').write_text(json.dumps(new)+'\n')
 if old!=new:
  print(json.dumps(dict(firstDifference=next(dict(old=a,new=b) for a,b in zip(old,new) if a!=b))),flush=True)
 assert old==new,'Native and established evaluator disagree'
 out=dict(games=games,workers=workers,exactRows=True,allReplaysVerified=True,pythonSeconds=python_seconds,nativeSeconds=native_seconds,speedup=python_seconds/native_seconds)
 (r/'native-evaluator-parity.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
if __name__=='__main__':main()
