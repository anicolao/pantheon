"""Training-only outcome regression from actor features; inference remains the same MLP."""
import torch
from sb3_contrib.common.maskable.policies import MaskableActorCriticPolicy

class AuxiliaryPolicy(MaskableActorCriticPolicy):
    def _build(self,lr_schedule):
        super()._build(lr_schedule)
        self.auxiliary_value_head=torch.nn.Linear(self.mlp_extractor.latent_dim_pi,1)
        torch.nn.init.zeros_(self.auxiliary_value_head.weight)
        torch.nn.init.zeros_(self.auxiliary_value_head.bias)
        self.optimizer=self.optimizer_class(self.parameters(),lr=lr_schedule(1),**self.optimizer_kwargs)

    def auxiliary_values(self,observations):
        features=self.extract_features(observations)
        if isinstance(features,tuple):features=features[0]
        latent=self.mlp_extractor.forward_actor(features)
        return self.auxiliary_value_head(latent).flatten()
