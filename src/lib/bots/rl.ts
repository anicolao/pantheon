import nereon from './models/nereon.json';
import thaleia from './models/thaleia.json';
import doreios from './models/doreios.json';
import {commands,observation,schemaSignature} from './rl-schema';
import type {StandardView} from '../../../standard-matrix/policy';

type Actor={version:number;leader:string;checkpointSHA256:string;schemaSignature:string;dtype:string;activation:string;layers:{input:number;output:number;weights:string;bias:string}[]};
const actors:Record<string,Actor>={nereon,thaleia,doreios};
type Layer={input:number;output:number;weights:Float32Array;bias:Float32Array};
const cache=new Map<string,Layer[]>();
function floats(encoded:string){
 const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
 if(bytes.length%4)throw Error('Invalid RL tensor');
 const view=new DataView(bytes.buffer),values=new Float32Array(bytes.length/4);
 for(let i=0;i<values.length;i++)values[i]=view.getFloat32(i*4,true);
 return values;
}
export function rlCheckpointHash(leader:string){const actor=actors[leader];if(!actor)throw Error(`No RL model for ${leader}`);return actor.checkpointSHA256;}
function layersFor(leader:string){
 const cached=cache.get(leader);if(cached)return cached;
 const actor=actors[leader];
 if(!actor||actor.version!==1||actor.leader!==leader||actor.schemaSignature!==schemaSignature||actor.activation!=='tanh'||actor.dtype!=='float32-le')throw Error(`Incompatible RL model for ${leader}`);
 const layers=actor.layers.map(layer=>({...layer,weights:floats(layer.weights),bias:floats(layer.bias)}));
 for(const layer of layers)if(layer.weights.length!==layer.input*layer.output||layer.bias.length!==layer.output)throw Error('Invalid RL layer dimensions');
 cache.set(leader,layers);return layers;
}
/** Deterministic masked actor inference; no teacher, network, or hidden game state. */
export function rlLogits(leader:string,values:readonly number[]){
 let input=new Float32Array(values);const layers=layersFor(leader);
 for(let n=0;n<layers.length;n++){
  const layer=layers[n];if(input.length!==layer.input)throw Error('RL observation dimensions changed');
  const output=new Float32Array(layer.output);
  for(let row=0;row<layer.output;row++){
   let value=layer.bias[row];const start=row*layer.input;
   for(let col=0;col<layer.input;col++)value+=layer.weights[start+col]*input[col];
   value=Math.fround(value);output[row]=n===layers.length-1?value:Math.tanh(value);
  }
  input=output;
 }
 return input;
}
export function rlAction(leader:string,values:readonly number[],mask:readonly boolean[]){
 const logits=rlLogits(leader,values);if(mask.length!==logits.length)throw Error('RL action dimensions changed');
 let best=-1;
 for(let i=0;i<logits.length;i++){
  if(!Number.isFinite(logits[i]))throw Error('Nonfinite RL policy output');
  if(mask[i]&&(best<0||logits[i]>logits[best]))best=i;
 }
 if(best<0)throw Error('RL policy has no legal action');return best;
}
export function rlCommand(view:StandardView){
 const choices=commands(view);return choices[rlAction(view.leader,observation(view),choices.map(Boolean))]!;
}
