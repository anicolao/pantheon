<script lang="ts">
  import { motionDuration, MOTION_EASING } from './motion';
  import { tablePurchases } from './table-purchases';
  import { latestMoveIndex } from '$lib/game/public-table';
  import DialogFrame from "$lib/components/DialogFrame.svelte";
  import { onMount, tick, untrack } from 'svelte';
  import type { CardInstance, SetupState } from '$lib/game/setup';
  import { definition } from '$lib/game/actions';
  import { publicPile, publicDeckCount, type PublicStep } from '$lib/game/public-table';
  import CardFace from '../CardFace.svelte';
  import CardBack from '../CardBack.svelte';
  import ResourceIcon from '../ResourceIcon.svelte';
  import Portrait from './Portrait.svelte';

  type Tab = 'chronicle' | 'play' | 'discard' | 'trash';
  function shownPile(state:SetupState,uid:string,kind:'play'|'discard'|'trash'){
    const pile=publicPile(state,uid,kind),purchases=tablePurchases(state,uid);
    if(kind==='play')return [...pile,...purchases];
    if(kind==='discard')return pile.filter(card=>!purchases.some(purchase=>purchase.id===card.id));
    return pile;
  }
  let { game, uid, initialTab = 'chronicle', owner = uid, close }: {
    game: SetupState; uid: string; initialTab?: Tab; owner?: string; close: () => void;
  } = $props();
  let tab = $state<Tab>(untrack(() => initialTab));
  let player = $state(untrack(() => owner));
  let history = $state(untrack(() => [...game.activity]));
  let entries = $state(untrack(() => [...game.publicActivity]));
  let through = $state(untrack(() => game.activity.length));
  let movePage = $state(untrack(() => latestMoveIndex(game)));
  let pile = $state<CardInstance[]>(untrack(() => initialTab === 'chronicle' ? [] : shownPile(game, owner, initialTab)));
  let pilePage = $state(0), stepPage = $state(0);
  let inspected = $state<{card: CardInstance; source: string} | null>(null);
  let dialog: HTMLDialogElement;
  let returnKey = '';
  const name = (id: string) => game.players.find(p => p.uid === id)!.name;
  const item = $derived(history[movePage]);
  const entry = $derived(entries.find(entry => entry.sequence === item?.sequence));
  const unseen = $derived(game.activity.length - through);
  const livePile = $derived(tab === 'chronicle' ? [] : shownPile(game, player, tab));
  const changed = $derived(tab !== 'chronicle' && (livePile.length !== pile.length || livePile.some((card, i) => card.id !== pile[i]?.id)));
  const title = $derived(tab === 'chronicle' ? 'Chronicle' : tab === 'trash' ? 'Shared trash' : `${player === uid ? 'Your' : `${name(player)}’s`} ${tab === 'play' ? 'play area' : 'discard'}`);
  const verbs = { play: 'Played', draw: 'Drew', shuffle: 'Shuffled', trash: 'Trashed', discard: 'Discarded', gain: 'Gained', reveal: 'Revealed', topdeck: 'Topdecked', leader: 'Bloodline blessing', worship: 'Worshipped', cleanup: 'Cleanup' };
  const zones = { hand: 'Hand', deck: 'Deck', play: 'In play', discard: 'Discard', supply: 'Supply', trash: 'Shared trash', reveal: 'Revealed', altar: 'Altar', leader: 'Leader' };
  const commandNames: Record<string, string> = { 'action/played': 'played an Action', 'treasure/played': 'played a Treasure', 'treasures/played': 'played Treasures', 'choice/resolved': 'chose cards', 'card/bought': 'bought a card', 'god/worshipped': 'worshipped', 'phase/advanced': 'entered Treasures', 'turn/ended': 'ended the turn' };
  const resources = ['actions', 'coins', 'buys', 'worship'] as const;
  onMount(() => {
    dialog.showModal();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches)
      dialog.animate([{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],{duration:motionDuration(160),easing:MOTION_EASING});
  });
  function switchTab(next: Tab) { tab = next; inspected = null; pilePage = 0; if (next !== 'chronicle') pile = shownPile(game, player, next); }
  function changeOwner() { if (tab !== 'chronicle') { pile = shownPile(game, player, tab); pilePage = 0; } }
  function refresh() {
    history = [...game.activity]; entries = [...game.publicActivity]; through = game.activity.length;
    movePage = latestMoveIndex(game); stepPage = 0;
    if (tab !== 'chronicle') { pile = shownPile(game, player, tab); pilePage = Math.min(pilePage, Math.max(0, Math.ceil(pile.length / 3) - 1)); }
  }
  function moveTo(index: number) { movePage = index; stepPage = 0; }
  async function inspect(card: CardInstance, source: string) { returnKey = (document.activeElement as HTMLElement | null)?.dataset.inspectionKey ?? ''; inspected = { card, source }; await tick(); dialog.querySelector<HTMLButtonElement>('.return')?.focus(); }
  async function returnToTray() { inspected = null; await tick(); [...dialog.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.dataset.inspectionKey===returnKey)?.focus(); }
  function stepCard(step: PublicStep): CardInstance | undefined {
    return step.card ?? (step.kind === 'leader' || step.kind === 'worship' ? { id: '', cardId: step.from.cardId!, copy: 1 } : undefined);
  }
