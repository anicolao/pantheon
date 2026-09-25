<script lang="ts">
  import { base } from '$app/paths';
  import { godSymbols, type CardDefinition } from '$lib/game/types';

  let { card }: { card: CardDefinition } = $props();
</script>

<article class="card" data-card-id={card.id} data-god={card.god} data-type={card.type} aria-label={`${card.name}, ${card.god} ${card.type}`}>
  <header class="card-title" data-fit>
    <h3>{card.name}</h3>
    {#if card.cost !== null}
      <span class="cost" aria-label={`${card.cost} Coins${card.type === 'Event' ? ' and 1 Buy to invoke' : ' to buy'}`}>{card.cost}<small>COIN{card.cost === 1 ? '' : 'S'}</small></span>
    {:else}
      <span class="bloodline-mark" aria-label="Unique leader">♜</span>
    {/if}
  </header>
  <div class="art-window">
    <img src={`${base}/assets/cards/${card.art}.webp`} alt={card.artDescription} width="960" height="640" draggable="false" />
  </div>
  <div class="affiliation"><span><b aria-hidden="true">{godSymbols[card.god]}</b> {card.god}</span><span>{card.type}</span></div>
  <div class="rules" class:simple={card.type === 'Treasure' || card.type === 'Territory'} data-fit>
    {#if card.type === 'Event'}
      <div><h4>Standard</h4><p>{card.effect}</p></div>
      <div class="favored"><h4>Favored · 2+ Devotion</h4><p>{card.favored}</p></div>
    {:else if card.type === 'Leader'}
      <div><h4>Bloodline ability · once per turn</h4><p>{card.effect}</p></div>
      <p class="leader-devotion">+1 Devotion when invoking {card.god}.</p>
    {:else if card.type === 'Territory'}
      <p class="value">{card.vp}<span>victory point{card.vp === 1 ? '' : 's'}</span></p>
      <p class="reminder">Scores at the end of the game.</p>
    {:else if card.type === 'Treasure'}
      <p class="treasure-value">{card.effect}</p>
      <p class="reminder">Play during your Treasure phase.</p>
    {:else}
      <p>{card.effect}</p>
    {/if}
  </div>
  <footer><span>Pantheon: Bloodlines</span><span>{card.type === 'Event' ? '1 BUY · ONCE / TURN' : card.type === 'Leader' ? 'UNIQUE · v0.1' : 'v0.1'}</span></footer>
</article>

<style>
  .card { --god: #7d5833; --tint: #e9dcc3; container-type: inline-size; aspect-ratio: 5 / 7; width: 100%; display: grid; grid-template-rows: 12% 34% 7% 41% 6%; border: 5px solid #b59962; border-radius: 10px; background: #ece3cd; color: #28271f; box-shadow: 0 10px 24px #0006, inset 0 0 0 1px #413928; text-align: left; overflow: hidden; }
  [data-god='Athena'] { --god: #414967; --tint: #e0e1e9; }
  [data-god='Poseidon'] { --god: #235658; --tint: #d4e2dd; }
  [data-god='Demeter'] { --god: #4a592f; --tint: #e1e5cf; }
  [data-god='Ares'] { --god: #773b31; --tint: #eddcd4; }
  .card-title { display: flex; align-items: center; gap: 3cqi; padding: 1cqi 4cqi; background: linear-gradient(110deg, #f0e6cc, #d7c5a2); min-height: 0; }
  h3 { flex: 1; margin: 0; font: 700 6.15cqi/0.98 'Cormorant Garamond', serif; text-wrap: balance; }
  .cost { display: grid; flex: 0 0 11cqi; width: 11cqi; height: 11cqi; align-content: center; justify-items: center; border: 1px solid #96743e; border-radius: 50%; background: #d6b678; color: #32291a; font: 700 6cqi/0.9 'Cormorant Garamond', serif; box-shadow: inset 0 0 0 2px #f2dda666; }
  .cost small { margin-top: 0.5cqi; font: 700 1.8cqi/1 'Atkinson Hyperlegible', sans-serif; letter-spacing: 0.05em; }
  .bloodline-mark { font-size: 9cqi; color: var(--god); }
  .art-window { overflow: hidden; border-block: 1px solid #85714d; }
  img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: center 15%; }
  .affiliation { display: flex; align-items: center; justify-content: space-between; padding: 0 4cqi; background: var(--god); color: #fff5e2; font-size: 3.1cqi; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
  .affiliation b { display: inline-block; min-width: 4cqi; font-size: 4.2cqi; line-height: 1; vertical-align: middle; }
  .rules { display: flex; flex-direction: column; justify-content: center; gap: 3cqi; min-height: 0; padding: 4cqi 5cqi; background: radial-gradient(ellipse at top, #fff9eb99, transparent), linear-gradient(140deg, #f0e7d2, var(--tint)); font-size: 4.25cqi; line-height: 1.25; }
  p { margin: 0; }
  h4 { margin: 0 0 1cqi; font: 700 2.7cqi/1.2 'Atkinson Hyperlegible', sans-serif; color: var(--god); letter-spacing: 0.07em; text-transform: uppercase; }
  [data-type='Event'] .rules { font-size: 4cqi; gap: 2cqi; padding-block: 3cqi; }
  .favored { border-top: 1px solid #9a8a6c88; padding-top: 2cqi; }
  .leader-devotion { padding-top: 3cqi; border-top: 1px solid #9a8a6c88; font-size: 3.6cqi; color: var(--god); }
  .simple { align-items: center; text-align: center; }
  .value { font: 600 21cqi/0.85 'Cormorant Garamond', serif; color: var(--god); }
  .value span { display: block; margin-top: 2cqi; font: 700 3.3cqi/1.2 'Atkinson Hyperlegible', sans-serif; text-transform: uppercase; letter-spacing: 0.1em; }
  .treasure-value { font: 700 10cqi/1 'Cormorant Garamond', serif; }
  .reminder { font-size: 3.35cqi; color: #65573e; }
  footer { display: flex; align-items: center; justify-content: space-between; padding: 0 4cqi; color: #66593f; font-size: 2.1cqi; letter-spacing: 0.04em; text-transform: uppercase; border-top: 1px solid #b9a883; background: #ddd0b4; }
  @media print { .card { box-shadow: none; border-width: 1mm; print-color-adjust: exact; } }
</style>
