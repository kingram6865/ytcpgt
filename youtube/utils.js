export function parseYouTubeUrl(input) {
  const url = new URL(input);

  // 1. Video page: /watch?v=VIDEO_ID
  if (url.pathname === '/watch') {
    const videoId = url.searchParams.get('v');
    return videoId
      ? { type: 'video', videoId }
      : null;
  }

  // 2. Channel handle: /@handle
  if (url.pathname.startsWith('/@')) {
    return {
      type: 'channel-handle',
      handle: url.pathname.slice(1) // remove leading "/"
    };
  }

  // 3. Legacy channel ID: /channel/UCxxxx
  if (url.pathname.startsWith('/channel/')) {
    return {
      type: 'channel-id',
      channelId: url.pathname.split('/')[2]
    };
  }

  // 4. Playlist: /playlist?list=PLAYLIST_ID
  if (url.pathname === '/playlist') {
    const playlistId = url.searchParams.get('list');
    return playlistId
      ? { type: 'playlist', playlistId }
      : null;
  }

  return null;
}
