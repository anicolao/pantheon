import type { CardDefinition } from '$lib/game/types';
export const houses = [
  {god:'Zeus',leader:'Echo',symbol:'◉',color:'#536ca0',theme:'Borrow an opponent’s effects'},
  {god:'Hermes',leader:'Theseus',symbol:'➶',color:'#347e79',theme:'Seek a path through your deck'},
  {god:'Nike',leader:'Achilles',symbol:'❯',color:'#a76a30',theme:'One Action. Repeated effects.'},
  {god:'Hades',leader:'Perseus',symbol:'◆',color:'#76558e',theme:'Turn their Territories into obstacles'}
] as const;
export const proposedCards: CardDefinition[] = [];
function add(god:CardDefinition['god'],id:string,name:string,type:CardDefinition['type'],cost:number|null,effect:string,favored?:string,temple=false){
  proposedCards.push({id,name,type,god,cost,effect,art:`../expansion/cards/${id}`,favored,number:31+proposedCards.length,artDescription:`${name}: original painted Greek illustration.`,startingCopiesPerPlayer:0,uniqueStartingCard:temple||undefined,supply:temple?{2:0,3:0,4:0}:type==='Action'?{2:8,3:12,4:16}:{2:1,3:1,4:1}});
}
for(const house of houses){
 const {god,leader}=house;
 const trigger=god==='Zeus'?'+1 Echo.':god==='Hermes'?'Seek 2 for an Action.':god==='Nike'?'Deploy 1.':'Bind 1.';
 add(god,leader.toLowerCase(),leader,'Leader',null,`After you resolve the first ${god} Action you play this turn, ${trigger}`);
 add(god,`temple-of-${god.toLowerCase()}`,`Temple of ${god}`,'Action',0,'+1 Worship; +1 Action.',undefined,true);
 if(god==='Zeus'){
  add(god,'borrowed-voice','Borrowed Voice','Action',2,'+1 Echo.');
  add(god,'thunders-answer','Thunder’s Answer','Action',4,'+1 Card; +1 Echo.');
  add(god,'chorus-of-olympus','Chorus of Olympus','Action',5,'+1 Action; +2 Echo.');
  add(god,'reverberation','Reverberation','Event',3,'+1 Echo.','+2 Echo.');
 }else if(god==='Hermes'){
  add(god,'ariadnes-thread','Ariadne’s Thread','Action',2,'+1 Action. Seek 3 for a Treasure.');
  add(god,'labyrinth-scout','Labyrinth Scout','Action',4,'+1 Action. Seek 4 for an Action.');
  add(god,'wayfinder','Wayfinder','Action',5,'+1 Card; +1 Action. Seek 3 for any card.');
  add(god,'open-the-hidden-way','Open the Hidden Way','Event',3,'Seek 4 for any card.','Seek 6 for any card; +1 Action.');
 }else if(god==='Nike'){
  add(god,'rallying-cry','Rallying Cry','Action',2,'+1 Card. Deploy 1.');
  add(god,'myrmidon-vanguard','Myrmidon Vanguard','Action',4,'+2 Coins. Deploy 1.');
  add(god,'phalanx-advance','Phalanx Advance','Action',5,'+1 Card. Deploy 2.');
  add(god,'march-of-victory','March of Victory','Event',3,'Deploy 1.','Deploy 3.');
 }else{
  add(god,'polished-shield','Polished Shield','Action',2,'+1 Card; +1 Action. You may discard 1 Territory from your hand. If you do, +1 Card.');
  add(god,'gorgons-gaze','Gorgon’s Gaze','Action',4,'+2 Coins. Bind 1.');
  add(god,'harpe-bearer','Harpe Bearer','Action',5,'+2 Cards. Bind 1.');
  add(god,'stillness-of-the-underworld','Stillness of the Underworld','Event',3,'+1 Coin. Bind 1.','+2 Coins. Bind 2.');
 }
}
