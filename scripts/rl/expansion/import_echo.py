"""Migrate actors AND critics by feature/action identity, validating old logits."""
import json,sys,subprocess
from pathlib import Path
from common import *
def main():
    source=Path(sys.argv[1]).resolve();out=Path(sys.argv[2]).resolve();out.mkdir(parents=True,exist_ok=False)
    torch.set_num_threads(1);torch.manual_seed(27112027)
    meta=json.loads(subprocess.check_output(['bun','scripts/rl/expansion/metadata.ts'],text=True))
    assert min(meta['echoFeatures'])>=0 and min(meta['echoActions'])>=0
    actors={};checkpoints={};heroes=['echo','thaleia','nereon','melia','doreios']
    teacher=out/'teacher.json';teacher.write_text(json.dumps(dict(stageLeaders=heroes,newest='echo',actors={})))
    for leader in heroes:
        old_label=json.loads((source/leader/'selection.json').read_text())['selected']
        old=MaskablePPO.load(source/leader/old_label,device='cpu')
        vec=vector(1,'import-check',leader,str(teacher))
        try:
            model=MaskablePPO('MlpPolicy',vec,seed=27112027+heroes.index(leader),device='cpu',n_steps=256,batch_size=256,n_epochs=4,learning_rate=1e-4,gamma=1.,gae_lambda=1.,ent_coef=.003,target_kl=.02,policy_kwargs=dict(net_arch=dict(pi=[128,128],vf=[128,128])))
            a=old.policy.state_dict();b=model.policy.state_dict()
            with torch.no_grad():
                for path in ['mlp_extractor.policy_net','mlp_extractor.value_net']:
                    b[path+'.0.weight'].zero_();b[path+'.0.weight'][:,meta['echoFeatures']]=a[path+'.0.weight']
                    for suffix in ['.0.bias','.2.weight','.2.bias']:b[path+suffix].copy_(a[path+suffix])
                for key in ['value_net.weight','value_net.bias']:b[key].copy_(a[key])
                b['action_net.weight'][meta['echoActions']]=a['action_net.weight'];b['action_net.bias'][meta['echoActions']]=a['action_net.bias']
                model.policy.load_state_dict(b)
                x=torch.randn(32,len(meta['echoFeatures']))*.3;y=torch.randn(32,meta['features'])*.3;y[:,meta['echoFeatures']]=x
                old_logits=old.policy.action_net(old.policy.mlp_extractor.forward_actor(x));new_logits=model.policy.action_net(model.policy.mlp_extractor.forward_actor(y))[:,meta['echoActions']]
                assert torch.allclose(old_logits,new_logits,atol=2e-5,rtol=2e-5),leader
                assert torch.allclose(old.policy.value_net(old.policy.mlp_extractor.forward_critic(x)),model.policy.value_net(model.policy.mlp_extractor.forward_critic(y)),atol=2e-5,rtol=2e-5),leader
            model.save(out/leader);actors[leader]=export(model,leader,out/(leader+'.json'),meta['schema'],out/(leader+'.zip'));checkpoints[leader]=str(out/(leader+'.zip'))
            print(leader+': actor/critic migration verified',flush=True)
        finally:close_vector(vec)
    (out/'field.json').write_text(json.dumps(dict(stageLeaders=heroes,newest='echo',actors=actors,checkpoints=checkpoints),indent=2))
if __name__=='__main__':main()
