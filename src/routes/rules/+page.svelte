<script lang="ts">
  import { base } from '$app/paths';
  import StickyNav from '$lib/components/StickyNav.svelte';
  import CardFace from '$lib/components/CardFace.svelte';
  import ResourceIcon from '$lib/components/ResourceIcon.svelte';
  import { cards } from '$lib/game/cards';
  import type { CardOperation, Resource } from '$lib/game/presentation';

  let contentsHeight = $state(100);
  const sections = [
    { id: 'setup', label: 'Setup' }, { id: 'cards', label: 'Cards' },
    { id: 'leaders', label: 'Leaders' }, { id: 'turn', label: 'Your turn' },
    { id: 'gods', label: 'Worship' }, { id: 'winning', label: 'Scoring' },
    { id: 'reminders', label: 'Reference' }
  ].map(section => ({ ...section, href: `#${section.id}` }));
  const leaders = cards.filter(card => card.type === 'Leader');
  const card = (id: string) => cards.find(card => card.id === id)!;
  const operations: { resource: CardOperation; meaning: string }[] = [
    { resource: 'trash', meaning: 'Trash N: you may trash up to N cards from your hand. Zero is allowed; trashed cards leave your possession permanently.' },
    { resource: 'discard', meaning: 'Discard N: discard N cards from your hand. Without a number after a gain or reveal, it means put that card in your discard pile.' },
    { resource: 'topdeck', meaning: 'Topdeck: put the gained or revealed card on top of your deck. It will be the next card you draw.' },
    { resource: 'gain', meaning: 'Gain: take one card from the supply to your discard pile. The value inside the icon is its maximum cost. Topdeck overrides the destination.' }
  ];
  const resources: { resource: Resource; meaning: string }[] = [
    { resource: 'cards', meaning: 'Draw a card into your hand.' },
    { resource: 'actions', meaning: 'Add one Action to spend this turn.' },
    { resource: 'coins', meaning: 'Add one Coin to spend this turn.' },
    { resource: 'buys', meaning: 'Add one Buy to spend this turn.' },
    { resource: 'worship', meaning: 'Add one Worship to spend this turn.' }
  ];
</script>

<svelte:head>
  <title>Rules — Pantheon: Bloodlines</title>
  <meta name="description" content="Player rules for Pantheon: Bloodlines: setup, turns, Temples, Worship, Devotion, and scoring, illustrated with the game’s cards." />
</svelte:head>

