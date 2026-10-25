import tempfile,unittest
from pathlib import Path
import numpy as np
import torch
from anchored_ppo import AnchoredPPO
from collect_independent import worker
from train import Game

class CollectionTests(unittest.TestCase):
    def test_seeded_expert_and_mixed_collection_are_reproducible_and_legal(self):
        torch.set_num_threads(1)
        with tempfile.TemporaryDirectory() as directory:
            env=Game(leader='nereon',teacher='fleet-v1')
            try:
                model=AnchoredPPO('MlpPolicy',env,seed=7,n_steps=8,batch_size=8,policy_kwargs=dict(net_arch=[16,16]),device='cpu')
                path=str(Path(directory)/'random-test-policy');model.save(path)
            finally:env.close()
            c=dict(seed=11,imitationGames=1,daggerGames=1,workers=1,prefix='rl-collection-unit-test',leader='nereon',teacher='fleet-v1')
            for probability in [1.,.5]:
                args=(c,'test-collection',probability,path,0)
                first=worker(args);second=worker(args)
                for a,b in zip(first,second):np.testing.assert_array_equal(a,b)
                self.assertTrue(np.isfinite(first[0]).all())
                self.assertTrue(first[1][np.arange(len(first[2])),first[2]].all())
if __name__=='__main__':unittest.main()
