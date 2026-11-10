import { playlistData, playlistItems, videoData, } from './getData.js';
import { fetchYtDlpPlaylist } from './ytDlpPlaylist.js';

const PLAYLIST_API_REASONS = new Set([
  'invalid',
  'invalidValue',
  'playlistForbidden',
  'playlistItemsNotAccessible',
  'playlistNotFound',
  'playlistOperationUnsupported',
]);

function isPlaylistApiUnavailable(error) {
  const errors = error.response?.data?.error?.errors ?? [];
  return errors.some(({ reason }) => PLAYLIST_API_REASONS.has(reason));
}

async function fetchApiResult(fetch, fallbackValue, apiErrors) {
  try {
    return await fetch();
  } catch (error) {
    if (!isPlaylistApiUnavailable(error)) throw error;
    apiErrors.push(error);
    return fallbackValue;
  }
}

async function addMissingUploaderIds(items) {
  const missingVideoIds = items
    .filter(item => !item.snippet?.videoOwnerChannelId)
    .map(item => item.snippet?.resourceId?.videoId)
    .filter(Boolean);

  const uploaderByVideoId = new Map();

  for (let index = 0; index < missingVideoIds.length; index += 50) {
    const batch = missingVideoIds.slice(index, index + 50);
    const response = await videoData(batch);

    for (const video of response.items ?? []) {
      if (video.snippet?.channelId) {
        uploaderByVideoId.set(video.id, video.snippet.channelId);
      }
    }
  }

  return items.map(item => {
    const videoId = item.snippet?.resourceId?.videoId;
    const videoOwnerChannelId =
      item.snippet?.videoOwnerChannelId ??
      uploaderByVideoId.get(videoId);

    if (!videoId) {
      throw new Error('Playlist item has no video ID.');
    }

    if (!videoOwnerChannelId) {
      throw new Error(`Uploader channel not found for playlist video: ${videoId}`);
    }

    return {
      ...item,
      snippet: {
        ...item.snippet,
        videoOwnerChannelId,
      },
    };
  });
}

export async function loadPlaylist({ playlistId, sourceUrl, onProgress }) {
  const apiErrors = [];
  onProgress?.(`Looking up playlist ${playlistId}...`);

  const playlistResponse = await fetchApiResult(
    () => playlistData(playlistId),
    { items: [] },
    apiErrors
  );

  const playlist = playlistResponse?.items?.[0] ?? null;

  let items = await fetchApiResult(
    () => playlistItems(playlistId, onProgress),
    [],
    apiErrors
  );

  if (items.length > 0) {
    const playlistOwnerChannelId = playlist?.snippet?.channelId ?? null;

    if (!playlistOwnerChannelId) {
      items = await addMissingUploaderIds(items);
    }

    return {
      playlist,
      playlistId,
      title: playlist?.snippet?.title ?? playlistId,
      publishedAt: playlist?.snippet?.publishedAt ?? null,
      playlistOwnerChannelId,
      items,
      source: 'youtube-data-api',
    };
  }

  onProgress?.(`Data API returned no items; trying the YouTube page extractor for ${playlistId}...`);

  try {
    const extractedPlaylist = await fetchYtDlpPlaylist({ playlistId, sourceUrl });
    items = extractedPlaylist.items;

    const playlistOwnerChannelId = playlist?.snippet?.channelId ?? null;

    if (!playlistOwnerChannelId) {
      items = await addMissingUploaderIds(items);
    }

    return {
      playlist,
      playlistId,
      title: playlist?.snippet?.title ?? extractedPlaylist.title ?? playlistId,
      publishedAt: playlist?.snippet?.publishedAt ?? null,
      playlistOwnerChannelId,
      items,
      source: 'yt-dlp',
    };
  } catch (error) {
    const apiFailure = apiErrors
      .map(apiError => apiError.response?.data?.error?.message)
      .filter(Boolean)
      .join('; ');
    const apiDetail = apiFailure ? ` Data API: ${apiFailure}.` : '';

    throw new Error(
      `No playlist items could be retrieved for ${playlistId}.${apiDetail} ` +
      `yt-dlp: ${error.message}`,
      { cause: error }
    );
  }
}