<div class="rules-shell" style:--contents-height={`${contentsHeight}px`}>
  <a class="skip-link" href="#rules">Skip to rules</a>
  <header class="site-header"><a href={`${base}/`}>Pantheon: Bloodlines</a><nav aria-label="Main navigation"><a href={`${base}/gallery/`}>Card gallery</a><a href={`${base}/rules/`} aria-current="page">Rules</a></nav></header>
  <main id="rules">
    <h1>How to play</h1>
    <p class="subtitle">Pantheon: Bloodlines · 2–4 players · v0.1</p>
    <p>Build a deck from the shared supply and use it to acquire Territories. When the game ends, the player with the most victory points (VP) wins.</p>
    <StickyNav items={sections} label="On this page" bind:height={contentsHeight} />

    <section id="setup">
      <h2>1. Setup</h2>
      <ol>
        <li>Choose a first player at random and mark their place. Play clockwise. In reverse turn order, starting with the last player, each player chooses a different leader.</li>
        <li>Put the chosen leaders’ god events in the middle of the table. These events are available to everyone. Return unused leaders, their Temples, and their events to the box.</li>
        <li>Make the six basic supply piles and all twelve regular Action piles using the table below. Include Actions of every god, even if that god’s event isn’t in play.</li>
        <li>Give each player <strong>6 Obols, 3 Hamlets, and the unique Temple matching their leader’s god</strong>. Shuffle these ten cards and draw five. Starting cards are extra; don’t take them from the supply.</li>
        <li>Keep your leader face up outside your deck. Leave space for your played cards and discard pile, and a shared trash pile.</li>
      </ol>
      <table><caption>Cards in each supply pile</caption><thead><tr><th scope="col">Pile</th><th scope="col">2 players</th><th scope="col">3 players</th><th scope="col">4 players</th></tr></thead><tbody>
        <tr><th scope="row">Each Territory</th>{#each [2, 3, 4] as count}<td>{card('polis').supply[count as 2 | 3 | 4]}</td>{/each}</tr>
        <tr><th scope="row">Each regular Action</th>{#each [2, 3, 4] as count}<td>{card('oracles-acolyte').supply[count as 2 | 3 | 4]}</td>{/each}</tr>
        <tr><th scope="row">Obol / Drachma / Talent</th><td colspan="3">40 / 30 / 20 in every game</td></tr>
      </tbody></table>
      <div class="card-row">
        {#each [{ id: 'obol', caption: '6 Obols' }, { id: 'hamlet', caption: '3 Hamlets' }, { id: 'temple-of-athena', caption: '1 matching Temple (Athena shown)' }] as example}
          <figure><CardFace card={card(example.id)} /><figcaption>{example.caption}</figcaption></figure>
        {/each}
      </div>
      <p>Each Temple is an <strong>Action</strong> with its god’s affiliation, <strong>+1 Worship and +1 Action</strong>. There is one Temple per leader, with no Temple supply pile. Its printed cost is 0 for effects that compare costs; it cannot be bought or gained.</p>
    </section>

    <section id="cards">
      <h2>2. Cards and resources</h2>
      <p><strong>Actions</strong> have effects when played. <strong>Treasures</strong> provide Coins. <strong>Territories</strong> score at the end and cannot be played. <strong>Leaders</strong> and <strong>events</strong> stay outside your deck.</p>
      <p>The coin at the top of a card shows its cost. The colored labels show its god and type. An icon with “+” adds that resource or draws that many cards; other numbers are read with the instruction around them.</p>
      <dl class="resources">{#each resources as item}<div><dt><ResourceIcon resource={item.resource} value="+1" /></dt><dd>{item.meaning}</dd></div>{/each}<div><dt><ResourceIcon resource="victory" value="1" /></dt><dd>One victory point, counted at the end.</dd></div></dl>
      <dl class="resources operations">{#each operations as item}<div><dt><ResourceIcon resource={item.resource} /></dt><dd>{item.meaning}</dd></div>{/each}</dl>
      <p><strong>Cost or condition → result.</strong> Resolve the right side only if you complete the cost or meet the condition on the left. Trash is always optional: if you trash zero cards before an arrow, you do not receive its result. A leader’s arrow triggers after the matching Action has finished resolving. A semicolon separates instructions; it does not make one depend on the other.</p>
      <p>A value inside a <strong>gain icon</strong> is the cost limit: <strong>4</strong> means a card costing up to 4; <strong>+2</strong> means up to 2 more than the card just trashed; <strong>Σ</strong> means up to the combined cost of cards trashed by that effect. A coin number used as a cost limit also means “up to”. Gains go to your discard pile by default; a <strong>topdeck icon</strong> puts the gained card on top of your deck instead. A card type or name beside the gain icon, such as Action or Drachma, restricts what you may gain.</p>
      <p>Actions, Buys, Coins, and Worship last only for your current turn. They cannot be saved or given to another player.</p>
    </section>

    <section id="leaders">
      <h2>3. Leaders</h2>
      <p>Your leader is your permanent character for the game. Choose one during setup, with the last player choosing first and the first player choosing last. Every player must choose a different leader.</p>
      <p>Keep your leader face up in front of you. It never enters your deck and cannot be bought, gained, discarded, or trashed. It scores no victory points.</p>
      <figure class="leader-example"><CardFace card={card('thaleia')} /><figcaption>Thaleia is affiliated with Athena. Her ability grants an extra Action.</figcaption></figure>
      <p>Each leader has a god affiliation and a <strong>once-per-turn ability</strong>. On your turn, play the first Action matching your leader’s god, finish that card’s effect, then resolve the leader’s ability. Drawing or gaining a card does not trigger it. Your matching Temple is an Action and can trigger it.</p>
      <dl class="reference leader-abilities">{#each leaders as leader}<dt>{leader.name} · {leader.god}</dt><dd>{leader.effect}</dd>{/each}</dl>
      <p>The trigger happens even if the Action’s own effect does nothing. If Doreios triggers and you choose not to trash, that opportunity is used; you cannot save it for a later Ares Action. Every leader’s ability resets at the start of their owner’s next turn.</p>
      <p>Your leader’s god determines <strong>your starting Temple</strong> and adds that god’s event to the shared table. It does not restrict which cards you buy or play, or which available god you Worship. Everyone may use the events in play.</p>
      <p><strong>Leaders do not provide Devotion.</strong> Only matching Actions currently in your play area count toward a god’s Favored effect. Worship does not trigger a leader ability.</p>
    </section>

    <section id="turn">
      <h2>4. Your turn</h2>
      <p>Follow these steps in order. You may stop playing Actions or Treasures early, but you cannot return to an earlier phase.</p>
      <ol class="turns">
        <li><strong>Start.</strong> Set your counters to <strong>1 Action, 1 Buy, 1 Worship, and 0 Coins</strong>. Reset your leader’s once-per-turn ability.</li>
        <li><strong>Actions.</strong> Spend 1 Action to play an Action from your hand. Put it in your play area and resolve its instructions in order, then any triggered leader ability. Continue while you have Actions and want to play more.</li>
        <li><strong>Treasures.</strong> Play any number of Treasures from your hand, one at a time, adding their Coins. Playing a Treasure costs no Action.</li>
        <li><strong>Buys.</strong> Spend 1 Buy and the printed Coin cost to buy a card from a nonempty supply pile. Put it in your discard pile. Repeat if you have enough Buys and Coins. A cost-0 purchase still uses a Buy.</li>
        <li><strong>Cleanup.</strong> Discard your remaining hand and played cards, lose all unused resources, and draw five. Check the end conditions, then pass the turn.</li>
      </ol>
      <p><strong>Worship can happen between effects during your turn</strong>, including between Treasure plays or purchases. Finish a card’s effect and its leader trigger before doing so. Your last chance is before cleanup begins; cleanup is resolved as one step.</p>
      <p>Playing your Temple spends 1 Action, then gives +1 Worship and +1 Action. Starting from your normal counters, you now have 2 Worship and still have 1 Action. It also triggers your leader if it is your first matching Action this turn.</p>
    </section>

    <section id="gods">
      <h2>5. Worship and Devotion</h2>
      <p>To <strong>Worship</strong>, choose an available god event and spend <strong>1 Worship plus its Coin cost</strong>. This does not use a Buy. You may Worship any available god, regardless of your leader, as often as you can pay. You may use the same event more than once.</p>
      <p>Check your <strong>Devotion</strong> each time you Worship: count the Action cards of that god currently in your play area. Each gives 1 Devotion, including your Temple. <strong>Your leader gives no automatic Devotion.</strong> Cards in your hand, deck, discard pile, or trash don’t count.</p>
      <p>With <strong>2 or more Devotion</strong>, resolve the event’s <strong>Favored</strong> effect instead of its Standard effect. Otherwise use Standard. You don’t spend Devotion, and you need no minimum to Worship.</p>
      <div class="card-row pair"><figure><CardFace card={card('temple-of-athena')} /><figcaption>Temple of Athena in play: 1 Devotion</figcaption></figure><figure><CardFace card={card('oracles-acolyte')} /><figcaption>Oracle’s Acolyte in play: 1 Devotion</figcaption></figure></div>
      <figure class="event-example"><CardFace card={card('counsel-of-olympus')} /><figcaption>Two Athena Actions in play unlock Athena’s Favored effect.</figcaption></figure>
      <p><strong>Example.</strong> Play Temple of Athena and Oracle’s Acolyte. You have 2 Worship and 2 Devotion to Athena. After playing three Obols, spend 1 Worship and 3 Coins on Counsel of Olympus. Gain an Action costing up to 5 onto your deck. Your Buy is untouched, and you have 1 Worship left, but you would need more Coins to Worship again.</p>
      <p>Your leader still rewards the first Action of their god you play each turn, after that card resolves. Worship is not playing an Action and does not trigger that ability. Extra Buys from an event buy cards; they do not grant Worship.</p>
      <p>A card gained through Worship can be used this turn only if it reaches your hand and the appropriate phase is still open. Gaining a card onto your deck does not draw it or play it.</p>
    </section>

    <section id="winning">
      <h2>6. End of the game and scoring</h2>
      <p>After cleanup, the game ends if the <strong>Acropolis supply pile is empty</strong> or <strong>any three supply piles are empty</strong>. Finish the whole turn; there is no final round. Temples, leaders, events, and the trash are not supply piles.</p>
      <div class="card-row">{#each ['hamlet', 'polis', 'acropolis'] as id}<figure><CardFace card={card(id)} /><figcaption>{card(id).name}: {card(id).vp} VP each</figcaption></figure>{/each}</div>
      <p>Count all Territories you own, wherever they are: hand, deck, discard pile, or play area. Starting Hamlets count. Trashed cards and all other card types score nothing.</p>
      <p><strong>Most VP wins.</strong> Ties go to the tied player who took fewer turns. If they took the same number, they share victory.</p>
    </section>

    <section id="reminders">
      <h2>7. Rules reference</h2>
      <dl class="reference">
        <dt>Drawing and shuffling</dt><dd>When you must draw or reveal and your deck is empty, shuffle your discard pile into a new deck. Never include cards in hand or in play. If both piles are empty, stop drawing and finish the remaining instructions.</dd>
        <dt>Gaining cards</dt><dd>A gain is free unless it comes from a purchase. Take an eligible card from a nonempty supply pile to your discard pile unless told otherwise. “Onto your deck” means on top. A cost limit includes cheaper cards, including cost 0. If no eligible card remains, skip the gain and continue.</dd>
        <dt>Discarding and trashing</dt><dd>Discarded cards can return when you shuffle. Trashed cards leave your possession permanently and score nothing. Trashing never refills a supply pile. Your Temple can be discarded or trashed like any other Action.</dd>
        <dt>Following instructions</dt><dd>Resolve in order and do as much as possible. “May” and “up to” are optional. “If you do” requires the preceding action to happen. “From your hand” cannot target cards already in play.</dd>
        <dt>Information</dt><dd>Hands and deck order are private. Supply quantities, leaders, events, played cards, discards, and trash are public. Reveal cards you gain or trash.</dd>
      </dl>
      <p>See the <a href={`${base}/gallery/`}>card gallery</a> for all card effects and the four leaders’ abilities.</p>
    </section>
  </main>
</div>

<style>
  .rules-shell { max-width: 1020px; margin: auto; padding: 0 clamp(20px, 5vw, 64px) 64px; }
  .skip-link { position: absolute; top: -80px; padding: 12px; background: #151b1b; z-index: 10; } .skip-link:focus { top: 12px; }
  .site-header { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 28px 0; border-bottom: 1px solid #a88b5155; }
  .site-header > a { font: 700 25px 'Cormorant Garamond', serif; color: #e6ce9b; text-decoration: none; }
  nav { display: flex; flex-wrap: wrap; gap: 12px 24px; font-size: 15px; } nav a { text-underline-offset: 5px; } nav a[aria-current] { color: #e6ce9b; }
  main { padding-top: 36px; font-size: 17px; line-height: 1.65; color: #e0e0d7; }
  h1, h2 { font-family: 'Cormorant Garamond', serif; color: #f0e3c8; line-height: 1.15; } h1 { margin: 0; font-size: 46px; } h2 { font-size: 32px; margin: 0 0 20px; }
  .subtitle { margin: 8px 0 24px; color: #bfc5b7; font-size: 15px; } p { margin: 0 0 18px; } strong { color: #f7eddb; }
  section { margin-top: 40px; scroll-margin-top: calc(var(--contents-height) + 20px); }
  ol { padding-left: 24px; margin: 0 0 24px; } li { padding-left: 6px; margin-bottom: 12px; } li::marker { color: #dec28a; } .turns li { margin-bottom: 18px; }
  table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 15px; line-height: 1.4; } caption { text-align: left; font-weight: 700; margin-bottom: 12px; } th, td { padding: 12px 8px; border-bottom: 1px solid #a88b5144; text-align: center; } th:first-child { text-align: left; } tbody th { font-weight: 400; }
  .card-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 24px; margin: 28px 0; } figure { margin: 0; } .card-row figure { width: min(100%, 244px); min-width: 0; } figcaption { font-size: 14px; line-height: 1.45; text-align: center; color: #cdd1c4; margin-top: 10px; }
  .leader-example { width: min(100%, 640px); margin: 28px auto; }
  .event-example { width: min(100%, 560px); margin: 28px auto; }
  .resources { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 28px; margin: 24px 0; } .resources > div { display: flex; align-items: center; gap: 16px; --icon-size: 32px; } dt { font-weight: 700; color: #e6ce9b; } dd { margin: 0; } .resources dd { font-size: 15px; }
  .reference dt { margin-top: 18px; } .reference dd { margin: 4px 0 18px; }
  @media (max-width: 600px) { .site-header { align-items: start; } .site-header nav { flex-direction: column; gap: 8px; white-space: nowrap; } .site-header > a { max-width: 160px; } .resources { grid-template-columns: 1fr; } th, td { padding: 10px 4px; font-size: 13px; } main { font-size: 16px; } h1 { font-size: 40px; } h2 { font-size: 29px; } .card-row { gap: 24px; } }
  @media print { .rules-shell { max-width: none; padding: 0; } .site-header, .skip-link { display: none; } main { font-size: 11pt; color: #222; } h1, h2, strong, dt { color: #222; } section { break-inside: auto; } figure { break-inside: avoid; } .card-row figure { width: 48mm; } .event-example { width: 90mm; } .leader-example { width: 110mm; } }
</style>
