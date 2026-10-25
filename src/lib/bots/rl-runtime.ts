import {schemaSignature} from './rl-schema';
export type Actor={version:number;leader:string;checkpointSHA256:string;schemaSignature:string;dtype:string;activation:string;layers:{input:number;output:number;weights:string;bias:string}[]};
export function createActor(actor:Actor){
type Layer={input:number;output:number;weights:Float32Array;bias:Float32Array};
let cached:Layer[]|undefined;
function floats(encoded:string){
 const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
 if(bytes.length%4)throw Error('Invalid RL tensor');
 const view=new DataView(bytes.buffer),values=new Float32Array(bytes.length/4);
 for(let i=0;i<values.length;i++)values[i]=view.getFloat32(i*4,true);
 return values;
}
function layersFor(){
 if(cached)return cached;
 const leader=actor.leader;
 if(!actor||actor.version!==1||actor.schemaSignature!==schemaSignature||actor.activation!=='tanh'||actor.dtype!=='float32-le')throw Error(`Incompatible RL model for ${leader}`);
 const layers=actor.layers.map(layer=>({...layer,weights:floats(layer.weights),bias:floats(layer.bias)}));
 for(const layer of layers)if(layer.weights.length!==layer.input*layer.output||layer.bias.length!==layer.output)throw Error('Invalid RL layer dimensions');
 cached=layers;return layers;
}
/** Deterministic masked actor inference; no teacher, network, or hidden game state. */
function logits(values:readonly number[]){
 let input=new Float32Array(values);const layers=layersFor();
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
function action(values:readonly number[],mask:readonly boolean[]){
 const valuesOut=logits(values);if(mask.length!==valuesOut.length)throw Error('RL action dimensions changed');
 let best=-1;
 for(let i=0;i<valuesOut.length;i++){
  if(!Number.isFinite(valuesOut[i]))throw Error('Nonfinite RL policy output');
  if(mask[i]&&(best<0||valuesOut[i]>valuesOut[best]))best=i;
 }
 if(best<0)throw Error('RL policy has no legal action');return best;
}
return {logits,action,leader:actor.leader,checkpointSHA256:actor.checkpointSHA256};
}
