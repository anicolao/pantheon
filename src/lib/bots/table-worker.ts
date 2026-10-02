import {TableBotDriver} from './table';
import type {SetupEvent} from '../game/setup';
const driver=new TableBotDriver();
self.onmessage=(event:MessageEvent<{id:number;events:SetupEvent[];hostUid:string}>)=>{
 const {id,events,hostUid}=event.data;
 try{self.postMessage({id,proposal:driver.next(events,hostUid)});}
 catch(error){self.postMessage({id,error:error instanceof Error?error.message:String(error)});}
};
