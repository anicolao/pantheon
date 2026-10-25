import unittest
from train import Game
class PotentialTests(unittest.TestCase):
    def test_shaping_preserves_outcome_and_dynamics(self):
        plain=Game(seed_prefix='rl-potential-unit')
        shaped=Game(seed_prefix='rl-potential-unit',potential_scale=.5)
        try:
            for _ in range(4):
                a,_=plain.reset();b,_=shaped.reset();self.assertTrue((a==b).all())
                total_plain=total_shaped=0.;done=False
                while not done:
                    action=plain.teacher();self.assertEqual(action,shaped.teacher())
                    a,r,done,_,info=plain.step(action);b,s,other_done,_,other_info=shaped.step(action)
                    self.assertEqual(done,other_done);self.assertTrue((a==b).all())
                    total_plain+=r;total_shaped+=s
                self.assertAlmostEqual(total_plain,total_shaped,places=6)
                self.assertEqual(info,other_info)
        finally:plain.close();shaped.close()
if __name__=='__main__':unittest.main()
