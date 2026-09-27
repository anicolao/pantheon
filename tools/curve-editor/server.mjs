import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const directory=fileURLToPath(new URL('.',import.meta.url));
const repo=fileURLToPath(new URL('../../',import.meta.url));
const files={
 '/':[`${directory}index.html`,'text/html; charset=utf-8'],
 '/editor.js':[`${directory}editor.js`,'text/javascript; charset=utf-8'],
 '/style.css':[`${directory}style.css`,'text/css; charset=utf-8'],
 '/art.webp':[`${repo}/static/assets/ui/gather-invite.webp`,'image/webp'],
 '/font.woff2':[`${repo}/node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-700-normal.woff2`,'font/woff2']
};
createServer(async(req,res)=>{
 const entry=files[new URL(req.url,'http://localhost').pathname];
 if(!entry){res.writeHead(404);res.end('Not found');return;}
 try{res.writeHead(200,{'Content-Type':entry[1],'Cache-Control':'no-store'});res.end(await readFile(entry[0]));}
 catch{res.writeHead(500);res.end('Could not load editor asset.');}
}).listen(5194,'127.0.0.1',()=>console.log('Curve editor: http://127.0.0.1:5194'));
