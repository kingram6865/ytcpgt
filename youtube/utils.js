const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/; // ADDED: recognize the bare video IDs accepted by the documented CLI.
const CHANNEL_ID_PATTERN = /^UC[A-Za-z0-9_-]{20,}$/; // ADDED: apply the repository's channel ID format to parsed URLs.
const PLAYLIST_ID_PATTERN = /^(PL|UU|LL|FL|RD|OLAK5uy_)[A-Za-z0-9_-]+$/; // ADDED: apply the same playlist ID format used by the CLI input parser.

export function parseYouTubeUrl(input) {
  const value = (input ?? '').trim().replace(/^['"]+|['"]+$/g, ''); // CHANGED: normalize whitespace and surrounding quotes like normalizeCliInput().
  if (VIDEO_ID_PATTERN.test(value ?? '')) { // ADDED: handle raw YouTube video IDs without passing them to `new URL()`.
    return { type: 'video', videoId: value }; // ADDED
  }

  let url; // ADDED: hold the parsed URL so malformed input can return the parser's documented `null` result.
  try {
    url = new URL(value); // CHANGED: parse the normalized value after excluding a valid bare video ID.
  } catch {
    return null; // ADDED: let the caller report unsupported or malformed input consistently.
  }

  if (!['http:', 'https:'].includes(url.protocol) || // ADDED: accept only web URLs served over HTTP or HTTPS.
      !(url.hostname === 'youtube.com' || url.hostname.endsWith('.youtube.com') || url.hostname === 'youtu.be')) { // CHANGED: accept YouTube short links while rejecting unrelated hosts.
    return null; // ADDED: leave unsupported hosts and protocols unclassified.
  }

  const { pathname, searchParams } = url;
  const playlistId = searchParams.get('list'); // ADDED: read a playlist ID once for consistent validation across YouTube URL forms.
  const validPlaylistId = PLAYLIST_ID_PATTERN.test(playlistId ?? '') ? playlistId : null; // ADDED: reject malformed playlist IDs like the CLI parser does.

  if (url.hostname === 'youtu.be') { // ADDED: parse YouTube's short-link path as a video ID.
    const pathSegments = pathname.split('/').filter(Boolean); // ADDED: remove leading or trailing slashes before checking the path.
    const videoId = pathSegments[0]; // ADDED: read the ID from the sole short-link path segment.
    if (pathSegments.length !== 1 || !VIDEO_ID_PATTERN.test(videoId ?? '')) return null; // CHANGED: reject extra path segments and malformed video IDs.
    return validPlaylistId // ADDED: preserve the playlist context from short links when YouTube includes it.
      ? { type: 'video-playlist', videoId, playlistId: validPlaylistId, index: searchParams.get('index') ? Number(searchParams.get('index')) : null } // ADDED
      : { type: 'video', videoId }; // CHANGED: return the same video result shape as /watch?v= links.
  }

  // 1. Video page: /watch?v=VIDEO_ID
  if (url.pathname === '/watch') {
    // const videoId = url.searchParams.get('v');
    // return videoId
    //   ? { type: 'video', videoId }
    //   : null;
    const videoId = searchParams.get('v');
    const index = searchParams.get('index');
    if (videoId && !VIDEO_ID_PATTERN.test(videoId)) return null; // ADDED: reject malformed IDs in watch URLs before returning a video type.

    // Video inside a playlist
    if (videoId && validPlaylistId) { // CHANGED: include playlist context only when its ID matches the shared format.
      return {
        type: 'video-playlist',
        videoId,
        playlistId: validPlaylistId, // CHANGED: return the validated playlist ID.
        index: index ? Number(index) : null
      };
    }

    // Plain video
    if (videoId) {
      return {
        type: 'video',
        videoId
      };
    }

    return validPlaylistId // ADDED: recognize a playlist link when a valid list ID is present without a video ID.
      ? { type: 'playlist', playlistId: validPlaylistId } // ADDED
      : null; // CHANGED
  }

  if (url.pathname === '/playlist') { // CHANGED: handle the standard playlist path before the general list-parameter case.
    return validPlaylistId
      ? { type: 'playlist', playlistId: validPlaylistId } // CHANGED: return only a validated playlist ID.
      : null;
  }

  if (validPlaylistId) return { type: 'playlist', playlistId: validPlaylistId }; // ADDED: match the CLI parser's handling of valid list IDs on other YouTube URLs.

  // 2. Channel handle: /@handle
  if (url.pathname.startsWith('/@')) {
    const handle = pathname.split('/').filter(Boolean)[0]; // CHANGED: take only the first path segment, ignoring `/videos` or other channel tabs.
    if (!handle || handle.length === 1) return null; // CHANGED: reject `/@` because it contains no handle name.
    return {
      type: 'channel-handle',
      handle // CHANGED: return the validated nonempty handle.
    };
  }

  // 3. Legacy channel ID: /channel/UCxxxx
  if (url.pathname.startsWith('/channel/')) {
    const channelId = url.pathname.split('/')[2]; // ADDED: read the channel ID from the URL path.
    if (!CHANNEL_ID_PATTERN.test(channelId ?? '')) return null; // ADDED: reject missing or malformed channel IDs before returning a channel type.
    return {
      type: 'channel-id',
      channelId // CHANGED: return the validated channel ID.
    };
  }

  return null;
}
