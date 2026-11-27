# Sequential expansion training audit

Shares below compare one changing learner against frozen opponents within that round. They are not a final cross-play matrix; the final matrix uses all selected policies together.

| Stage | Round | Leader | Before | After | Paired change, approximate 95% CI | Selection |
|---|---:|---|---:|---:|---:|---|
| theseus | 1 | echo | 16.0% | 58.6% | +42.6 pp [+37.0, +48.2] | ppo-1 |
| theseus | 1 | thaleia | 27.0% | 47.0% | +20.1 pp [+15.6, +24.5] | ppo-2 |
| theseus | 1 | nereon | 42.2% | 79.0% | +36.8 pp [+31.4, +42.3] | ppo-2 |
| theseus | 1 | melia | 79.8% | 81.4% | +1.6 pp [-1.5, +4.6] | ppo-1 |
| theseus | 1 | doreios | 47.1% | 82.2% | +35.0 pp [+29.5, +40.6] | ppo-2 |
| theseus | 1 | theseus | 66.4% | 78.4% | +12.0 pp [+8.1, +15.9] | ppo-2 |
| theseus | 2 | echo | 21.7% | 23.3% | +1.6 pp [-1.6, +4.7] | ppo-2 |
| theseus | 2 | thaleia | 19.8% | 56.6% | +36.8 pp [+31.7, +42.0] | ppo-2 |
| theseus | 2 | nereon | 62.4% | 73.0% | +10.7 pp [+6.1, +15.2] | ppo-2 |
| theseus | 2 | melia | 70.8% | 75.3% | +4.4 pp [+0.3, +8.6] | ppo-2 |
| theseus | 2 | doreios | 56.0% | 59.1% | +3.1 pp [-0.3, +6.5] | ppo-1 |
| theseus | 2 | theseus | 58.2% | 63.7% | +5.5 pp [+1.0, +9.9] | ppo-2 |
| achilles | 1 | echo | 42.2% | 49.6% | +7.4 pp [+3.1, +11.7] | ppo-1 |
| achilles | 1 | thaleia | 74.9% | 77.5% | +2.6 pp [-1.0, +6.2] | ppo-1 |
| achilles | 1 | nereon | 85.2% | 85.2% | +0.0 pp [+0.0, +0.0] | incumbent |
| achilles | 1 | melia | 85.4% | 87.8% | +2.3 pp [-1.1, +5.8] | ppo-2 |
| achilles | 1 | doreios | 75.9% | 78.1% | +2.2 pp [-0.7, +5.1] | ppo-2 |
| achilles | 1 | theseus | 69.5% | 74.6% | +5.1 pp [+1.8, +8.3] | ppo-1 |
| achilles | 1 | achilles | 6.6% | 25.0% | +18.4 pp [+13.7, +23.0] | ppo-2 |
| achilles | 2 | echo | 9.0% | 38.5% | +29.6 pp [+24.2, +34.9] | ppo-2 |
| achilles | 2 | thaleia | 72.5% | 72.5% | +0.0 pp [+0.0, +0.0] | incumbent |
| achilles | 2 | nereon | 79.7% | 79.7% | +0.0 pp [+0.0, +0.0] | incumbent |
| achilles | 2 | melia | 87.0% | 87.0% | +0.0 pp [+0.0, +0.0] | incumbent |
| achilles | 2 | doreios | 73.6% | 73.6% | +0.0 pp [+0.0, +0.0] | incumbent |
| achilles | 2 | theseus | 70.3% | 72.1% | +1.8 pp [-1.5, +5.1] | ppo-2 |
| achilles | 2 | achilles | 21.9% | 19.5% | -2.3 pp [-4.4, -0.3] | ppo-2 |
| perseus | 1 | echo | 58.1% | 65.6% | +7.6 pp [+3.8, +11.4] | ppo-2 |
| perseus | 1 | thaleia | 75.0% | 75.0% | +0.0 pp [+0.0, +0.0] | incumbent |
| perseus | 1 | nereon | 79.4% | 84.0% | +4.6 pp [+1.6, +7.5] | ppo-2 |
| perseus | 1 | melia | 91.8% | 91.1% | -0.7 pp [-2.6, +1.3] | ppo-2 |
| perseus | 1 | doreios | 74.9% | 75.4% | +0.5 pp [-2.2, +3.3] | ppo-2 |
| perseus | 1 | theseus | 77.0% | 81.4% | +4.4 pp [+2.2, +6.7] | ppo-1 |
| perseus | 1 | achilles | 24.7% | 60.7% | +35.9 pp [+30.2, +41.7] | ppo-2 |
| perseus | 1 | perseus | 9.8% | 35.7% | +25.9 pp [+21.1, +30.8] | ppo-2 |
| perseus | 2 | echo | 46.5% | 46.5% | +0.0 pp [+0.0, +0.0] | incumbent |
| perseus | 2 | thaleia | 62.9% | 65.9% | +3.0 pp [-1.1, +7.1] | ppo-2 |
| perseus | 2 | nereon | 77.2% | 76.8% | -0.4 pp [-3.8, +3.0] | ppo-2 |
| perseus | 2 | melia | 86.2% | 86.2% | +0.0 pp [+0.0, +0.0] | incumbent |
| perseus | 2 | doreios | 66.3% | 67.1% | +0.8 pp [-2.8, +4.4] | ppo-1 |
| perseus | 2 | theseus | 69.8% | 69.8% | +0.0 pp [+0.0, +0.0] | incumbent |
| perseus | 2 | achilles | 35.9% | 51.4% | +15.5 pp [+10.6, +20.4] | ppo-1 |
| perseus | 2 | perseus | 23.6% | 28.1% | +4.6 pp [-0.2, +9.3] | ppo-2 |
| consolidation | 1 | echo | 26.4% | 25.5% | -0.9 pp [-5.8, +3.9] | ppo-2 |
| consolidation | 1 | thaleia | 53.9% | 54.4% | +0.5 pp [-4.2, +5.2] | ppo-2 |
| consolidation | 1 | nereon | 72.7% | 71.0% | -1.7 pp [-4.2, +0.8] | ppo-1 |
| consolidation | 1 | melia | 73.6% | 78.6% | +5.1 pp [+1.2, +9.0] | ppo-2 |
| consolidation | 1 | doreios | 54.3% | 60.5% | +6.2 pp [+2.5, +10.0] | ppo-2 |
| consolidation | 1 | theseus | 59.9% | 58.5% | -1.4 pp [-4.3, +1.4] | ppo-1 |
| consolidation | 1 | achilles | 33.3% | 32.9% | -0.4 pp [-3.3, +2.6] | ppo-2 |
| consolidation | 1 | perseus | 23.7% | 23.7% | +0.0 pp [+0.0, +0.0] | incumbent |

Completed learner comparisons audited: 50. Each comparison checks checkpoint availability, screening-only selection, separate test namespaces, matching seeds/opponents/starts, complete paired blocks, and recomputed shares.
