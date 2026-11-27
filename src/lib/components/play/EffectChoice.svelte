<script lang="ts">
  import type {SetupState} from '$lib/game/setup';
  import {activePlayer,definition,effectOptions,type Choice,type ActionCommand} from '$lib/game/actions';
  import SeekCoverflow from './SeekCoverflow.svelte';
  import CardFace from '../CardFace.svelte';
  import CardBack from '../CardBack.svelte';
  import GameButton from '../GameButton.svelte';
  import EffectIcon from '../expansion/EffectIcon.svelte';
  let {game,choice,ready,readOnly=false,command,rotation=0}:{game:SetupState;choice:Choice;ready:boolean;readOnly?:boolean;command:(command:ActionCommand)=>Promise<void>;rotation?:number}=$props();
  const actor=$derived(activePlayer(game));
  const options=$derived(effectOptions(game,actor,choice));
  const displayed=$derived(choice.kind==='seek'?(game.turn.revealed??[]).map(card=>({id:card.id,card,uid:actor})):options);
  const source=$derived(definition(choice.source));
  const title=$derived(choice.kind==='echo'?'Echo':choice.kind==='seek'?'Seek':'Bind');
  const instruction=$derived(choice.kind==='echo'?'Borrow an Action from an opponent’s discard. If their discard is empty, reveal their top card: play an Action or Treasure; a Territory stays discarded.':choice.kind==='seek'? `Seek ${choice.filter==='Treasure'?'a Treasure':choice.filter==='Action'?'an Action':'any card'} · Keep up to one; discard the rest.`:'Put a Territory from an opponent’s discard on top of their deck.');
  async function choose(id?:string){if(ready&&!readOnly)await command({type:'choice/resolved',choiceId:choice.id,targets:id?[id]:[]});}
</script>
<section class="effect-choice" aria-label={title+' choice'} data-effect-choice={choice.kind}>
  <header><EffectIcon effect={title} value={1} positive={choice.kind==='echo'}/><div><strong>{source.name}{source.type==='Leader'?' · Leader ability':''}</strong><p>{instruction}</p></div></header>
  {#if choice.kind==='seek'}
    {#key choice.id}<SeekCoverflow cards={game.turn.revealed??[]} eligible={options.map(option=>option.id)} players={game.playerCount} uid={actor} {ready} {readOnly} {rotation} focus={choice.browsedCardId} choose={id=>void choose(id)} browse={cardId=>command({type:'choice/browsed',choiceId:choice.id,cardId})}/>{/key}
  {:else}
  <div class="effect-options">
    {#each displayed as option (option.id)}
      <div class="option">
        <button disabled={!ready||readOnly||!options.some(item=>item.id===option.id)} onclick={()=>choose(option.id)}
          aria-label={option.card?`Choose ${definition(option.card.cardId).name}`:`Reveal ${game.players.find(player=>player.uid===option.uid)?.name}’s top card`}>
          <div data-motion-key={option.card?`effect:${option.id}`:undefined} data-motion-card={option.card?.id} data-motion-face={option.card?.cardId} data-motion-copy={option.card?.copy}
            data-public-zone={option.card?'discard':'deck'} data-public-uid={option.uid} data-motion-angle={rotation}>
            {#if option.card}<CardFace card={definition(option.card.cardId)} copy={option.card.copy} players={game.playerCount}/>{:else}<CardBack format="deck"/>{/if}
          </div>
        </button>
        <small>{game.players.find(player=>player.uid===option.uid)?.name}{#if choice.kind==='echo'} · {option.card?'Discard · borrow this Action':'Empty discard · reveal top card'}{/if}</small>
      </div>
    {/each}
  </div>
  {/if}
  {#if !readOnly}<GameButton disabled={!ready} onclick={()=>choose()}>{choice.kind==='seek'?'Discard all':'Decline '+title}</GameButton>{:else}<p class="watching">Waiting for {game.players.find(player=>player.uid===actor)?.name}</p>{/if}
</section>
<style>
.effect-choice{position:absolute;left:var(--center-left,0);width:var(--center-width,100%);top:var(--play-top,0);z-index:46;display:flex;flex-direction:column;align-items:center;gap:8px;color:#ffe9bb;padding:12px;background:linear-gradient(90deg,#07132100,#071321f2 12%,#071321f2 88%,#07132100);box-sizing:border-box;--control-height:38px;--control-font:16px}
header{display:flex;gap:12px;align-items:center;max-width:650px;--effect-icon-size:24px}strong{font-size:20px}p{margin:4px 0;font-size:16px}.effect-options{display:flex;max-width:100%;overflow-x:auto;gap:12px;padding:8px}.option{width:var(--table-card-width,130px);flex-shrink:0;text-align:center}.option button{width:100%;padding:0;border:0;background:none;cursor:pointer;filter:drop-shadow(0 4px 5px #0008)}.option button:disabled{cursor:default}.option button:enabled:hover{filter:brightness(1.15) drop-shadow(0 0 6px #d9b76f)}.option small{display:block;margin-top:4px;font-size:12px}.watching{font-style:italic}
@media(max-aspect-ratio:3/4){header{--effect-icon-size:18px}strong{font-size:16px}p{font-size:13px}.effect-choice{padding:6px;gap:4px}.effect-options{gap:6px}}
</style>