</script>

<dialog bind:this={dialog} class="public-table framed-dialog" aria-label={inspected ? definition(inspected.card.cardId).name : title} data-e2e-layout oncancel={event => { event.preventDefault(); if (inspected) void returnToTray(); else close(); }}>
  <DialogFrame />
  <button class="close" aria-label="Close" onclick={close}>×</button>
  {#if inspected}
    <h2>{definition(inspected.card.cardId).name}</h2>
    <div class="inspected" class:landscape={['Leader','Event'].includes(definition(inspected.card.cardId).type)}><CardFace card={definition(inspected.card.cardId)} players={game.playerCount} copy={inspected.card.copy}/></div>
    <button class="return" onclick={returnToTray}>Return to {inspected.source}</button>
  {:else}
    <h2>{title}</h2>
    <nav class="tabs" aria-label="Public table"><button aria-pressed={tab==='chronicle'} onclick={()=>switchTab('chronicle')}>Chronicle</button><button aria-pressed={tab==='play'} onclick={()=>switchTab('play')}>In play</button><button aria-pressed={tab==='discard'} onclick={()=>switchTab('discard')}>Discard</button><button aria-pressed={tab==='trash'} onclick={()=>switchTab('trash')}>Trash</button></nav>
    <div class="updates" class:has-updates={unseen || changed} aria-live="polite">{#if unseen || changed}<button class="new-moves" onclick={refresh}>{unseen ? `New moves · ${unseen}` : 'Pile changed'} · Refresh</button>{:else}<span>{tab==='chronicle'?'The story of this table':'Public cards · Read only'}</span>{/if}</div>
    {#if tab === 'chronicle'}
      <section class="chronicle" aria-label="Recorded move">
        {#if entry}
          <div class="actor"><div class="portrait"><Portrait leader={game.leaders[entry.actor.uid]} name={entry.actor.name}/></div><p>{entry.actor.name} {commandNames[entry.command]}.</p></div>
          <div class="moves">
            {#each entry.steps.slice(stepPage*3,stepPage*3+3) as step (step.id)}
              {@const card = stepCard(step)}
              <article class="move" data-movement={step.kind}>
                <h3>{verbs[step.kind]}{step.backs ? ` · ${step.count}` : ''}</h3>
                <div class="face-slot">{#if card}<button data-inspection-key={step.id} class="miniature" class:landscape={['Leader','Event'].includes(definition(card.cardId).type)} aria-label={`Inspect ${definition(card.cardId).name}, copy ${card.copy}`} onclick={()=>inspect(card,'Chronicle')}><CardFace card={definition(card.cardId)} players={game.playerCount} copy={card.copy}/></button>{:else}<div class="miniature back"><CardBack format="deck"/></div>{/if}</div>
                <p class="path">{zones[step.from.zone]} → {zones[step.to.zone]}</p>{#if !card || step.effect !== definition(card.cardId).name || step.devotion !== undefined}<p class="effect">{step.effect}{step.devotion !== undefined ? ` · Devotion ${step.devotion}` : ''}</p>{/if}
              </article>
            {/each}
            {#if !entry.steps.length}<p class="quiet">The turn continues.</p>{/if}
          </div>
          <nav class="step-pages" class:single-page={entry.steps.length<=3} aria-label="Move details"><button aria-label="Previous effects" disabled={stepPage===0} onclick={()=>stepPage--}>‹</button><span>{entry.steps.length ? `${stepPage*3+1}–${Math.min(entry.steps.length,stepPage*3+3)} of ${entry.steps.length} effects` : 'No cards moved'}</span><button aria-label="Next effects" disabled={(stepPage+1)*3>=entry.steps.length} onclick={()=>stepPage++}>›</button></nav>
          <div class="result"><span>{entry.change ? 'Change' : 'Turn complete'}</span>{#if entry.change}{#each resources as key}{#if entry.change[key]}<ResourceIcon resource={key} value={`${entry.change[key]>0?'+':''}${entry.change[key]}`}/>{/if}{/each}{/if}</div>
          <div class="totals"><span>{name(entry.resources.uid)}’s resources</span>{#each resources as key}<ResourceIcon resource={key} value={entry.resources.values[key]}/>{/each}</div>
        {:else}<p class="opening">{item?.message ?? 'No moves yet.'}</p>{/if}
      </section>
      <nav class="pages" aria-label="Chronicle pages"><button aria-label="First moves" disabled={movePage===0} onclick={()=>moveTo(0)}>First</button><button aria-label="Earlier moves" disabled={movePage===0} onclick={()=>moveTo(movePage-1)}>‹</button><span>{movePage+1} / {history.length}</span><button aria-label="Later moves" disabled={movePage+1>=history.length} onclick={()=>moveTo(movePage+1)}>›</button><button aria-label="Latest moves" disabled={movePage+1>=history.length} onclick={()=>moveTo(history.length-1)}>Latest</button></nav>
    {:else}
      <div class="owner"><label>Player <select aria-label="Player" bind:value={player} onchange={changeOwner}>{#each game.players as person}<option value={person.uid}>{person.name}</option>{/each}</select></label><span class="deck-count">Deck · {publicDeckCount(game,player)} cards</span></div>
      <section class="pile" aria-label={title}>{#each pile.slice(pilePage*3,pilePage*3+3) as card (card.id)}<button data-inspection-key={card.id} aria-label={`Inspect ${definition(card.cardId).name}, copy ${card.copy}`} onclick={()=>inspect(card,'pile')}><CardFace card={definition(card.cardId)} players={game.playerCount} copy={card.copy}/></button>{:else}<p>No cards here.</p>{/each}</section>
      <p class="pile-count">{pile.length} cards{changed ? ' · Showing the cards you opened' : ''}</p>
      <nav class="pages" aria-label="Pile pages"><button disabled={pilePage===0} onclick={()=>pilePage--}>Previous</button><span>{pilePage+1} / {Math.max(1,Math.ceil(pile.length/3))}</span><button disabled={(pilePage+1)*3>=pile.length} onclick={()=>pilePage++}>Next</button></nav>
    {/if}
  {/if}
</dialog>

<style>
  .public-table{width:min(1120px,96vw);height:min(860px,94svh);max-height:94svh;box-sizing:border-box;border:0;padding:120px 65px 95px;color:#f5dfac;text-align:center;overflow:hidden;box-shadow:0 18px 60px #0009;font-size:18px;}
  .public-table[open]{display:flex;flex-direction:column;}.public-table::backdrop{background:#02081188;}h2{font:600 34px/1.1 'Cormorant Garamond',serif;margin:0 45px 14px;}button,select{min-height:44px;border:1px solid #ab8948;border-radius:7px;background:#0a1c28;color:#f6dfac;font:inherit;padding:6px 14px;}button{cursor:pointer;}button:disabled{opacity:.4;cursor:default;}button:focus-visible,select:focus-visible{outline:3px solid #fce7a4;outline-offset:2px;}.close{position:absolute;right:9%;top:120px;width:44px;padding:0;font-size:30px;border-radius:50%;}.tabs{flex-shrink:0;display:flex;justify-content:center;gap:5px;}.tabs button{flex:1;max-width:200px;}.tabs [aria-pressed=true]{background:#14535b;box-shadow:inset 0 0 9px #e5bc693b;}.updates{height:52px;flex-shrink:0;display:grid;place-items:center;font-size:15px;}.new-moves{background:#684719;}.chronicle{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;}.actor{flex-shrink:0;display:flex;align-items:center;justify-content:center;gap:18px;min-height:65px;}.portrait{width:70px;flex-shrink:0;}.actor p{font:600 26px/1.1 'Cormorant Garamond',serif;}.moves{display:flex;align-items:center;justify-content:center;gap:24px;flex:1;min-height:0;}.move{width:28%;max-width:230px;min-width:0;}h3{font:600 22px/1.1 'Cormorant Garamond',serif;margin:4px 0 8px;}.miniature{display:block;width:min(100%,17svh);margin:auto;padding:0;border:0;background:none;}.miniature.landscape{width:100%;}.path{font-size:17px;margin:8px 0 4px;}.effect{font-size:13px;margin:0;color:#ddc7a0;}.step-pages,.pages{display:flex;gap:10px;align-items:center;justify-content:center;margin:10px 0 0;}.step-pages{font-size:14px;}.step-pages button{width:44px;padding:0;}.pages span{min-width:65px;font-size:16px;}.result,.totals{display:flex;align-items:center;justify-content:center;gap:18px;min-height:40px;--icon-size:25px;}.result{margin-top:6px;}.totals{font-size:15px;}.owner{display:flex;align-items:center;justify-content:center;gap:30px;}.owner label{display:flex;align-items:center;gap:10px;}.pile{display:flex;justify-content:center;align-items:center;gap:25px;flex:1;min-height:100px;}.pile button{padding:0;border:0;background:none;width:28%;max-width:26svh;}.pile-count{margin:6px 0;font-size:16px;}.inspected{width:min(350px,44svh);margin:24px auto;}.inspected.landscape{width:min(720px,70vw);}.return{display:block;margin:auto;}.opening,.quiet{font:500 28px/1.4 'Cormorant Garamond',serif;}
  @media(min-width:2400px){.public-table{width:2100px;height:1700px;padding:250px 130px 190px;font-size:34px;}h2{font-size:64px;margin-bottom:30px;}.close{top:250px;width:80px;height:80px;font-size:54px;}.tabs button{max-width:400px;min-height:80px;}.updates{height:100px;font-size:30px;}.portrait{width:145px;}.actor p{font-size:48px;}h3{font-size:42px;}.move{max-width:440px;}.path{font-size:30px;}.effect{font-size:26px;}.step-pages,.pages,.pages span{font-size:30px;gap:22px;}.step-pages button,.pages button{min-width:80px;min-height:80px;}.result,.totals{min-height:80px;--icon-size:48px;gap:32px;font-size:30px;}.pile{gap:60px;}.pile-count{font-size:30px;}.owner select{min-height:80px;}.inspected{width:min(720px,44svh);}.inspected.landscape{width:1400px;}.return{min-height:80px;}.opening{font-size:52px;}}
  @media(max-aspect-ratio:3/4){.public-table{--tray-width:98vw;width:var(--tray-width);height:94svh;padding:55px 22px 35px;font-size:14px;background:none;box-shadow:none;isolation:isolate;}
    h2{font-size:26px;margin:0 36px 14px;}.close{top:42px;right:5%;}.tabs{gap:3px;}.tabs button{padding:5px 4px;}.updates{height:44px;font-size:12px;}.actor{gap:8px;min-height:52px;}.actor p{font-size:22px;margin:8px 0;}.portrait{width:50px;}.moves{gap:8px;}.move{width:31%;}.miniature{width:min(100%,10.5svh);}h3{font-size:17px;min-height:36px;}.path{font-size:12px;min-height:32px;}.effect{font-size:11px;}.result,.totals{gap:10px;--icon-size:21px;min-height:34px;}.result{font-size:13px;}.totals{flex-wrap:wrap;font-size:12px;gap:8px;}.totals span{width:100%;}.step-pages{font-size:12px;gap:8px;margin-top:8px;}.pages{gap:4px;margin-top:8px;}.pages button{padding:6px 8px;min-width:44px;}.pages span{font-size:13px;min-width:60px;}.owner{flex-direction:column;gap:8px;}.owner select{max-width:190px;}.pile{gap:8px;}.pile button{width:31%;}.pile-count{font-size:13px;}.inspected{width:min(64vw,44svh);margin:24px auto;}.inspected.landscape{width:100%;}.opening{font-size:25px;}}

  .move{height:100%;display:flex;flex-direction:column;}.move h3,.path,.effect{flex-shrink:0;}.move h3{min-height:44px;}.face-slot{flex:1;min-height:0;container-type:size;display:flex;align-items:center;justify-content:center;}.face-slot .miniature{width:min(100%,calc(100cqh * .714));}.face-slot .miniature.landscape{width:min(100%,calc(100cqh * 1.4));}.actor p{margin:8px 0;}.moves{padding:8px 0;}.step-pages,.pages,.result,.totals{flex-shrink:0;}
  @media(max-aspect-ratio:3/4){.move{justify-content:center;}.move h3{min-height:36px;}.moves{padding:6px 0;}.face-slot{flex:0 1 22svh;max-height:180px;}}
  @media(min-width:2400px){.move h3{min-height:84px;}}
  @media(max-aspect-ratio:3/4) and (max-height:720px){
    .public-table{padding-top:50px;padding-bottom:28px;}
    h2{font-size:24px;margin-bottom:8px;}.close{top:36px;}
    .updates:not(.has-updates){display:none;}.actor{min-height:44px;}.portrait{width:44px;}.actor p{font-size:18px;margin:6px 0;}
    .moves{padding:4px 0;}.move h3{font-size:15px;margin-bottom:4px;}.path{margin-top:4px;}.step-pages,.pages{margin-top:4px;}
    .inspected{margin:16px auto;}
    .result,.totals{min-height:28px;--icon-size:18px;gap:6px;}.totals{flex-wrap:nowrap;font-size:11px;}.totals span{width:auto;}
    .move h3{min-height:30px;}.path{min-height:24px;}.step-pages.single-page{height:20px;}.step-pages.single-page button{display:none;}

  }
</style>
