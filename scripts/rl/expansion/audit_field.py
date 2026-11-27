"""Verify a research field's actors are exact exports of the recorded checkpoints."""
import base64,hashlib,json,subprocess,sys
from pathlib import Path
import numpy as np
import torch
from sb3_contrib import MaskablePPO

torch.set_num_threads(1)
path=Path(sys.argv[1]).resolve();field=json.loads(path.read_text())
meta=json.loads(subprocess.check_output(['bun','scripts/rl/expansion/metadata.ts'],text=True))
assert set(field['actors'])==set(field['checkpoints'])==set(field['stageLeaders'])
rows=[]
for leader in field['stageLeaders']:
    entry=field['actors'][leader];raw=Path(entry['path']).read_bytes()
    assert hashlib.sha256(raw).hexdigest()==entry['sha256'],leader
    actor=json.loads(raw);checkpoint=Path(field['checkpoints'][leader]);checkpoint_hash=hashlib.sha256(checkpoint.read_bytes()).hexdigest()
    assert actor['checkpointSHA256']==checkpoint_hash and actor['leader']==leader
    assert actor['schemaSignature']==meta['schema'] and actor['dtype']=='float32-le' and actor['activation']=='tanh' and actor['version']==1
    model=MaskablePPO.load(checkpoint,device='cpu');state=model.policy.state_dict()
    assert model.observation_space.shape==(meta['features'],) and model.action_space.n==meta['actions']
    keys=['mlp_extractor.policy_net.0','mlp_extractor.policy_net.2','action_net'];assert len(actor['layers'])==len(keys)
    for layer,key in zip(actor['layers'],keys,strict=True):
        w=state[key+'.weight'].cpu().numpy().astype('<f4');b=state[key+'.bias'].cpu().numpy().astype('<f4')
        assert (layer['output'],layer['input'])==w.shape
        assert np.array_equal(np.frombuffer(base64.b64decode(layer['weights']),dtype='<f4').reshape(w.shape),w),leader
        assert np.array_equal(np.frombuffer(base64.b64decode(layer['bias']),dtype='<f4'),b),leader
    rows.append(dict(leader=leader,actorSHA256=entry['sha256'],checkpointSHA256=checkpoint_hash,exactTensorMatch=True))
result=dict(field=str(path),fieldSHA256=hashlib.sha256(path.read_bytes()).hexdigest(),features=meta['features'],actions=meta['actions'],actors=rows)
path.with_name(path.stem+'-audit.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
