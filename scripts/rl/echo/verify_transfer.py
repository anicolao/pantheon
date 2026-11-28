"""Confirm transferred original-leader logits and Bun exports before any PPO updates."""
import json,subprocess,sys,tempfile,base64
from pathlib import Path
import numpy as np
import torch
from sb3_contrib import MaskablePPO
ROOT=Path(__file__).resolve().parents[3]
torch.set_num_threads(1)
run=Path(sys.argv[1]);mapping=json.loads(subprocess.check_output(['bun','-e',"import {legacyActionMap} from './scripts/rl/echo/schema';console.log(JSON.stringify(legacyActionMap))"],text=True))
rng=np.random.default_rng(2711)
for leader in ['thaleia','nereon','melia','doreios']:
    model=MaskablePPO.load(run/leader/'bc',device='cpu');actor=json.loads((ROOT/f'src/lib/bots/models/{leader}.json').read_text())
    x=torch.tensor(rng.normal(0,.3,(12,model.observation_space.shape[0])).astype(np.float32))
    with torch.no_grad():
        actual=model.policy.action_net(model.policy.mlp_extractor.forward_actor(x));old=x[:,:171]
        for i,layer in enumerate(actor['layers']):
            w=torch.tensor(np.frombuffer(base64.b64decode(layer['weights']),dtype='<f4').copy().reshape(layer['output'],layer['input']));b=torch.tensor(np.frombuffer(base64.b64decode(layer['bias']),dtype='<f4').copy())
            old=torch.nn.functional.linear(old,w,b)
            if i<2:old=torch.tanh(old)
        assert torch.allclose(actual[:,mapping],old,atol=2e-5,rtol=2e-5),leader
    with tempfile.NamedTemporaryFile(mode='w',suffix='.json') as f:
        json.dump(dict(actor=str((run/leader/'bc.json').resolve()),values=x.tolist()),f);f.flush()
        code="import {createActor} from './src/lib/bots/rl-runtime';import {schemaSignature} from './scripts/rl/echo/schema';const q=await Bun.file(process.argv[1]).json();const m=createActor(await Bun.file(q.actor).json(),schemaSignature);console.log(JSON.stringify(q.values.map((v:number[])=>Array.from(m.logits(v)))))"
        exported=np.array(json.loads(subprocess.check_output(['bun','-e',code,f.name],text=True)))
        assert np.allclose(exported,actual.numpy(),atol=2e-5,rtol=2e-5),leader
    print(leader+': transferred logits and exported runtime match')
