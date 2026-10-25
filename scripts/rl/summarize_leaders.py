"""Verify frozen leader final tests and assemble comparable statistics."""
import argparse,hashlib,json,statistics
from pathlib import Path
from train import stats
from anchored_ppo import AnchoredPPO
import torch

def summarize(root):
    torch.set_num_threads(1)
    rows_by_leader={};summaries={};hashes={};actor_hashes={}
    for leader in ['doreios','thaleia','nereon']:
        directory=root/leader
        manifest=json.loads((directory/'champion.json').read_text())
        digest=hashlib.sha256((directory/'champion.zip').read_bytes()).hexdigest()
        assert digest==manifest['sha256'];hashes[leader]=digest
        evaluated=json.loads((directory/'final/results.json').read_text())
        assert evaluated['checkpointSHA256']['champion']==digest
        model=AnchoredPPO.load(directory/'champion',device='cpu')
        assert model.observation_space.shape==(171,) and model.action_space.n==349
        actor=hashlib.sha256()
        for key,value in sorted(model.policy.state_dict().items()):
            if key.startswith(('mlp_extractor.policy_net','action_net')):actor.update(key.encode());actor.update(value.cpu().numpy().tobytes())
        actor_hashes[leader]=actor.hexdigest()
        protocol=json.loads((directory/'final/protocol.json').read_text())
        assert protocol['leader']==leader and protocol['namespace']=='test' and protocol['games']==4000
        rows=json.loads((directory/'final/champion.json').read_text())
        assert len(rows)==4000
        assert {r['seed'] for r in rows}=={f"{protocol['prefix']}:test:{i}" for i in range(4000)}
        assert sum(r['first'] for r in rows)==2000
        assert all(r['replayVerified'] and r['reward']==r['outcome'] for r in rows)
        summary=stats(rows);summary['winRate']=summary['wins']/4000
        summary['targetPassed']=summary['winCI95'][0]>.5
        summary['firstSeat']=stats([r for r in rows if r['first']])
        summary['secondSeat']=stats([r for r in rows if not r['first']])
        summary['meanVP']=statistics.mean(r['score'] for r in rows)
        summary['meanOpponentVP']=statistics.mean(r['opponentScore'] for r in rows)
        summary['meanTurns']=statistics.mean(r['turns'] for r in rows)
        summaries[leader]=summary;rows_by_leader[leader]=rows
    assert len(set(hashes.values()))==3 and len(set(actor_hashes.values()))==3,'Expected three distinct policies'
    assert len({tuple(r['seed'] for r in rows) for rows in rows_by_leader.values()})==1
    sources=json.loads((root/'game-source-hashes.json').read_text())
    assert all(hashlib.sha256(Path(p).read_bytes()).hexdigest()==digest for p,digest in sources.items())
    result=dict(opponent='Unchanged MM v3 / Melia',gamesPerModel=4000,equalStartingSeats=True,
        all12000GamesReplayVerified=True,sourceHashesUnchanged=True,checkpointSHA256=hashes,actorParameterSHA256=actor_hashes,
        criterion='Each individual Wilson 95% lower bound for outright wins exceeds 50%; ties do not count as wins',
        allTargetsPassed=all(r['targetPassed'] for r in summaries.values()),leaders=summaries)
    (root/'summary.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))
    return result
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('root',type=Path);args=p.parse_args();summarize(args.root)
