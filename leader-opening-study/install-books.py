import json,subprocess
from pathlib import Path
root=Path(__file__).resolve().parent
historic=json.loads((root/'selected-books.json').read_text());current=json.loads((root/'current-engine'/'selected-books.json').read_text())
cards=json.loads(subprocess.check_output(['bun','-e',"import {cards} from './src/lib/game/cards';console.log(JSON.stringify(Object.fromEntries(cards.map(c=>[c.id,c]))))"],cwd=root.parent,text=True))
for registry in [historic,current]:
 assert set(registry)=={'thaleia','nereon','melia','doreios'}
 for book in registry.values():
  for key,card in book.items():
   turn,budget=map(int,key.split(':'));assert turn in [1,2] and budget>=0
   if card is not None:assert card in cards and cards[card]['cost'] is not None and cards[card]['cost']<=budget and cards[card]['supply']['2']>0 and cards[card]['type'] not in ['Leader','Event']
text='export type OpeningBook=Record<string,string|null>;\n'
text+='export const openingBooks:Record<string,OpeningBook>='+json.dumps(historic,indent=2)+';\n'
text+='export const currentOpeningBooks:Record<string,OpeningBook>='+json.dumps(current,indent=2)+';\n'
(root.parent/'src/lib/bots/opening-books.ts').write_text(text)
print('Installed separate legal opening registries for both Engines')
