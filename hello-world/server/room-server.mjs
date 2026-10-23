import {createBeeService} from './bee/service.mjs';
import {createPixelCanvas} from './pixel-canvas.mjs';
import {createMusicSearch} from './youtube-search.mjs';
import http from 'node:http';
import {randomBytes, randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {networkInterfaces} from 'node:os';
import youtube from '../shared/youtube.js';

const defaultLook = {hair:'Waves',hairColor:'#3D2925',skin:'#DDA478',face:'Round',expression:'Smile',body:'Regular',shirt:'#D88761'};
function cleanLook(input = {}) {
  const look = {...defaultLook};
  const options = {hair:['Crop','Waves','Bob','Bald'],face:['Round','Oval','Square'],expression:['Smile','Calm','Grin'],body:['Regular','Broad','Slim']};
  for (const [key, values] of Object.entries(options)) if (values.includes(input[key])) look[key] = input[key];
  for (const key of ['skin','hairColor','shirt']) if (/^#[\da-f]{6}$/i.test(input[key] || '')) look[key] = input[key];
  return look;
}
const fail = (status, message) => {throw Object.assign(new Error(message), {status});};
const position = (room, now = Date.now()) => room.offset + (room.playing && room.startedAt ? (now - room.startedAt) / 1000 : 0);
function next(room) {room.current = room.queue.shift() || null; room.offset = 0; room.startedAt = Date.now(); room.playing = !!room.current; room.revision++;}
function reconcile(room) {
  const now = Date.now();
  for (const [token, member] of room.members) if (now - member.lastSeen > 45000) room.members.delete(token);
  if (room.current?.duration && position(room, now) >= room.current.duration) next(room);
}
function snapshot(room, viewer) {
  reconcile(room);
  return {code:room.code,revision:room.revision,serverTime:Date.now(),playing:room.playing,position:position(room),current:room.current,queue:room.queue,canvas:room.canvas.snapshot(viewer?.identity),members:[...room.members.values()].map(({lastSeen,identity,...member}) => member)};
}
async function readJson(req) {
  let text = '';
  for await (const part of req) {text += part; if (Buffer.byteLength(text) > 65536) fail(413,'Request is too large.');}
  try {return JSON.parse(text || '{}');} catch {fail(400,'Invalid JSON.');}
}
export function createRoomServer(options = {}) {
  const searchMusic = createMusicSearch(options);
  const searchTimes = new Map();
  const rooms = new Map();
  const bee = createBeeService(options.bee);
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('X-Content-Type-Options','nosniff');
    const send = (status, data) => {res.writeHead(status, {'Content-Type':'application/json'});res.end(JSON.stringify(data));};
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'GET' && ['/', '/player'].includes(url.pathname)) {
        const file = url.pathname === '/' ? 'controller.html' : 'player.html';
        const html = await readFile(new URL(file, import.meta.url));
        res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});res.end(html);return;
      }
      if (url.pathname.startsWith('/api/bee/')) {const result=await bee(req,url,readJson);send(result.status||200,result.data);return;}
      if (url.pathname === '/health') {send(200,{ok:true});return;}
      const route = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{3,12})(?:\/(join|action|leave|search))?$/);
      if (!route) fail(404,'Room endpoint not found.');
      let [,code,endpoint] = route;
      // Remove idle rooms; this prototype deliberately keeps live sessions in memory.
      for (const [key, value] of rooms) if (Date.now() - value.touched > 30 * 60 * 1000) rooms.delete(key);
      if (req.method === 'POST' && endpoint === 'join') {
        const body = await readJson(req);
        if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 24) fail(400,'Choose a display name of 1–24 characters.');
        if (code === 'AUTO') {
          const available = [...rooms.values()].filter(room => {reconcile(room);return room.members.size > 0 && room.members.size < 6;});
          code = available.length ? available[Math.floor(Math.random() * available.length)].code : randomBytes(3).toString('hex').toUpperCase();
          while (!available.length && rooms.has(code)) code = randomBytes(3).toString('hex').toUpperCase();
        }
        if (!rooms.has(code)) {
          if (rooms.size >= 100) fail(503,'The room server is full.');
          rooms.set(code,{code,revision:0,members:new Map(),current:null,queue:[],playing:false,offset:0,startedAt:0,touched:Date.now(),canvas:createPixelCanvas({now:options.now})});
        }
        const room=rooms.get(code);reconcile(room);
        if (room.members.size >= 24) fail(409,'This garden is full.');
        const token=randomBytes(24).toString('hex');
        const member={identity:/^[a-zA-Z0-9-]{16,80}$/.test(body.clientId || '')?body.clientId:token,id:randomUUID(),name:body.name.trim(),look:cleanLook(body.look),bench:[0,1,2].includes(body.bench)?body.bench:null,lastSeen:Date.now()};
        room.members.set(token,member);room.touched=Date.now();room.revision++;
        const localIP=Object.values(networkInterfaces()).flat().find(ip=>ip.family==='IPv4' && !ip.internal)?.address || 'localhost';
        const host=req.headers.host || '';
        const localHost=/^(10\.0\.2\.2|127\.0\.0\.1|localhost)(:|$)/.test(host);
        const origin=process.env.THIRD_SPACE_PUBLIC_URL || (localHost ? `http://${localIP}:${server.address().port}` : `http://${host}`);
        send(201,{token,memberId:member.id,shareUrl:`${origin}/?room=${code}`,room:snapshot(room,member)});return;
      }
      const room=rooms.get(code);
      if (!room) fail(404,'This room expired. Please join again.');
      reconcile(room);
      const token=(req.headers.authorization || '').replace(/^Bearer /,'');
      const member=room.members.get(token);
      if (!member) fail(401,'Your room session expired. Please join again.');
      member.lastSeen=Date.now();room.touched=Date.now();
      if (req.method === 'GET' && endpoint === 'search') {
        if (member.bench !== 0) fail(403,'Take a seat at Jukebox to search music.');
        const last = searchTimes.get(token) || 0;
        if (Date.now() - last < 1200) fail(429,'Wait a moment before searching again.');
        for (const [key,time] of searchTimes) if (Date.now() - time > 60000) searchTimes.delete(key);
        searchTimes.set(token,Date.now());
        send(200,{items:await searchMusic(url.searchParams.get('q'))});return;
      }
      if (req.method === 'GET' && !endpoint) {send(200,snapshot(room,member));return;}
      if (req.method === 'POST' && endpoint === 'leave') {room.members.delete(token);room.revision++;send(200,{ok:true});return;}
      if (req.method !== 'POST' || endpoint !== 'action') fail(405,'Method not allowed.');
      const body=await readJson(req);
      if (body.type === 'seat') {
        if (body.bench !== null && ![0,1,2].includes(body.bench)) fail(400,'Choose one of the three benches.');
        member.bench=body.bench;room.revision++;
      } else if (body.type === 'pixel') {
        if (member.bench !== 1) fail(403,'Take a seat at Potrait to paint.');
        room.canvas.place(member.identity,body.x,body.y,body.color);room.revision++;
      } else {
        if (member.bench !== 0) fail(403,'Take a seat at Jukebox to control the music.');
        if (body.type === 'enqueue') {
          const videoId=youtube.youtubeId(body.url);
          if (!videoId) fail(400,'Paste a YouTube video URL or an 11-character video ID.');
          if (room.queue.length >= 50) fail(409,'The queue is full (50 songs).');
          const entry={id:randomUUID(),videoId,title:typeof body.title==='string' && body.title.trim() ? body.title.trim().slice(0,100) : 'YouTube track',addedBy:member.name,memberId:member.id,duration:null};
          room.queue.push(entry);room.revision++;
          if (!room.current) next(room);
        } else if (body.type === 'next' || body.type === 'ended') {
          // Multiple players may report the same end event. Advance exactly once.
          if (room.current && body.expectedId === room.current.id) next(room);
        } else if (body.type === 'play' || body.type === 'pause') {
          if (room.current) {room.offset=position(room);room.startedAt=Date.now();room.playing=body.type==='play';room.revision++;}
        } else if (body.type === 'duration') {
          if (room.current?.id === body.expectedId && Number.isFinite(body.duration) && body.duration>0 && body.duration<=86400) room.current.duration=body.duration;
        } else if (body.type === 'title') {
          if (room.current?.id === body.expectedId && typeof body.title==='string' && body.title.trim()) room.current.title=body.title.trim().slice(0,100);
        } else if (body.type === 'remove') {
          const entry=room.queue.find(item => item.id===body.entryId);
          if (entry && entry.memberId!==member.id) fail(403,'You can remove only songs you added.');
          room.queue=room.queue.filter(item=>item.id!==body.entryId);room.revision++;
        } else fail(400,'Unknown room action.');
      }
      send(200,snapshot(room,member));
    } catch (error) {if (!res.headersSent) send(error.status || 500,error.status ? {error:error.message} : {error:'Room server error.'}); else res.end();}
  });
  server.requestTimeout=10000;
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port=Number(process.env.THIRD_SPACE_PORT || 8787);
  createRoomServer().listen(port,'0.0.0.0',()=>{
    console.log(`Third Space room server: http://localhost:${port}`);
    for (const entries of Object.values(networkInterfaces())) for (const ip of entries || []) if (ip.family==='IPv4' && !ip.internal) console.log(`Join from another device: http://${ip.address}:${port}`);
  });
}
