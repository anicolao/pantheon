from pathlib import Path
import json, csv, sys
p=Path(sys.argv[1])
m=json.loads((p/'manifest.json').read_text())
assert m['status']=='completed'
league=json.loads((p/'league.json').read_text())
cells=json.loads((p/'cells.json').read_text())
est=json.loads((p/'estimates.json').read_text())
leaders=['thaleia','nereon','melia','doreios']
summary={}
for leader in leaders:
 rows=[r for r in league if r['leader']==leader]
 summary[leader]={'share':sum(r['share'] for r in rows)/len(rows),'bestObserved':max(rows,key=lambda r:r['share'])}
print(json.dumps({'leaders':summary,'pairs':{k:{'share':v['share'],'interval':v['shareInterval']} for k,v in est.items()}},indent=2))
with open(p/'cells.csv','w') as f:
 writer=csv.DictWriter(f,fieldnames=['a','b','familyA','familyB','games','share']);writer.writeheader();writer.writerows(cells)
lines=['# Descriptive counter patterns','', 'These strategies are selected after seeing evaluation and are descriptive only. Each candidate row considers the worst of five opposing strategy families, within the frozen trained profiles. This is neither an independent counter-selection study nor an equilibrium calculation. The complete matrices remain the main evidence.','', '| Leader | Rival | Largest observed minimum: own family | Worst observed opposing family | Share in that cell |','| --- | --- | --- | --- | ---: |']
for leader in leaders:
 for rival in leaders:
  if leader==rival:continue
  pair=[]
  for row in cells:
   if row['a']==leader and row['b']==rival:pair.append((row['familyA'],row['familyB'],row['share']))
   if row['b']==leader and row['a']==rival:pair.append((row['familyB'],row['familyA'],1-row['share']))
  options=[]
  for family in ['treasure','engine','thin','worship','race']:
   options.append(min((r for r in pair if r[0]==family),key=lambda r:r[2]))
  chosen=max(options,key=lambda r:r[2])
  lines.append(f'| {leader} | {rival} | {chosen[0]} | {chosen[1]} | {100*chosen[2]:.1f}% |')
(p/'counter-patterns.md').write_text('\n'.join(lines)+'\n')
(p/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
