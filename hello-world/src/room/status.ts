// Keep host configuration and transport diagnostics out of the living-room UI.
export function roomStatus(message: string) {
  if (/YOUTUBE_API_KEY|api key|quota|not configured/i.test(message)) {
    return 'Search is taking a break. Paste a YouTube link to keep the music going.';
  }
  if (
    /abort|network|fetch|server|connection|connect|transport|timeout/i.test(
      message,
    )
  ) {
    return 'We couldn’t connect just now. Try again in a moment.';
  }
  if (/player origin|error code|153|embedding|sign.in/i.test(message)) {
    return 'This video can’t play here. Try another YouTube link.';
  }
  return message;
}
