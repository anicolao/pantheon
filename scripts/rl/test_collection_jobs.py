import tempfile
import unittest
from pathlib import Path
from collection_jobs import collection_jobs

class CollectionJobsTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        (self.root / 'trajectories').mkdir()

    def jobs(self):
        return list(collection_jobs(self.root, 2, 'checkpoint', 'manifest', 'prefix'))

    def test_singletons_cover_exact_batch_in_seed_order(self):
        jobs = self.jobs()
        self.assertEqual([j['start'] for j in jobs], list(range(64,128)))
        self.assertTrue(all(j['games']==1 for j in jobs))

    def test_completed_group_is_reused_without_duplicate_games(self):
        for ext in ['npz','json']:
            (self.root / 'trajectories' / f'00068.{ext}').touch()
        jobs = self.jobs()
        self.assertEqual(len(jobs),61)
        self.assertEqual([i for j in jobs for i in range(j['start'],j['start']+j['games'])],list(range(64,128)))
        self.assertEqual(jobs[4]['games'],4)

    def test_incomplete_evidence_is_rejected(self):
        (self.root / 'trajectories' / 'game-00064.npz').touch()
        with self.assertRaisesRegex(RuntimeError,'Incomplete trajectory'):self.jobs()

if __name__=='__main__':unittest.main()
