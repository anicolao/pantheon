import {decide,type BotKind,type BotMemory} from './policy';
import type {StandardView} from '../../../standard-matrix/policy';
self.onmessage=(event:MessageEvent<{id:number;view:StandardView;memory:BotMemory;kind:BotKind}>)=>{
 const {id,view,memory,kind}=event.data;
 try{self.postMessage({id,command:decide(view,memory,kind),memory});}
 catch(e){self.postMessage({id,error:e instanceof Error?e.message:String(e)});}
};
