import chalk from 'chalk';
import { channelPlaylists, getChannelUploads, playlistData, playlistItems } from '../youtube/getData.js';
import { formatPublishedDate } from '../utilities/tools.js';
import { normalizeArchiveDirectoryName } from './archiveNames.js';
import { archivePlaylistVideos } from './archiveVideos.js';
import { ensureChannelArchiveInfo } from './channelArchiveInfo.js';

export async function archiveChannel(channelId, { source, database, onProgress }) {
  onProgress?.(`Checking channel ${channelId}...`);
  const { channelobjid, apiChannelId, chanName, apiChannelData } =
    await ensureChannelArchiveInfo(channelId, source, database);

  if (apiChannelData) console.log(apiChannelData);

  console.log(chalk.ansi256(184)(
    `objid: ${channelobjid}, Channel Id: ${apiChannelId}, Channel Owner: ${chanName}`
  ));

  onProgress?.(`Fetching playlists for ${chanName}...`);
  const apiPlaylists = await channelPlaylists(apiChannelId);

  apiPlaylists.sort((a, b) =>
    (a.snippet.publishedAt > b.snippet.publishedAt) ? 1 :
      (a.snippet.publishedAt < b.snippet.publishedAt) ? -1 : 0
  );

  onProgress?.(`Fetching uploads for ${chanName}...`);
  const uploadItems = await getChannelUploads(apiChannelId, onProgress);
  if (uploadItems.length > 0) {
    const uploadPlaylistId = uploadItems[0]?.snippet?.playlistId; // ADDED: read the official uploads playlist ID from its returned items.
    if (uploadPlaylistId) onProgress?.(`Looking up uploads playlist ${uploadPlaylistId}...`); // ADDED: report before retrieving the uploads playlist publication metadata.
    const uploadPlaylistData = uploadPlaylistId ? await playlistData(uploadPlaylistId) : null; // ADDED: retrieve the actual playlist metadata when YouTube provides an ID.
    const uploadPlaylistPublishedAt = uploadPlaylistData?.items?.[0]?.snippet?.publishedAt ?? null; // ADDED: use YouTube's playlist publication date, if available.

    apiPlaylists.push({
      id: uploadItems[0]?.snippet?.playlistId ?? 'uploads',
      snippet: {
        title: 'Uploads',
        publishedAt: uploadPlaylistPublishedAt,
      },
      status: {
        privacyStatus: 'public',
      },
      items: uploadItems,
    });
  }

  const playlists = [];

  for (let i = 0; i < apiPlaylists.length; i++) {
    const playlist = apiPlaylists[i];
    let items;

    if (playlist.items) {
      items = playlist.items;
      onProgress?.(`Using ${items.length} previously fetched items for playlist "${playlist.snippet.title}".`);
    } else {
      onProgress?.(`Fetching playlist ${i + 1}/${apiPlaylists.length}: ${playlist.snippet.title}...`);
      items = await playlistItems(playlist.id, onProgress);
    }

    if (!Array.isArray(items) || items.length === 0) continue;

    const id = chalk.ansi256(33)(
      `[${i.toString().padStart(3, ' ')}]`,
      playlist.id.padStart(35, ' ')
    );

    const title = chalk.ansi256(118)(playlist.snippet.title);
    const childrenCount = chalk.ansi256(226)(items.length.toString().padStart(3, ' '));
    const published = playlist.snippet?.publishedAt
      ? chalk.ansi256(206)(formatPublishedDate(playlist.snippet.publishedAt))
      : chalk.ansi256(206)('N/A');

    console.log(`${id} ${published} (${childrenCount}) ${title}`);

    playlists.push({
      id: playlist.id,
      title: playlist.snippet.title,
      publishedAt: playlist.snippet.publishedAt,
      items,
    });
  }

  const dirName = normalizeArchiveDirectoryName(chanName);

  const result = await archivePlaylistVideos({
    playlists,
    channelobjid,
    dirName,
    listLabel: 'channel playlists',
    onProgress,
  });

  console.log(
    `${chalk.ansi256(226)(result.fetchedItemCount)} fetched items from ` +
    `${chalk.ansi256(226)(result.playlistCount)} playlists; ` +
    `${result.skippedItemCount} skipped, ` +
    `${result.retainedItemCount} retained before deduplication, ` +
    `${result.deduplicatedItemCount} unique after deduplication, ` +
    `${result.duplicateRemovedCount} duplicate occurrences removed, ` +
    `${result.archivedVideoCount} complete videos saved to ` +
    `${chalk.ansi256(190)(result.outputFile)}`
  );

  if (Object.keys(result.skippedSummary).length > 0) {
    console.log('Skipped item summary:', result.skippedSummary);
  }

  return result;
}
