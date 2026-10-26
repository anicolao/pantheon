"""Export the selected actor and freeze matched browser-runtime confirmation jobs."""
import itertools
import json
from pathlib import Path
import subprocess
import sys

root=Path(sys.argv[1]);config=json.loads((root/'config.json').read_text())
selected=json.loads((root/'selection.json').read_text())['selected']
leader=config.get('leader','doreios');checkpoint=root/selected
capacity='--capacity' in sys.argv
public='--public' in sys.argv
exports={'control':root/'control','wide':root/'wide'} if capacity else {'candidate':checkpoint}
if public:exports={'control':root/'control-model','public':root/'public-model'}
if config.get('confirmationModels'):exports={label:root/path for label,path in config['confirmationModels'].items()}
for label,path in exports.items():
    kind=('public-v1' if label=='public' else 'zero-public-v1') if public else config.get('observationKind')
    options=['--observation-kind',kind] if kind else []
    subprocess.run([sys.executable,'scripts/rl/export_actor.py',str(path),leader,str(root/f'{label}.json'),*options],check=True)
subprocess.run(['bun','build','scripts/rl/four_player.ts','--target','bun','--outfile',str(root/'replay-runner.js')],check=True)
orders=list(itertools.permutations(['nereon','thaleia','doreios']))
games=[]
for index in range(config['confirmationGames']):
    block,rotation=divmod(index,4);order=['melia',*orders[block%6]]
    games.append(dict(index=index,block=block,rotation=rotation,seed=f"{config['prefix']}:confirm:{block}",seats=order[rotation:]+order[:rotation]))
for label in ['incumbent',*exports]:
    paths={l:str(root/'actors'/f'{l}.json') for l in ['melia','nereon','thaleia','doreios']}
    if label!='incumbent':paths[leader]=str(root/f'{label}.json')
    hashes={l:json.loads(Path(path).read_text())['checkpointSHA256'] for l,path in paths.items()}
    c=dict(output=str(root/f'replays-{label}'),workers=config['workers'],games=games,checkpointSHA256=hashes,checkDriver=False,actorPaths=paths)
    path=root/f'replay-{label}.json'
    if path.exists() and json.loads(path.read_text())!=c:raise RuntimeError('Refusing to change frozen confirmation')
    path.write_text(json.dumps(c,indent=2)+'\n')
print(f'Prepared {leader} {selected}: {len(games)} games per model.')
