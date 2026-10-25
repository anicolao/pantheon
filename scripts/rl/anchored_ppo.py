"""MaskablePPO with an explicit KL(current || frozen imitation) penalty.

The PPO update follows sb3-contrib 2.9.0's MaskablePPO.train, with a fixed
reference policy penalty added to the objective. No strategic actions are masked.
"""
import copy
import numpy as np
import torch
from sb3_contrib import MaskablePPO

class AnchoredPPO(MaskablePPO):
    reference=None
    anchor_coefficient=1.0

    def freeze_reference(self):
        self.reference=copy.deepcopy(self.policy)
        self.reference.set_training_mode(False)
        for parameter in self.reference.parameters():parameter.requires_grad_(False)

    def _excluded_save_params(self):
        return super()._excluded_save_params()+["reference"]

    def anchor_kl(self,observations,masks):
        if self.reference is None:raise RuntimeError("Freeze an imitation reference before RL")
        current=self.policy.get_distribution(observations,action_masks=masks).distribution
        with torch.no_grad():ref=self.reference.get_distribution(observations,action_masks=masks).distribution
        # Illegal actions have zero mass in both distributions. Clamping only
        # protects logs from underflow; it does not permit illegal actions.
        return (current.probs*(current.probs.clamp_min(1e-8).log()-ref.probs.clamp_min(1e-8).log())).sum(-1).mean()

    def train(self):
        if self.clip_range_vf is not None:raise ValueError("This pilot uses unclipped value loss")
        self.policy.set_training_mode(True)
        self._update_learning_rate(self.policy.optimizer)
        clip=self.clip_range(self._current_progress_remaining)
        losses=[];kls=[];continue_training=True
        for _ in range(self.n_epochs):
            for batch in self.rollout_buffer.get(self.batch_size):
                actions=batch.actions.long().flatten()
                values,log_prob,entropy=self.policy.evaluate_actions(batch.observations,actions,action_masks=batch.action_masks)
                advantages=batch.advantages
                if self.normalize_advantage:advantages=(advantages-advantages.mean())/(advantages.std()+1e-8)
                ratio=torch.exp(log_prob-batch.old_log_prob)
                policy_loss=-torch.min(advantages*ratio,advantages*torch.clamp(ratio,1-clip,1+clip)).mean()
                value_loss=torch.nn.functional.mse_loss(values.flatten(),batch.returns)
                entropy_loss=-entropy.mean()
                anchor=self.anchor_kl(batch.observations,batch.action_masks)
                loss=policy_loss+self.vf_coef*value_loss+self.ent_coef*entropy_loss+self.anchor_coefficient*anchor
                with torch.no_grad():
                    log_ratio=log_prob-batch.old_log_prob
                    kl=((torch.exp(log_ratio)-1)-log_ratio).mean().item()
                if self.target_kl is not None and kl>1.5*self.target_kl:
                    continue_training=False;break
                if not torch.isfinite(loss):raise FloatingPointError("Non-finite anchored PPO loss")
                self.policy.optimizer.zero_grad();loss.backward()
                torch.nn.utils.clip_grad_norm_(self.policy.parameters(),self.max_grad_norm)
                self.policy.optimizer.step()
                losses.append(loss.item());kls.append(anchor.item())
            self._n_updates+=1
            if not continue_training:break
        self.logger.record("train/loss",np.mean(losses) if losses else 0.)
        self.logger.record("train/reference_kl",np.mean(kls) if kls else 0.)
        self.logger.record("train/n_updates",self._n_updates,exclude="tensorboard")
