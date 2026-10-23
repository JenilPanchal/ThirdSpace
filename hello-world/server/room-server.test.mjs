import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoomServer} from './room-server.mjs';
import youtube from '../shared/youtube.js';

test('YouTube inputs accept supported video links and reject non-YouTube hosts',()=>{
 for(const input of ['dQw4w9WgXcQ','https://youtu.be/dQw4w9WgXcQ?t=3','https://www.youtube.com/watch?si=abc&v=dQw4w9WgXcQ','https://music.youtube.com/watch?v=dQw4w9WgXcQ&feature=share','https://www.youtube.com/shorts/dQw4w9WgXcQ'])assert.equal(youtube.youtubeId(input),'dQw4w9WgXcQ');
 for(const input of ['https://evil.example/watch?v=dQw4w9WgXcQ','https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ','https://youtube.com/watch?v=short','javascript:alert(1)','https://youtu.be/dQw4w9WgXcQEXTRA','cats dancing'])assert.equal(youtube.youtubeId(input),null);
});

test('two devices share presence, one FIFO queue, playback controls and idempotent next',async t=>{
 const server=createRoomServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base=`http://127.0.0.1:${server.address().port}`;
 const call=async(code,path='',token='',body)=>{const r=await fetch(`${base}/api/rooms/${code}${path}`,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 const a=(await call('SHARED','/join','',{name:'River',bench:0})).data;
 const b=(await call('SHARED','/join','',{name:'Sky',bench:0,look:{hair:'Bald',shirt:'#7E9BB9'}})).data;
 assert.equal(b.room.members.length,2);assert.equal(b.room.members[1].look.hair,'Bald');
 assert.equal((await call('SHARED','','bad')).status,401);
 assert.equal((await call('SHARED','/action',a.token,{type:'enqueue',url:'https://evil.example/file.mp3'})).status,400);
 const first=(await call('SHARED','/action',a.token,{type:'enqueue',url:'dQw4w9WgXcQ',title:'First'})).data;
 await call('SHARED','/action',b.token,{type:'enqueue',url:'M7lc1UVf-VE',title:'Second'});
 await call('SHARED','/action',a.token,{type:'enqueue',url:'jNQXAC9IVRw',title:'Third'});
 const state=(await call('SHARED','',b.token)).data;
 assert.equal(state.current.title,'First');assert.deepEqual(state.queue.map(song=>song.title),['Second','Third']);assert.equal(state.queue[0].addedBy,'Sky');assert.equal(state.playing,true);
 assert.equal((await call('SHARED','/action',a.token,{type:'remove',entryId:state.queue[0].id})).status,403);
 await call('SHARED','/action',b.token,{type:'pause'});
 const paused=(await call('SHARED','',a.token)).data;assert.equal(paused.playing,false);const offset=paused.position;
 assert.equal((await call('SHARED','',b.token)).data.position,offset);
 await call('SHARED','/action',a.token,{type:'play'});
 await Promise.all([call('SHARED','/action',a.token,{type:'ended',expectedId:first.current.id}),call('SHARED','/action',b.token,{type:'ended',expectedId:first.current.id})]);
 const advanced=(await call('SHARED','',a.token)).data;assert.equal(advanced.current.title,'Second');assert.equal(advanced.queue.length,1);
 await call('SHARED','/action',a.token,{type:'seat',bench:2});
 assert.equal((await call('SHARED','',b.token)).data.members.find(m=>m.id===a.memberId).bench,2);
 assert.equal((await call('SHARED','/action',a.token,{type:'pause'})).status,403);
 await call('SHARED','/action',b.token,{type:'remove',entryId:advanced.queue[0].id}); // ownership should reject River's song
 assert.equal((await call('SHARED','',a.token)).data.queue.length,1);
 const other=(await call('OTHER','/join','',{name:'Elsewhere',bench:0})).data;assert.equal(other.room.current,null);
 await call('SHARED','/leave',b.token,{});assert.equal((await call('SHARED','',a.token)).data.members.length,1);
 assert.equal((await call('SHARED','',b.token)).status,401);
 const page=await fetch(base+'/player?room=SHARED');assert.equal(page.status,200);assert.match(await page.text(),/youtube.com\/iframe_api/);
});

test('embedded player joins with a private token and follows shared track, seek and pause state',async()=>{
 const {readFile}=await import('node:fs/promises');const vm=await import('node:vm');
 const html=await readFile(new URL('player.html',import.meta.url),'utf8');const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 let state={current:{id:'song-1',videoId:'dQw4w9WgXcQ'},queue:[],playing:true,position:12};
 const requests=[],messages=[],loads=[],seeks=[];let events,interval,time=12,playingState=1,pauses=0;
 const player={loadVideoById:value=>loads.push(value),pauseVideo:()=>{pauses++;playingState=2;},playVideo:()=>{playingState=1;},getPlayerState:()=>playingState,getCurrentTime:()=>time,seekTo:value=>{seeks.push(value);time=value;},stopVideo:()=>{},getDuration:()=>200};
 const context={URLSearchParams,Date,JSON,Math,location:{search:'?room=SHARED',origin:'http://localhost:8787'},document:{getElementById:()=>({textContent:'',hidden:false}),createElement:()=>({}),head:{appendChild:()=>{}}},window:{ReactNativeWebView:{postMessage:value=>messages.push(JSON.parse(value))},addEventListener:()=>{}},YT:{Player:function(_id,options){events=options.events;return player;}},setInterval:callback=>{interval=callback;},fetch:async(path,options={})=>{requests.push({path,options});return{ok:true,json:async()=>state};}};
 vm.runInNewContext(script,context);
 context.window.thirdSpaceConnect({token:'private-member-token',code:'SHARED'});await new Promise(resolve=>setImmediate(resolve));
 context.window.onYouTubeIframeAPIReady();events.onReady();
 assert.equal(loads[0].videoId,'dQw4w9WgXcQ');assert.equal(loads[0].startSeconds,12);
 assert.equal(requests[0].options.headers.Authorization,'Bearer private-member-token');assert.equal(requests[0].path.includes('private-member-token'),false);
 state={...state,position:25};await interval();assert.equal(seeks.at(-1),25);
 state={...state,playing:false};await interval();assert.equal(pauses,1);
 events.onStateChange({data:0});await new Promise(resolve=>setImmediate(resolve));assert.ok(requests.some(r=>r.options.body&&JSON.parse(r.options.body).type==='ended'&&JSON.parse(r.options.body).expectedId==='song-1'));
 state={...state,current:{id:'song-2',videoId:'M7lc1UVf-VE'},playing:true,position:0};await interval();assert.equal(loads.at(-1).videoId,'M7lc1UVf-VE');
 events.onError({data:153});assert.ok(messages.some(m=>m.type==='error'&&m.message.includes('player origin')));
});

test('automatic rooms assign a share code, group guests and search music behind authenticated sessions',async t=>{
 let calls=0;
 const server=createRoomServer({apiKey:'server-only-test-key',fetchImpl:async url=>{calls++;assert.equal(url.origin,'https://www.googleapis.com');assert.equal(url.searchParams.get('videoCategoryId'),'10');assert.equal(url.searchParams.get('videoEmbeddable'),'true');assert.equal(url.searchParams.get('q'),'jazz');return {ok:true,json:async()=>({items:[{id:{videoId:'M7lc1UVf-VE'},snippet:{title:'Jazz song',channelTitle:'Artist'}}]})};}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base=`http://127.0.0.1:${server.address().port}`;
 const join=async code=>(await (await fetch(`${base}/api/rooms/${code}/join`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Listener',bench:0})})).json());
 const first=await join('AUTO');assert.match(first.room.code,/^[A-F0-9]{6}$/);assert.ok(first.shareUrl.endsWith('/?room='+first.room.code));
 const second=await join('AUTO');assert.equal(first.room.code,second.room.code);
 for(let i=0;i<4;i++)await join('AUTO');
 const seventh=await join('AUTO');assert.notEqual(seventh.room.code,first.room.code);
 const code=first.room.code;
 assert.equal((await fetch(`${base}/api/rooms/${code}/search?q=jazz`)).status,401);
 const search=await fetch(`${base}/api/rooms/${code}/search?q=jazz`,{headers:{Authorization:'Bearer '+first.token}});
 assert.equal(search.status,200);const result=await search.json();assert.equal(result.items[0].title,'Jazz song');assert.equal(JSON.stringify(result).includes('server-only-test-key'),false);
 const cached=await fetch(`${base}/api/rooms/${code}/search?q=jazz`,{headers:{Authorization:'Bearer '+second.token}});assert.equal(cached.status,200);assert.equal(calls,1);
 assert.equal((await fetch(`${base}/api/rooms/${code}/search?q=jazz`,{headers:{Authorization:'Bearer '+first.token}})).status,429);
});

test('search without a server credential reports setup rather than fabricated music',async()=>{
 const {createMusicSearch}=await import('./youtube-search.mjs');
 await assert.rejects(createMusicSearch({apiKey:''})('jazz'),{status:503});
});

test('Potrait synchronizes pixels, enforces two placements per minute and preserves the allowance on rejoin',async t=>{
 let clock=1000;
 const server=createRoomServer({now:()=>clock,apiKey:''});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base=`http://127.0.0.1:${server.address().port}`;
 const call=async(path,token='',body)=>{const r=await fetch(base+'/api/rooms/PAINT'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:body===undefined?undefined:JSON.stringify(body)});return{status:r.status,data:await r.json()};};
 const a=(await call('/join','',{name:'River',bench:1,clientId:'player-river-stable-123'})).data;
 const b=(await call('/join','',{name:'Sky',bench:1,clientId:'player-sky-stable-456'})).data;
 assert.equal(a.room.canvas.pixels.length,32*24);assert.equal(a.room.canvas.budget.remaining,2);
 const paint=(token,x,color='#D88761')=>call('/action',token,{type:'pixel',x,y:2,color});
 assert.equal((await paint(a.token,-1)).status,400);
 assert.equal((await paint(a.token,1,'#BADBAD')).status,400);
 assert.equal((await paint(a.token,1)).status,200);
 assert.equal((await paint(a.token,1)).status,409);
 assert.equal((await call('',b.token)).data.canvas.pixels[65],'#D88761');
 assert.equal((await call('',b.token)).data.canvas.budget.remaining,2);
 assert.equal((await paint(a.token,2)).data.canvas.budget.remaining,0);
 assert.equal((await paint(a.token,3)).status,429);
 const parallel=await Promise.all([paint(b.token,4),paint(b.token,5),paint(b.token,6)]);assert.deepEqual(parallel.map(r=>r.status).sort(),[200,200,429]);
 await call('/leave',a.token,{});
 const rejoined=(await call('/join','',{name:'River',bench:1,clientId:'player-river-stable-123'})).data;
 assert.equal(rejoined.room.canvas.budget.remaining,0);assert.equal((await paint(rejoined.token,7)).status,429);
 clock+=60001;assert.equal((await call('',rejoined.token)).data.canvas.budget.remaining,2);
 assert.equal((await paint(rejoined.token,7)).status,200);
 await call('/action',rejoined.token,{type:'seat',bench:0});assert.equal((await paint(rejoined.token,8)).status,403);
 const link=await call('/action',rejoined.token,{type:'enqueue',url:'https://youtu.be/M7lc1UVf-VE',title:''});assert.equal(link.status,200);assert.equal(link.data.current.videoId,'M7lc1UVf-VE');
 assert.equal(JSON.stringify(link.data.members).includes('player-river-stable-123'),false);
 const search=await call('/search?q=jazz',rejoined.token);assert.equal(search.status,503);assert.equal(/api|key|quota/i.test(search.data.error),false);
});
