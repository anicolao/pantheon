<script lang="ts">
  import { tick, onDestroy } from 'svelte';
  import { base } from '$app/paths';
  import { definition, eligibleGains, type ActionCommand, type Choice } from '$lib/game/actions';
  import type { SetupState } from '$lib/game/setup';
  import CardFace from '../CardFace.svelte';
  import ResourceIcon from '../ResourceIcon.svelte';
  import GameButton from '../GameButton.svelte';
  let { game, uid, choice, ready, error, command, status, retry }: { game: SetupState; uid: string; choice: Choice; ready: boolean; error: string; command: (command: ActionCommand) => Promise<void>; status: string; retry: () => void } = $props();
  let dialog = $state<HTMLDialogElement>(), detail = $state<HTMLDialogElement>();
  let selected = $state<string[]>([]), page = $state(0), inspected = $state<{ cardId: string; copy: number }>();
  const choiceId = $derived(choice.id);
  const options = $derived(choice.kind === 'gain' ? eligibleGains(game, choice.limit!).map(card => ({ id: card.id, cardId: card.id, copy: card.supply[game.playerCount] - game.supply[card.id] + 1 })) : game.decks[uid].hand);
  const pages = $derived(Math.max(1, Math.ceil(options.length / 3)));
  const source = $derived(definition(choice.source));
  const sourceCopy = $derived(game.decks[uid].play.findLast(card => card.cardId === choice.source)?.copy ?? 1);
  const instruction = $derived(choice.kind === 'gain' ? `Gain a card costing up to ${choice.limit}` : choice.kind === 'discard' ? `Discard ${choice.min} card${choice.min === 1 ? '' : 's'}` : `Choose up to ${choice.max} to trash`);
  const selectedName = $derived(options.find(card => card.id === selected[0]));
  const confirm = $derived(choice.kind === 'gain' ? `Gain ${selectedName ? definition(selectedName.cardId).name : 'a card'}` : `${choice.kind === 'trash' ? 'Trash' : 'Discard'} ${selected.length}`);
  $effect(() => { choiceId; selected = []; page = 0; });
  $effect(() => { if (dialog && !dialog.open) { dialog.showModal(); dialog.focus(); } });
  onDestroy(() => { queueMicrotask(() => { if (!document.querySelector('dialog[open]')) document.querySelector<HTMLButtonElement>('[data-testid="hand-card"],.supply-control button')?.focus(); }); });
  function toggle(id: string) { selected = selected.includes(id) ? selected.filter(value => value !== id) : choice.max === 1 ? [id] : selected.length < choice.max ? [...selected, id] : selected; }
  async function inspect(cardId: string, copy = 1) { inspected = { cardId, copy }; await tick(); detail!.showModal(); }
  function submit(targets = selected) { if (ready) void command({ type: 'choice/resolved', choiceId: choice.id, targets }); }
</script>

