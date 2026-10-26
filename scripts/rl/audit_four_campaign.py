"""Audit an already selected and confirmed campaign; no weight deployment."""
import json,subprocess,sys,shutil
from pathlib import Path
r=Path(sys.argv[1]);c=json.loads((r/'config.json').read_text())
assert (r/'results.json').exists(),'Confirmation must finish first'
def run(args):subprocess.run(args,check=True)
run([sys.executable,'scripts/rl/prepare_four_confirmation.py',str(r)])
manifest=c['opponent'];assert manifest.startswith('four:')
run([sys.executable,'scripts/rl/verify_export.py','--output',str(r/'export-parity.json'),'--games','64','--leaders','doreios','--opponent',manifest,'--checkpoint',str(r/'selected'),'--actor',str(r/'candidate.json')])
for label in ['incumbent','candidate']:run(['bun',str(r/'replay-runner.js'),str(r/f'replay-{label}.json')])
run([sys.executable,'scripts/rl/report_four_training.py',str(r)])
