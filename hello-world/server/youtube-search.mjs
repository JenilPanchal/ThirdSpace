// Search metadata stays on the server; the API credential never enters the app.
export function createMusicSearch({apiKey = process.env.YOUTUBE_API_KEY, fetchImpl = fetch} = {}) {
  const cache = new Map();
  return async query => {
    if (!apiKey) throw Object.assign(new Error('Search is taking a break. Paste a YouTube link to keep the music going.'), {status:503});
    const q = String(query || '').trim().slice(0,120);
    if (q.length < 2) throw Object.assign(new Error('Enter at least two characters to search.'), {status:400});
    const cached = cache.get(q.toLowerCase());
    if (cached && Date.now() - cached.time < 5 * 60 * 1000) return cached.items;
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.search = new URLSearchParams({key:apiKey,part:'snippet',type:'video',q,maxResults:'8',videoCategoryId:'10',videoEmbeddable:'true',videoSyndicated:'true',safeSearch:'moderate'});
    let response;
    try {response = await fetchImpl(url, {signal:AbortSignal.timeout(8000)});} catch {throw Object.assign(new Error('YouTube search could not connect. Please try again.'),{status:502});}
    if (!response.ok) throw Object.assign(new Error('Search is unavailable right now. Try a YouTube link instead.'),{status:502});
    const data = await response.json();
    const items = (data.items || []).filter(item => /^[\w-]{11}$/.test(item.id?.videoId || '')).map(item => ({videoId:item.id.videoId,title:item.snippet?.title || 'YouTube music',artist:item.snippet?.channelTitle || 'YouTube',thumbnail:item.snippet?.thumbnails?.default?.url || ''}));
    if (cache.size >= 100) cache.delete(cache.keys().next().value);
    cache.set(q.toLowerCase(),{time:Date.now(),items});
    return items;
  };
}
