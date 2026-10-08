<script lang="ts">
  import { base } from '$app/paths';
  import { standings, definition } from '$lib/game/actions';
  import type { SetupState } from '$lib/game/setup';
  import ResourceIcon from '../ResourceIcon.svelte';
  let {game,again}:{game:SetupState;again:()=>void}=$props();
  const scores=$derived(standings(game));
  const metals=['gold','silver','bronze','lead'];
  const placements=$derived(scores.map(score=>scores.findIndex(other=>other.score===score.score&&other.turns===score.turns)));
  const name=(uid:string)=>definition(game.leaders[uid]).name.split(',')[0];
  const winners=$derived(scores.filter(score=>score.winner).map(score=>name(score.uid)).join(' & '));
</script>
<section class="tabletop-victory" aria-label="Final scores">
  <div class="orbit">
    {#each scores as score,index}
      <div class="position" style:--angle={`${index*360/scores.length}deg`}>
        <article class="standing" data-metal={metals[placements[index]]} style:--delay={`${index*400}ms`} aria-label={`Place ${placements[index]+1}, ${metals[placements[index]]}: ${name(score.uid)}, ${score.score} VP`}>
          <div class="portrait">
            <img class="hero" src={`${base}/assets/cards/${game.leaders[score.uid]}.webp`} alt=""/>
            <img class="frame" src={`${base}/assets/ui/victory-portrait-frame.webp`} alt=""/>
            <span class="name">{name(score.uid)}</span>
            <span class="points"><ResourceIcon resource="victory" value={score.score}/></span>
          </div>
          <p>{score.winner?'Victor':`Place ${placements[index]+1}`} · {score.turns} turns</p>
        </article>
      </div>
    {/each}
  </div>
  <div class="summary">
    <h1>{winners} {scores.filter(score=>score.winner).length===1?'wins':'share victory'}</h1>
    <button class="rematch" onclick={again}>Rematch</button>
    <p>Same seats · New starting player</p>
  </div>
</section>
<style>
  .tabletop-victory{position:absolute;inset:0;color:#ffe5ad;}
  .orbit{position:absolute;inset:0;animation:orbit 80s linear infinite;animation-delay:1.6s;}
  .position{position:absolute;inset:0;transform:rotate(var(--angle));pointer-events:none;}
  .standing{position:absolute;left:50%;top:50%;width:29cqmin;margin:-10cqmin 0 0 -14.5cqmin;translate:0 27cqmin;animation:arrive 700ms cubic-bezier(.2,.7,.2,1) both;animation-delay:var(--delay);filter:drop-shadow(0 1cqmin 1cqmin #000);}
  .portrait{position:relative;aspect-ratio:3/2;}.hero{position:absolute;left:10%;top:11%;width:80%;height:66%;object-fit:cover;object-position:50% 25%;}.frame{position:absolute;inset:0;width:100%;height:100%;filter:var(--metal-filter,drop-shadow(0 0 .7cqmin #f6c56c));}
  [data-metal=silver]{--metal-filter:grayscale(1) brightness(1.02);}[data-metal=bronze]{--metal-filter:sepia(1) saturate(1.65) hue-rotate(-25deg) brightness(.88);}[data-metal=lead]{--metal-filter:grayscale(1) brightness(.62);}
  .name{position:absolute;left:15%;width:70%;top:79%;height:10%;display:grid;place-items:center;color:#36230d;font:700 2.3cqmin/1 'Cormorant Garamond',serif;}[data-metal=lead] .name{color:#fff4da;text-shadow:0 1px 2px #000;}.points{position:absolute;right:3%;top:9%;--icon-size:3.1cqmin;--icon-number-scale:.8;}.standing p{text-align:center;margin:0;font:600 1.7cqmin 'Cormorant Garamond',serif;}
  .summary{position:absolute;left:50%;top:50%;width:30cqmin;translate:-50% -50%;text-align:center;}.summary h1{font:600 3.5cqmin/1.1 'Cormorant Garamond',serif;margin:0 0 2cqmin;}.summary p{font-size:1.3cqmin;}.rematch{font:700 3cqmin 'Cormorant Garamond',serif;color:#15212a;background:linear-gradient(#f0d89a,#a5803f);border:1px solid #ffe3a3;border-radius:1cqmin;padding:1.2cqmin 3cqmin;cursor:pointer;box-shadow:0 .5cqmin 2cqmin #0008;}.rematch:focus-visible{outline:3px solid white;outline-offset:4px;}
  @keyframes orbit{to{transform:rotate(360deg);}}@keyframes arrive{from{opacity:0;translate:0 12cqmin;scale:.7;}to{opacity:1;translate:0 27cqmin;scale:1;}}
  @media(prefers-reduced-motion:reduce){.orbit,.standing{animation:none;}}
</style>
