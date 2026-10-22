import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {mmVersion} from '../src/lib/bots/mm';

// Package exact replay inputs without committing hundreds of worker/cache files.
const directory=process.env.MM_OUTPUT??`balance-results/mm-v${mmVersion}`;
const protocol=JSON.parse(readFileSync(`${directory}/protocol.json`,'utf8'));
const summary=JSON.parse(readFileSync(`${directory}/summary.json`,'utf8'));
if(summary.length!==protocol.opponents.length*protocol.leaders.length||summary.some((r:any)=>r.games!==protocol.gamesPerCell||r.wins+r.ties+r.losses!==r.games))throw Error('Incomplete study');
const sha=(data:string|Uint8Array)=>createHash('sha256').update(data).digest('hex');
const records=[];
for(const kind of protocol.opponents)for(const leader of protocol.leaders)for(let index=0;index<protocol.gamesPerCell;index++){
 const file=`${kind}-${leader}-${index}.json.gz`,raw=gunzipSync(readFileSync(`${directory}/${file}`));
 records.push({file,sha256:sha(raw),record:JSON.parse(raw.toString())});
}
if(records.length!==protocol.total)throw Error('Missing replays');
const archive=gzipSync(JSON.stringify({version:1,protocol,records}));
const restored=JSON.parse(gunzipSync(archive).toString());
if(restored.records.length!==records.length||restored.records.some((r:any)=>sha(JSON.stringify(r.record))!==r.sha256))throw Error('Archive round-trip failed');
writeFileSync(`${directory}/replays.json.gz`,archive);
writeFileSync(`${directory}/replays.sha256`,`${sha(archive)}  replays.json.gz\n`);
console.log(`Archived and verified ${records.length} replays (${archive.length} bytes).`);
