import chalk from 'chalk';
import { playlistData, playlistItems } from '../youtube/getData.js';
import { normalizeArchiveDirectoryName } from './archiveNames.js';
import { archivePlaylistVideos } from './archiveVideos.js';
import { ensureChannelArchiveInfo } from './channelArchiveInfo.js';

export async function archivePlaylist(playlistId, { source, database, onProgress }) {
  onProgress?.(`Looking up playlist ${playlistId}...`);
  const playlistApiData = await playlistData(playlistId);
  const playlist = playlistApiData?.items?.[0];

  if (!playlist) {
    throw new Error(`Playlist not found: ${playlistId}`);
  }

  const playlistTitle = playlist.snippet?.title ?? playlistId;
  const ownerChannelId = playlist.snippet?.channelId;

  if (!ownerChannelId) {
    throw new Error(`Playlist owner channel not found for playlist: ${playlistId}`);
  }

  onProgress?.(`Checking the playlist owner channel ${ownerChannelId}...`);
  const { channelobjid, apiChannelId, chanName } =
    await ensureChannelArchiveInfo(ownerChannelId, source, database);

  const items = await playlistItems(playlistId, onProgress);
  const dirName = normalizeArchiveDirectoryName(`${chanName}_${playlistTitle}`);

  console.log(chalk.ansi256(184)(
    `objid: ${channelobjid}, Channel Id: ${apiChannelId}, Channel Owner: ${chanName}`
  ));

  console.log(chalk.ansi256(118)(
    `Playlist: ${playlistTitle} (${playlistId}) — ${items.length} items`
  ));

  const result = await archivePlaylistVideos({
    playlists: [{
      id: playlistId,
      title: playlistTitle,
      publishedAt: playlist.snippet?.publishedAt,
      items,
    }],
    channelobjid,
    dirName,
    listLabel: 'playlist',
  });

  console.log(
    `${chalk.ansi256(226)(result.fetchedItemCount)} fetched items from ` +
    `${chalk.ansi256(226)(playlistTitle)}; ` +
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
