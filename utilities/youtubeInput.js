const PLAYLIST_ID_PATTERN = /^[A-Za-z0-9_-]{10,}$/;
const CHANNEL_ID_PATTERN = /^UC[A-Za-z0-9_-]{20,}$/;

function parseYouTubeWebUrl(value) {
  try {
    const url = new URL(value);
    const isYouTubeHost = url.hostname === 'youtube.com' ||
      url.hostname.endsWith('.youtube.com') ||
      url.hostname === 'youtu.be';

    if (!['http:', 'https:'].includes(url.protocol) || !isYouTubeHost) return null;
    return url;
  } catch {
    return null;
  }
}

export function normalizeCliInput(input) {
  return (input ?? '').trim().replace(/^['"]+|['"]+$/g, '');
}

export function extractPlaylistId(input) {
  const value = normalizeCliInput(input);
  if (!value) return null;

  const url = parseYouTubeWebUrl(value);

  if (url) {
    const playlistId = url.searchParams.get('list');
    return PLAYLIST_ID_PATTERN.test(playlistId ?? '') ? playlistId : null;
  }

  if (CHANNEL_ID_PATTERN.test(value)) return null;
  return PLAYLIST_ID_PATTERN.test(value) ? value : null;
}

export function extractChannelId(input) {
  const value = normalizeCliInput(input);
  if (!value) return null;

  if (CHANNEL_ID_PATTERN.test(value)) return value;

  const url = parseYouTubeWebUrl(value);
  if (!url) return null;
  const parts = url.pathname.split('/').filter(Boolean);

  if (parts[0] === 'channel' && CHANNEL_ID_PATTERN.test(parts[1] ?? '')) {
    return parts[1];
  }

  return null;
}

export function extractHandle(input) {
  const value = normalizeCliInput(input);
  if (!value) return null;

  if (value.startsWith('@')) return value.length > 1 ? value : null;

  const url = parseYouTubeWebUrl(value);
  if (!url) return null;
  const handle = url.pathname.split('/').filter(Boolean)[0];
  return handle?.startsWith('@') && handle.length > 1 ? handle : null;
}

export function resolveStartInput(input) {
  const value = normalizeCliInput(input);

  if (!value) {
    return { type: 'missing', value };
  }

  const playlistId = extractPlaylistId(value);
  if (playlistId) {
    const playlistUrl = parseYouTubeWebUrl(value);

    return {
      type: 'playlist',
      playlistId,
      value,
      sourceUrl: playlistUrl ? value : null,
    };
  }

  const handle = extractHandle(value);
  if (handle) {
    return { type: 'channel-handle', handle, value };
  }

  const channelId = extractChannelId(value);
  if (channelId) {
    return { type: 'channel', channelId, value };
  }

  throw new Error(`Unsupported YouTube input: ${value}`);
}