<dialog class="choice-scene" bind:this={dialog} aria-labelledby="choice-title" tabindex="-1" oncancel={event => event.preventDefault()}>
  <picture class="environment" aria-hidden="true"><source media="(max-aspect-ratio:3/4)" srcset={`${base}/assets/ui/table-mobile.webp`} /><img src={`${base}/assets/ui/table-desktop.webp`} alt="" /></picture>
  <div class="scene-content" data-e2e-layout={inspected ? undefined : true}>
    <button class="source" class:landscape={source.type === 'Leader'} aria-label={`Inspect source: ${source.name}`} onclick={() => inspect(source.id, sourceCopy)}><CardFace card={source} copy={sourceCopy} players={game.playerCount} /></button>
    <div class="heading"><h1 id="choice-title">{source.name.split(',')[0]}</h1><p>{instruction}</p></div>
    <div class="operation" class:burning={choice.kind === 'trash'}><ResourceIcon resource={choice.kind} value={choice.kind === 'gain' ? choice.limit : choice.max} /></div>
    <div class="options" class:trash={choice.kind === 'trash'}>
      {#each options.slice(page * 3, page * 3 + 3) as card}
        <div class="option">
          <button class="card-choice" aria-label={`Select ${definition(card.cardId).name}, copy ${card.copy}`} aria-pressed={selected.includes(card.id)} disabled={!ready || (choice.max > 1 && selected.length === choice.max && !selected.includes(card.id))} onclick={() => toggle(card.id)}><CardFace card={definition(card.cardId)} players={game.playerCount} copy={card.copy} />{#if selected.includes(card.id)}<span class="check" aria-hidden="true">✓</span>{/if}</button>
          <button class="inspect" aria-label={`Inspect ${definition(card.cardId).name}, copy ${card.copy}`} onclick={() => inspect(card.cardId, card.copy)}>Inspect</button>
        </div>
      {/each}
    </div>
    <nav class="pages" aria-label="Choice pages"><button aria-label="Previous choices" disabled={page === 0} onclick={() => page--}>‹</button><span>{selected.length} selected · {page + 1} / {pages}</span><button aria-label="Next choices" disabled={page + 1 === pages} onclick={() => page++}>›</button></nav>
    <div class="confirmation"><GameButton primary onclick={() => submit()} disabled={!ready || selected.length < Math.max(1, choice.min)}>{confirm}</GameButton>{#if choice.min === 0}<GameButton onclick={() => submit([])} disabled={!ready}>Trash none</GameButton>{/if}</div>
    {#if choice.kind === 'gain'}<p class="destination">To your discard pile</p>{/if}
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    {#if status !== 'synced'}<div class="reconnect" role="status"><p>Connection lost. Your choice is kept.</p><GameButton onclick={retry}>Try again</GameButton></div>{:else if !ready}<p class="pending" role="status">Your choice is kept.</p>{/if}
  </div>
</dialog>
<dialog class="detail" bind:this={detail} onclose={() => inspected = undefined} aria-label="Card details" data-e2e-layout={inspected ? true : undefined}>
  {#if inspected}<h2>{definition(inspected.cardId).name}</h2><div class="detail-card" class:landscape={definition(inspected.cardId).type === 'Leader'}><CardFace card={definition(inspected.cardId)} players={game.playerCount} copy={inspected.copy} /></div><button class="detail-close" onclick={() => detail!.close()}>Back to choice</button>{/if}
</dialog>

<style>
  .choice-scene{position:fixed;inset:0;margin:0;padding:0;border:0;width:100vw;height:100svh;max-width:none;max-height:none;background:#071321;color:#f6dfac;overflow:clip;isolation:isolate;}.environment{position:absolute;inset:0;z-index:-1;}.environment img{width:100%;height:100%;object-fit:cover;filter:brightness(.72);}.scene-content{position:relative;width:100%;height:100%;--control-height:clamp(48px,7svh,140px);--control-font:clamp(22px,3svh,60px);}
  button{color:inherit;cursor:pointer;}button:focus-visible{outline:3px solid #ffe4a2;outline-offset:3px;}button:disabled{cursor:default;opacity:.5;}.source{position:absolute;top:5%;left:7%;width:17%;background:none;border:0;padding:0;}.source.landscape{top:12%;width:27%;left:2%;}.heading{position:absolute;top:7%;left:33%;width:60%;text-align:center;text-shadow:0 2px 5px #000;}h1{font:600 clamp(30px,5svh,96px)/1.1 'Cormorant Garamond',serif;margin:0 0 .25em;}.heading p{font:500 clamp(20px,3svh,60px)/1.1 'Cormorant Garamond',serif;margin:0;}.operation{position:absolute;left:57%;top:21%;--icon-size:clamp(45px,6svh,120px);filter:drop-shadow(0 0 18px #e7ac3688);}.burning{filter:drop-shadow(0 0 25px #ff683399);}
  .options{position:absolute;bottom:24%;left:32%;width:61%;display:flex;justify-content:center;gap:4%;}.option{width:28%;}.card-choice{position:relative;width:100%;background:none;border:0;padding:0;display:block;transition:transform .2s,filter .2s;}.card-choice[aria-pressed=true]{transform:translateY(-12px);filter:drop-shadow(0 0 8px #74f0e7);}.trash .card-choice[aria-pressed=true]{filter:drop-shadow(0 0 8px #ff652f);}.check{position:absolute;bottom:1%;right:2%;border:2px solid #f7e8b5;border-radius:50%;background:#176069;font:bold clamp(16px,2.5svh,50px)/1.4 sans-serif;width:1.5em;text-align:center;}.inspect{display:block;width:100%;min-height:44px;border:0;background:#071321bb;font:500 clamp(16px,2svh,40px) 'Cormorant Garamond',serif;margin-top:12px;}
  .pages{position:absolute;left:40%;width:44%;bottom:15%;display:flex;justify-content:center;gap:20px;align-items:center;font-size:clamp(14px,2svh,38px);}.pages button{width:clamp(44px,5svh,90px);height:clamp(44px,5svh,90px);border:1px solid #b89653;border-radius:50%;background:#071321dd;font-size:30px;}.confirmation{position:absolute;left:33%;width:60%;bottom:5%;display:flex;gap:4%;}.confirmation :global(button){flex:1;min-width:0;}.destination{position:absolute;bottom:0;left:33%;width:60%;text-align:center;font-size:clamp(14px,2svh,36px);margin:0;height:4%;}.error,.pending{position:absolute;left:33%;width:60%;top:33%;text-align:center;background:#102838;color:#ffe8bf;padding:8px;font-size:clamp(14px,2svh,32px);}.error{background:#552b20;}
  .reconnect{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#071321eb;gap:20px;}.reconnect :global(button){width:min(80vw,420px);}.reconnect p{font-size:clamp(18px,2svh,40px);}
  .detail{width:min(680px,95vw);max-height:96svh;border:2px solid #c39d54;border-radius:18px;background:#071321f5;color:#f6dfac;padding:20px;text-align:center;}.detail::backdrop{background:#020914cc;backdrop-filter:blur(5px);}.detail h2{font:600 26px 'Cormorant Garamond',serif;margin:0 0 12px;}.detail-card{width:min(290px,45svh);margin:auto;}.detail-card.landscape{width:min(550px,80vw);}.detail-close{margin-top:16px;min-height:44px;background:#173248;border:1px solid #bc974c;border-radius:8px;padding:10px 24px;}
  @media(max-aspect-ratio:3/4){.source{top:3%;left:36%;width:28%;}.source.landscape{top:7%;left:22%;width:56%;}.heading{top:27%;left:4%;width:92%;}h1{font-size:29px;}.heading p{font-size:21px;}.operation{top:36%;left:calc(50% - 34px);--icon-size:34px;}.options{left:3%;width:94%;bottom:25%;gap:4%;}.option{width:30%;}.card-choice[aria-pressed=true]{transform:translateY(-8px);}.inspect{margin-top:10px;font-size:16px;}.pages{left:5%;width:90%;bottom:17%;font-size:14px;gap:16px;}.pages button{width:44px;height:44px;}.confirmation{left:3%;width:94%;bottom:7%;gap:3%;--control-height:52px;--control-font:20px;}.destination{left:4%;width:92%;font-size:16px;height:4%;bottom:1%;}.error,.pending{left:5%;width:90%;top:43%;font-size:13px;padding:4px;}.detail-card{width:min(62vw,43svh);}.detail h2{font-size:23px;}.detail{padding:16px;}}
</style>
