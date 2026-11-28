import sys,json
from pathlib import Path
sys.path.insert(0,str(Path.cwd()/'scripts/rl/expansion'))
from train_deploy import vector_queue
from common import *
if __name__=='__main__':
 torch.set_num_threads(1)
 root=Path('balance-diagnostics/territory-deploy-learning-20261128')
 vec=vector_queue(8,'territory-deploy-eval-v1',str((root/'standard/field.json').resolve()))
 try:
  model=MaskablePPO.load(root/'standard/incumbent.zip',device='cpu')
  rows=evaluate(vec,model,'confirm',3584)
  (root/'initial-confirm.json').write_text(json.dumps(rows))
  result=summary(rows)
  (root/'initial-confirm-summary.json').write_text(json.dumps(result,indent=2))
  print(json.dumps(result),flush=True)
 finally:close_vector(vec)
