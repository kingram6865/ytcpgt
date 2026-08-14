// This should be renamed inputNormalizer

const PLAYLIST_ID_PATTERN = /^(PL|UU|LL|FL|RD|OLAK5uy_)[A-Za-z0-9_-]+$/;
const CHANNEL_ID_PATTERN = /^UC[A-Za-z0-9_-]{20,}$/;

export function normalizeCliInput(input) {
  return (input ?? '').trim().replace(/^['"]+|['"]+$/g, '');
}

export function extractPlaylistId(input) {
  const value = normalizeCliInput(input);
  if (!value) return null;

  if (PLAYLIST_ID_PATTERN.test(value)) return value;

  try {
    const url = new URL(value);
    return url.searchParams.get('list') || null;
  } catch {
    return null;
  }
}

export function extractChannelId(input) {
  const value = normalizeCliInput(input);
  if (!value) return null;

  if (CHANNEL_ID_PATTERN.test(value)) return value;

  try {
    const url = new URL(value);
    const parts = url.pathname.split('/').filter(Boolean);

    if (parts[0] === 'channel' && parts[1]) {
      return parts[1];
    }

    return null;
  } catch {
    return null;
  }
}

export function extractHandle(input) {
  const value = normalizeCliInput(input);
  if (!value) return null;

  if (value.startsWith('@')) return value;

  try {
    const url = new URL(value);
    const handle = url.pathname
      .split('/')
      .filter(Boolean)
      .find(part => part.startsWith('@'));

    return handle ?? null;
  } catch {
    return null;
  }
}

export function resolveStartInput(input) {
  const value = normalizeCliInput(input);

  if (!value) {
    return { type: 'missing', value };
  }

  const playlistId = extractPlaylistId(value);
  if (playlistId) {
    return { type: 'playlist', playlistId, value };
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
