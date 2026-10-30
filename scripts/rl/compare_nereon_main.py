"""Matched production-main Nereon versus the completed additional-data checkpoint."""
import json, os, subprocess, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from run_nereon_planning_rl import sha, write, paired_table

R = Path('balance-results/nereon-main-comparison-v1')
S = Path('balance-results/nereon-more-data-v1')

def main():
    resume='--resume' in os.sys.argv
    if not resume:
        R.mkdir(exist_ok=False);(R/'chunks').mkdir()
        commit=subprocess.check_output(['git','rev-parse','origin/main'],text=True).strip()
        def main_file(name):return subprocess.check_output(['git','show',commit+':'+name])
        actor=R/'production-nereon.json';actor.write_bytes(main_file('src/lib/bots/models/nereon.json'))
        # Only the research schema parameter differs; inference arithmetic is identical.
        runtime=main_file('src/lib/bots/rl-runtime.ts').decode()
        current=Path('src/lib/bots/rl-runtime.ts').read_text().replace('createActor(actor:Actor,expectedSchemaSignature=schemaSignature)','createActor(actor:Actor)').replace('actor.schemaSignature!==expectedSchemaSignature','actor.schemaSignature!==schemaSignature')
        assert current==runtime,'Production inference changed; inspect before comparing'
        for name in ['src/lib/bots/rl-schema.ts','src/lib/bots/rl.ts']:
            assert Path(name).read_bytes()==main_file(name),'Production schema/policy changed'
        manifest=json.loads((S/'comparison-manifest.json').read_text())
        assert 'nereon' not in manifest['planning']['policies']
        manifest['actors']['nereon']=dict(path=str(actor.resolve()),sha256=sha(actor))
        write(R/'manifest.json',manifest)
        write(R/'worker.json',dict(leader='nereon',manifest=str(R/'manifest.json')))
        (R/'pair-worker.js').write_bytes((S/'pair-worker.js').read_bytes())
        c=dict(mainCommit=commit,productionActorSHA256=sha(actor),productionCheckpoint=json.loads(actor.read_text())['checkpointSHA256'],
               candidateActorSHA256=sha(S/'comparison-actor.json'),candidateCheckpoint=json.loads((S/'selection.json').read_text())['checkpointSHA256'],
               candidateResultsSHA256=sha(S/'comparison.json'),manifestSHA256=sha(R/'manifest.json'),workerSHA256=sha(R/'pair-worker.js'),
               prefix=json.loads((S/'config.json').read_text())['comparisonPrefix'],games=400,workers=16,
               design='Same 400 seeds and seat rotations as completed raw-RL comparison; change only actual Nereon actor. Frozen opponents and planner world models unchanged. Reuse candidate results; run production actor on every seed with full replay. Split ties and cluster intervals over 100 four-rotation seed blocks. Neither Nereon uses planning. This is not an all-production table and the benchmark is reused.')
        write(R/'config.json',c)
    else:
        c=json.loads((R/'config.json').read_text());old=json.loads((R/'queue.json').read_text())
        try:os.kill(old['pid'],0)
        except ProcessLookupError:pass
        else:raise RuntimeError('Previous controller PID still exists')
    for name,key in [('production-nereon.json','productionActorSHA256'),('manifest.json','manifestSHA256'),('pair-worker.js','workerSHA256')]:assert sha(R/name)==c[key]
    assert sha(S/'comparison.json')==c['candidateResultsSHA256']
    write(R/'queue.json',dict(pid=os.getpid(),started=time.time()))
    def game(index):
        path=R/'chunks'/f'{index:04}.json'
        if path.exists():part=json.loads(path.read_text())
        else:
            job=dict(prefix=c['prefix'],start=index,games=1)
            result=subprocess.run(['bun',str(R/'pair-worker.js'),str(R/'worker.json'),json.dumps(job)],check=True,capture_output=True,text=True)
            part=dict(job,**json.loads(result.stdout),manifestSHA256=c['manifestSHA256']);write(path,part)
        assert part['start']==index and part['prefix']==c['prefix'] and part['manifestSHA256']==c['manifestSHA256']
        assert len(part['rows'])==1 and part['rows'][0]['replayVerified']
        return part
    parts=[]
    with ThreadPoolExecutor(max_workers=c['workers']) as pool:
        for f in as_completed([pool.submit(game,i) for i in range(c['games'])]):
            parts.append(f.result());print(json.dumps(dict(completed=len(parts),total=c['games'])),flush=True)
    rows=[p['rows'][0] for p in sorted(parts,key=lambda p:p['start'])];write(R/'production.json',rows)
    candidate=json.loads((S/'comparison.json').read_text())
    result=dict(mainCommit=c['mainCommit'],gamesPerArm=400,table=paired_table(rows,candidate),productionUpdated=False)
    write(R/'results.json',result);write(R/'queue-finished.json',dict(completed=True,time=time.time()))
    print(json.dumps(result,indent=2),flush=True)

if __name__=='__main__':main()
