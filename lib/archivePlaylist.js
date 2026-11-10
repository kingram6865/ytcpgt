import chalk from 'chalk';
import { loadPlaylist } from '../youtube/loadPlaylist.js';
import { normalizeArchiveDirectoryName } from './archiveNames.js';
import { archivePlaylistVideos } from './archiveVideos.js';
import { ensureChannelArchiveInfo } from './channelArchiveInfo.js';

export async function archivePlaylist(
  playlistId,
  { source, database, onProgress, sourceUrl  }) {
  onProgress?.(`Looking up playlist ${playlistId}...`);

  const loadedPlaylist = await loadPlaylist({
    playlistId,
    sourceUrl,
    onProgress,
  });

  const {
    title: playlistTitle,
    publishedAt,
    playlistOwnerChannelId,
    items,
  } = loadedPlaylist;

  let channelobjid = null;
  let channelobjidByVideoId = null;
  let dirName;

  if (playlistOwnerChannelId) {
    onProgress?.(`Checking the playlist owner channel ${playlistOwnerChannelId}...`);

    const ownerInfo = await ensureChannelArchiveInfo(
      playlistOwnerChannelId,
      source,
      database
    );

    channelobjid = ownerInfo.channelobjid;

    dirName = normalizeArchiveDirectoryName(
      `${ownerInfo.chanName}_${playlistTitle}`
    );

    console.log(chalk.ansi256(184)(`objid: ${channelobjid}, Channel Id: ${ownerInfo.apiChannelId}, Channel Owner: ${ownerInfo.chanName}`));
  } else {
    const ownerChannelIds = [
      ...new Set(items.map(item => item.snippet.videoOwnerChannelId)),
    ];

    const ownerInfoByChannelId = new Map();
    for (const ownerChannelId of ownerChannelIds) {
      const ownerInfo = await ensureChannelArchiveInfo(
        ownerChannelId,
        source,
        database
      );

      ownerInfoByChannelId.set(ownerChannelId, ownerInfo);
    }

    channelobjidByVideoId = new Map(
      items.map(item => {
        const videoId = item.snippet.resourceId.videoId;
        const ownerChannelId = item.snippet.videoOwnerChannelId;
        return [videoId, ownerInfoByChannelId.get(ownerChannelId).channelobjid];
      })
    );

    dirName = normalizeArchiveDirectoryName(`${playlistTitle}_${playlistId}`);
    onProgress?.(`Assigning ${items.length} items to their video owner channels...`);
  }

  console.log(chalk.ansi256(118)(`Playlist: ${playlistTitle} (${playlistId}) — ${items.length} items`));

  const result = await archivePlaylistVideos({
    playlists: [{
      id: playlistId,
      title: playlistTitle,
      publishedAt,
      items,
    }],
    channelobjid,
    channelobjidByVideoId,
    dirName,
    listLabel: 'playlist',
    onProgress,
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
