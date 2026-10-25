"""Checkpointed continuation experiments; screening only, no final test access."""
import argparse,json,time,hashlib,subprocess
from pathlib import Path
import numpy as np
import torch
from anchored_ppo import AnchoredPPO
from train import ROOT,vector,evaluate,stats,Progress

def run(config):
    out=Path(config['output']);out.mkdir(parents=True,exist_ok=True)
    if (out/'protocol.json').exists():raise RuntimeError('Fresh output directory required')
    torch.set_num_threads(1);torch.manual_seed(config['seed']);np.random.seed(config['seed'])
    protocol=dict(config,sourceCommit=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),
      baseSHA256=hashlib.sha256(Path(config['base']+'.zip').read_bytes()).hexdigest(),
      referenceSHA256=hashlib.sha256(Path(config['reference']+'.zip').read_bytes()).hexdigest(),
      sourceHashes={str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for f in (ROOT/'scripts/rl').rglob('*') if f.is_file() and '__pycache__' not in str(f)},
      opponentDescription='frozen RL pool' if config.get('opponent','mm')!='mm' else 'frozen MM v3/Melia',reward='terminal win/tie/loss +1/0/-1; optional potential differences telescope to zero over each episode',selection='screen only; new confirmation/final seeds required')
    (out/'protocol.json').write_text(json.dumps(protocol,indent=2))
    start=time.monotonic();vec=vector(config.get('workers',8),config['trainNamespace'],config['prefix'],config.get('potential_scale',0.),config.get('leader','doreios'),config.get('teacher','classic-engine'),opponent=config.get('trainOpponent',config.get('opponent','mm')));ev=None
    try:
        model=AnchoredPPO.load(config['base'],env=vec,device='cpu',learning_rate=config['lr'],
          n_steps=config['rollout'],batch_size=config['batch'],gae_lambda=config['gae'],
          ent_coef=config.get('entropy',.001),target_kl=.02,n_epochs=4)
        reference=AnchoredPPO.load(config['reference'],device='cpu')
        model.reference=reference.policy;model.reference.set_training_mode(False)
        for p in model.reference.parameters():p.requires_grad_(False)
        model.anchor_coefficient=config['anchor']
        # Loading the reference also initializes RNGs; seed the learner afterwards.
        model.set_random_seed(config['seed'])
        if config.get('logit_scale',1.)!=1.:
            with torch.no_grad():
                model.policy.action_net.weight.mul_(config['logit_scale'])
                model.policy.action_net.bias.mul_(config['logit_scale'])
        if config.get('reset_optimizer',False):
            model.policy.optimizer=torch.optim.Adam(model.policy.parameters(),lr=config['lr'],eps=1e-5)
        progress=Progress();rows_by_checkpoint={}
        for stage in range(config['stages']):
            model.learn(total_timesteps=config['steps']//config['stages'],reset_num_timesteps=stage==0,callback=progress)
            label=f'checkpoint-{model.num_timesteps}';model.save(out/label)
            ev=vector(config.get('workers',8),config['screenNamespace'],config['prefix'],leader=config.get('leader','doreios'),teacher=config.get('teacher','classic-engine'),opponent=config.get('opponent','mm'))
            try:rows=evaluate(ev,model,config['screenNamespace'],config['screenGames'])
            finally:ev.close();ev=None
            summary=stats(rows);rows_by_checkpoint[label]=summary
            (out/f'{label}-screen.json').write_text(json.dumps(rows))
            print(json.dumps(dict(stage='screen',checkpoint=label,referenceKL=model.logger.name_to_value.get('train/reference_kl'),elapsedSeconds=time.monotonic()-start,**summary)),flush=True)
        result=dict(checkpoints=rows_by_checkpoint,trainingGames=progress.games,trainingSteps=model.num_timesteps,elapsedSeconds=time.monotonic()-start)
        (out/'results.json').write_text(json.dumps(result,indent=2))
    finally:
        if ev is not None:ev.close()
        vec.close()

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('config');args=parser.parse_args()
    run(json.loads(Path(args.config).read_text()))
