"""Audit completed round comparisons without interpreting screening as confirmation."""
import hashlib,json,math,sys
from pathlib import Path
from statistics import mean,stdev
root=Path(sys.argv[1]).resolve();campaign=json.loads((root/'protocol.json').read_text());rows=[]
for name in campaign['order']+['consolidation']:
    folder=root/name
    if not (folder/'protocol.json').exists():continue
    protocol=json.loads((folder/'protocol.json').read_text())
    assert protocol['stageLeaders']==['echo','thaleia','nereon','melia','doreios','theseus','achilles','perseus'][:len(protocol['stageLeaders'])]
    for index in range(1,protocol['rounds']+1):
        round_dir=folder/f'round-{index}'
        if not (round_dir/'results.json').exists():continue
        results=json.loads((round_dir/'results.json').read_text())
        frozen=json.loads((round_dir/'frozen-field.json').read_text())
        for leader,result in results.items():
            target=round_dir/leader;selection=json.loads((target/'selection.json').read_text());scores=selection['screen']
            assert selection['selected']==max(scores,key=lambda k:scores[k]['share'])==result['selected']
            for label in ['incumbent','ppo-1','ppo-2']:
                assert (target/(label+'.zip')).is_file()
                screen=json.loads((target/(label+'-screen.json')).read_text());assert len(screen)==protocol['screen_games']
                assert all(':screen:' in r['seed'] and r['replayVerified'] for r in screen)
                assert abs(mean(r['share'] for r in screen)-scores[label]['share'])<1e-12
            before=json.loads((target/'incumbent-test.json').read_text());after=json.loads((target/(result['selected']+'-test.json')).read_text())
            assert len(before)==len(after)==protocol['test_games']
            assert len({r['seed'] for r in after})==len(after)
            blocks={}
            for a,b in zip(after,before,strict=True):
                assert a['seed']==b['seed'] and a['gameSeed']==b['gameSeed'] and a['first']==b['first']
                assert a['opponentLeader']==b['opponentLeader'] and a['opponentLeader'] in frozen['stageLeaders'] and a['opponentLeader']!=leader
                assert a['replayVerified'] and b['replayVerified'] and ':test:' in a['seed']
                blocks.setdefault(a['block'],[]).append((a['share']-b['share'],a['first']))
            assert all(len(v)==2 and {r[1] for r in v}=={True,False} for v in blocks.values())
            delta=[mean(x[0] for x in v) for v in blocks.values()];m=mean(delta);h=1.96*stdev(delta)/math.sqrt(len(delta))
            baseline=mean(r['share'] for r in before);candidate=mean(r['share'] for r in after)
            assert abs(baseline-result['baseline']['share'])<1e-12 and abs(candidate-result['candidate']['share'])<1e-12
            rows.append(dict(stage=name,round=index,leader=leader,selected=result['selected'],baseline=baseline,candidate=candidate,delta=m,pairedApprox95CI=[m-h,m+h],games=len(after)))
lines=['# Sequential expansion training audit','', 'Shares below compare one changing learner against frozen opponents within that round. They are not a final cross-play matrix; the final matrix uses all selected policies together.','', '| Stage | Round | Leader | Before | After | Paired change, approximate 95% CI | Selection |','|---|---:|---|---:|---:|---:|---|']
for r in rows:lines.append(f"| {r['stage']} | {r['round']} | {r['leader']} | {100*r['baseline']:.1f}% | {100*r['candidate']:.1f}% | {100*r['delta']:+.1f} pp [{100*r['pairedApprox95CI'][0]:+.1f}, {100*r['pairedApprox95CI'][1]:+.1f}] | {r['selected']} |")
lines+=['',f'Completed learner comparisons audited: {len(rows)}. Each comparison checks checkpoint availability, screening-only selection, separate test namespaces, matching seeds/opponents/starts, complete paired blocks, and recomputed shares.']
(root/'training-audit.json').write_text(json.dumps(dict(comparisons=rows,reportSourceSHA256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()),indent=2))
(root/'TRAINING.md').write_text('\n'.join(lines)+'\n');print('\n'.join(lines))
