/** Research-only inference: identical accumulation, omitting unused output rows. */
import type {Actor} from '../rl-runtime';
export function maskedActorAction(actor:Actor,expectedSchemaSignature:string){
 let layers:{input:number;output:number;weights:Float32Array;bias:Float32Array}[]|undefined;
 function floats(encoded:string){const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));if(bytes.length%4)throw Error('Invalid tensor');const view=new DataView(bytes.buffer),out=new Float32Array(bytes.length/4);for(let i=0;i<out.length;i++){out[i]=view.getFloat32(i*4,true);if(!Number.isFinite(out[i]))throw Error('Nonfinite tensor');}return out;}
 return (values:readonly number[],mask:readonly boolean[])=>{
  if(actor.version!==1||actor.schemaSignature!==expectedSchemaSignature||actor.activation!=='tanh'||actor.dtype!=='float32-le')throw Error('Incompatible research model');
  layers??=actor.layers.map(l=>({...l,weights:floats(l.weights),bias:floats(l.bias)}));
  let input=new Float32Array(values);
  for(const x of input)if(!Number.isFinite(x))throw Error('Nonfinite observation');
  const nonzero:number[]=[];for(let i=0;i<input.length;i++)if(input[i]!==0)nonzero.push(i);
  for(let n=0;n<layers.length;n++){
   const l=layers[n],last=n===layers.length-1;if(input.length!==l.input||l.weights.length!==l.input*l.output||l.bias.length!==l.output)throw Error('Invalid dimensions');
   if(last&&mask.length!==l.output)throw Error('Invalid action mask');
   const output=new Float32Array(l.output);let best=-1;
   for(let row=0;row<l.output;row++){
    if(last&&!mask[row])continue;
    let value=l.bias[row];const start=row*l.input;
    if(n===0){for(const col of nonzero)value+=l.weights[start+col]*input[col];}
    else for(let col=0;col<l.input;col++)value+=l.weights[start+col]*input[col];
    value=Math.fround(value);output[row]=last?value:Math.tanh(value);
    if(!Number.isFinite(output[row]))throw Error('Nonfinite policy output');
    if(last&&(best<0||output[row]>output[best]))best=row;
   }
   if(last){if(best<0)throw Error('No legal action');return best;}
   input=output;
  }
  throw Error('No actor layers');
 };
}
