"""Resolve the predeclared teacher choice only after the thinning confirmation completes."""
import hashlib,json,shutil,time
from pathlib import Path
def select_teacher(root:Path,study:Path|None=None):
 c=json.loads((root/'config.json').read_text())
 if c.get('teacherSelection')!='best-confirmed-v29-v31':return c
 assert not (root/'protocol.json').exists() and not (root/'teacher-selection.json').exists()
 study=study or Path('balance-results/doreios-four-rl-v31');assert json.loads((study/'queue-finished.json').read_text())['completed'];result=json.loads((study/'results.json').read_text());rule=result['rule'] if result['improvementConfirmed'] else None
 assert not result['improvementConfirmed'] or isinstance(rule,dict)
 old=root/'original-teacher-plan';old.mkdir();shutil.copyfile(root/'config.json',old/'config.json');shutil.copyfile(root/'opponents-teacher.json',old/'opponents-teacher.json')
 m=json.loads((root/'opponents-teacher.json').read_text());assert m['teacher']=='temple-order'
 if rule is not None:m['teacherThinRule']=rule
 (root/'opponents-teacher.json').write_text(json.dumps(m,indent=2)+'\n')
 c['selection']+=' Before demonstrations, select v31 thinning teacher only if its incremental gain over v29 independently confirmed; otherwise retain v29. Selected teacher: '+('v31 '+json.dumps(rule) if rule else 'v29 Temple-order only')+'.'
 (root/'config.json').write_text(json.dumps(c,indent=2)+'\n');(root/'teacher-selection.json').write_text(json.dumps(dict(time=time.time(),sourceStudy=str(study),sourceResultSHA256=hashlib.sha256((study/'results.json').read_bytes()).hexdigest(),incrementalImprovementConfirmed=result['improvementConfirmed'],selectedThinningRule=rule),indent=2)+'\n')
 return c
