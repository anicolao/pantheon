import numpy as np
import gymnasium as gym
from types import SimpleNamespace
from episode_ppo_buffer import episode_buffer
m=SimpleNamespace(observation_space=gym.spaces.Box(-1,1,(2,)),action_space=gym.spaces.Discrete(2))
d=dict(observations=np.zeros((4,2),np.float32),masks=np.ones((4,2),bool),actions=np.zeros(4,np.int64),values=np.zeros(4,np.float32),logp=np.zeros(4,np.float32),rewards=np.array([0,1,0,-1],np.float32),starts=np.array([True,False,True,False]))
b=episode_buffer(m,d)
assert np.array_equal(b.advantages.flatten(),np.array([.95,1,-.95,-1],np.float32)),b.advantages
# A different second game's outcome cannot affect the first game's returns.
d['rewards'][-1]=1;c=episode_buffer(m,d);assert np.array_equal(b.returns[:2],c.returns[:2]);assert np.array_equal(c.returns.flatten(),np.array([.95,1,.95,1],np.float32))
print('Complete-episode GAE boundaries verified exactly')
