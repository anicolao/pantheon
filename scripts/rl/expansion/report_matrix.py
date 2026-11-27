"""Analyze a frozen final matrix. Pointwise intervals cluster opposite starting seats."""
import json,math,sys
from pathlib import Path
from statistics import mean
root=Path(sys.argv[1]);protocol=json.loads((root/'protocol.json').read_text());complete=json.loads((root/'complete.json').read_text())
heroes=['thaleia','nereon','melia','doreios','echo','theseus','achilles','perseus'];matrix={a:{} for a in heroes};first=[];details=[]
def interval(p,n):
    z=1.95996398454;den=1+z*z/n;center=(p+z*z/(2*n))/den;half=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den
    return [max(0,center-half),min(1,center+half)]
for pair in protocol['pairs']:
    a,b=pair['a'],pair['b'];rows=json.loads((root/pair['pair']/'results.json').read_text());assert len(rows)==protocol['gamesPerPair']
    assert len({r['seed'] for r in rows})==len(rows)
    for i in range(0,len(rows),2):
        x,y=rows[i:i+2];assert x['first'] and not y['first'] and x['gameSeed']==y['gameSeed'] and x['block']==y['block']
        assert x['leader']==y['leader']==a and x['opponentLeader']==y['opponentLeader']==b
    assert all(r['replayVerified'] for r in rows)
    share=mean(r['share'] for r in rows);ci=interval(share,len(rows)//2)
    matrix[a][b]=dict(share=share,CI95=ci);matrix[b][a]=dict(share=1-share,CI95=[1-ci[1],1-ci[0]])
    first.extend(r['share'] if r['first'] else 1-r['share'] for r in rows)
    details.append(dict(a=a,b=b,share=share,CI95=ci,wins=sum(r['share']==1 for r in rows),ties=sum(r['share']==.5 for r in rows),losses=sum(r['share']==0 for r in rows),meanTurns=mean(r['turns'] for r in rows)))
assert len(details)==28 and complete['games']==sum(protocol['gamesPerPair'] for _ in details)
ranking=sorted([dict(leader=a,averageShare=mean(matrix[a][b]['share'] for b in heroes if b!=a)) for a in heroes],key=lambda r:-r['averageShare'])
result=dict(matrix=matrix,ranking=ranking,firstPlayerShare=mean(first),matchups=details,confidence='Approximate pointwise Wilson intervals treating each two-seat seed block as one independent unit; conservative for fractional outcomes; no family-wise multiplicity claim')
(root/'analysis.json').write_text(json.dumps(result,indent=2))
lines=['# Eight-leader heads-up RL matrix','',f"{complete['games']:,} replay-verified games; {protocol['gamesPerPair']//2} fresh seeds per pairing, each with both starting orders. Entries are row-leader win share (ties count as half).",'', '| Leader | '+' | '.join(a.title() for a in heroes)+' |','|---|'+'---:|'*8]
for a in heroes:lines.append('| '+a.title()+' | '+' | '.join('—' if a==b else f"{matrix[a][b]['share']*100:.1f}%" for b in heroes)+' |')
lines+=['','## Matchup uncertainty','', '| Pairing | First leader’s share | Approx. 95% CI | W / T / L | Mean turns |','|---|---:|---:|---:|---:|']
for r in details:lines.append(f"| {r['a'].title()} vs {r['b'].title()} | {100*r['share']:.1f}% | {100*r['CI95'][0]:.1f}–{100*r['CI95'][1]:.1f}% | {r['wins']} / {r['ties']} / {r['losses']} | {r['meanTurns']:.1f} |")
lines+=['','## Interpretation','', 'Average share against the seven equally weighted opponents: '+', '.join(f"{r['leader'].title()} {100*r['averageShare']:.1f}%" for r in ranking)+'.',f"Across the balanced pairings, the starting player took {100*mean(first):.1f}% of win credit.",'','Intervals account for the two starts sharing a game seed, but not variation across independent training runs. They are descriptive pointwise intervals, not simultaneous guarantees across 28 comparisons. These results measure this frozen trained field under current expansion rules; they do not establish intrinsic leader balance or strength against humans. Final matrix games were not used to select checkpoints.']
(root/'REPORT.md').write_text('\n'.join(lines)+'\n');print('\n'.join(lines))
