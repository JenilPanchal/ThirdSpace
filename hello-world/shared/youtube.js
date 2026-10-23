// Accept video links only; never pass arbitrary user URLs to the embedded player.
function youtubeId(value) {
  const input = String(value || '').trim();
  if (/^[\w-]{11}$/.test(input)) return input;
  const link = input.match(/^https?:\/\/(?:www\.|m\.|music\.)?(youtube\.com|youtube-nocookie\.com|youtu\.be)\/([^\s]*)$/i);
  if (!link) return null;
  const path = link[2];
  const candidate = link[1].toLowerCase() === 'youtu.be'
    ? path.split(/[?&#/]/)[0]
    : path.startsWith('watch?')
      ? (path.match(/[?&]v=([\w-]+)(?:[&#]|$)/) || [])[1]
      : (path.match(/^(?:embed|shorts|live)\/([\w-]+)(?:[?&#/]|$)/) || [])[1];
  return candidate && /^[\w-]{11}$/.test(candidate) ? candidate : null;
}
module.exports = {youtubeId};
