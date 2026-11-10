/**
 * Isolate yt-dlp execution and playlist-item normalization.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function getPlaylistCachePath(playlistId) {
  const cacheDirectory = process.env.YT_DLP_PLAYLIST_CACHE_DIR ??
    resolve('.cache/yt-dlp-playlists');

  return join(cacheDirectory, `${playlistId}.json`);
}

function hasPlaylistEntries(raw) {
  return Array.isArray(raw?.entries) && raw.entries.some(entry => entry?.id);
}

async function readCachedPlaylist(playlistId) {
  try {
    const cachePath = getPlaylistCachePath(playlistId);
    const cachedRaw = JSON.parse(await readFile(cachePath, 'utf8'));

    return hasPlaylistEntries(cachedRaw) ? cachedRaw : null;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

// Write atomically so an interrupted process cannot leave a partial cache.
async function writeCachedPlaylist(playlistId, raw) {
  const cachePath = getPlaylistCachePath(playlistId);
  const cacheDirectory = resolve(cachePath, '..');
  const temporaryPath = `${cachePath}.${process.pid}.tmp`;

  await mkdir(cacheDirectory, { recursive: true });
  await writeFile(temporaryPath, JSON.stringify(raw), 'utf8');
  await rename(temporaryPath, cachePath);
}

export function normalizeYtDlpPlaylist(raw, playlistId) {
  // If yt-dlp returns only the linked video, preserve it as one item.
  const entries = hasPlaylistEntries(raw)
    ? raw.entries
    : raw?.id && raw.id !== playlistId
      ? [{ ...raw, playlist_index: 1 }]
      : [];

  const items = (raw.entries ?? [])
    .filter(entry => entry?.id)
    .map((entry, index) => {
      const position = Number.isInteger(entry.playlist_index)
        ? entry.playlist_index - 1
        : index;
      const videoPublishedAt = Number.isFinite(entry.release_timestamp)
        ? new Date(entry.release_timestamp * 1000).toISOString()
        : null;

      return {
        id: `${playlistId}:${position}:${entry.id}`,
        snippet: {
          playlistId,
          position,
          title: entry.title ?? null,
          description: entry.description ?? null,
          thumbnails: entry.thumbnails ?? null,
          videoOwnerChannelId: entry.channel_id ?? entry.uploader_id ?? null,
          videoOwnerChannelTitle: entry.channel ?? entry.uploader ?? null,
          resourceId: {
            kind: 'youtube#video',
            videoId: entry.id,
          },
        },
        contentDetails: {
          videoId: entry.id,
          ...(videoPublishedAt ? { videoPublishedAt } : {}),
        },
      };
    });

  return {
    title: raw.title ?? playlistId,
    items,
  }
}

/**
 * Invoke yt-dlp without loading user config or downloading video files.
 *
 * @param {*} param0
 * @returns
 */
export async function fetchYtDlpPlaylist({ playlistId, sourceUrl }) {
  const url = sourceUrl ?? `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`;
  const jsRuntimePath = process.env.YT_DLP_NODE_PATH;

  if (!jsRuntimePath) {
    throw new Error(
      'YT_DLP_NODE_PATH must point to a supported Node.js runtime for yt-dlp.'
    );
  }

  const ytdlpExecOptions = [
    // '--ignore-config',
    '--js-runtimes', `node:${jsRuntimePath}`,
    '--yes-playlist',
    '--flat-playlist',
    '--dump-single-json',
    '--skip-download',
    '--no-warnings',
    url,
  ]

  const ytdlpOtherOpts = { maxBuffer: 16 * 1024 * 1024 }
  let raw = null;
  let extractionError = null;

  try {
    const { stdout } = await execFileAsync(
      'yt-dlp',
      ytdlpExecOptions,
      ytdlpOtherOpts
    );
    raw = JSON.parse(stdout);
  } catch (error) {
    extractionError = error;
  }

  if (hasPlaylistEntries(raw)) {
    // [ADDED] Cache each successful playlist result before returning it.
    try {
      await writeCachedPlaylist(playlistId, raw);
    } catch (error) {
      console.warn(`Could not cache yt-dlp playlist ${playlistId}: ${error.message}`);
    }

    return normalizeYtDlpPlaylist(raw, playlistId);
  }

  const cachedRaw = await readCachedPlaylist(playlistId);
  if (cachedRaw) {
    console.warn(`Using cached yt-dlp playlist entries for ${playlistId}.`);
    return normalizeYtDlpPlaylist(cachedRaw, playlistId);
  }

  // [CHANGED] Preserve the linked video when no playlist result or cache exists.
  const partialPlaylist = raw?.id && raw.id !== playlistId
    ? normalizeYtDlpPlaylist(raw, playlistId)
    : null;

  if (partialPlaylist?.items.length > 0) {
    console.warn(
      `yt-dlp returned the linked video but no playlist entries for ${playlistId}; ` +
      'archiving that video only.'
    );
    return partialPlaylist;
  }

  if (extractionError) throw extractionError;

  throw new Error(`yt-dlp returned no entries for playlist: ${playlistId}`);

  // const { stdout } = await execFileAsync('yt-dlp', ytdlpExecOptions, ytdlpOtherOpts);
  // const playlist = normalizeYtDlpPlaylist(JSON.parse(stdout), playlistId);

  // if (playlist.items.length === 0) {
  //   throw new Error(`yt-dlp returned no entries for playlist: ${playlistId}`);
  // }

  // return playlist;
}
