import { FileManager } from './fileManager.js';
import { createVideoCollectionReport } from '../utilities/videoCollectionReport.js';
import { deduplicateWithPriority, gatherVideoDataForArchival, } from '../utilities/tools.js';
import { enrichVideosWithYouTubeData } from '../youtube/enrichVideoData.js';

export async function archivePlaylistVideos({
  playlists,
  channelobjid,
  dirName,
  listLabel = 'playlist',
  onProgress = null,
}) {
  const report = createVideoCollectionReport();
  const fileManager = new FileManager('./data');
  const allPlaylistItems = [];
  const fetchedItemCount = playlists.reduce((total, playlist) => total + (Array.isArray(playlist.items) ? playlist.items.length : 0), 0);
  const playlistOrderById = new Map(playlists.map((playlist, index) => [playlist.id, index]));

  for (const playlist of playlists) {
    const { id: playlistId, title: playlistTitle, items } = playlist;

    if (!Array.isArray(items) || items.length === 0) continue;

    for (const item of items) {
      const playlistContext = { playlistId, playlistTitle };
      const privacyStatus = item?.status?.privacyStatus;

      const archivalItem = gatherVideoDataForArchival(
        item,
        channelobjid,
        playlistTitle
      );

      if (!archivalItem?.videoId) {
        report.addSkippedItem('missing-videoId', item, playlistContext);
        continue;
      }

      if (privacyStatus === 'private') {
        report.addSkippedItem('private-but-has-videoId', item, playlistContext);
        continue;
      }

      allPlaylistItems.push(archivalItem);
    }
  }

  const dedupedResults = deduplicateWithPriority(allPlaylistItems, 'videoId');
  const duplicateRemovedCount = allPlaylistItems.length - dedupedResults.length;

  const duplicateReport = duplicateRemovedCount > 0
    ? buildDedupeDifferenceReport({
        originalItems: allPlaylistItems,
        dedupedItems: dedupedResults,
        key: 'videoId',
      })
    : { removedCount: 0 };

  onProgress?.(`Checking YouTube details for ${dedupedResults.length} unique videos...`);
  const { videos: enrichedData, missingDetails } = await enrichVideosWithYouTubeData(dedupedResults);

  for (const item of missingDetails) {
    report.addSkippedItem('missing-video-metadata', item, {
      missingFields: item.missingFields,
    });
  }

  enrichedData.sort((a, b) => comparePlaylistOrder(a, b, playlistOrderById));

  await fileManager.writeJSON('videos.json', enrichedData, true, dirName);

  if (duplicateReport.removedCount > 0) {
    await fileManager.writeJSON('dedupe-difference.json', duplicateReport, true, dirName);

    console.log(
      `${duplicateReport.removedCount} duplicate playlist items removed during deduplication. ` +
      `See ${dirName}/dedupe-difference.json`
    );
  } else {
    await fileManager.removeFile('dedupe-difference.json', dirName);
  }

  if (report.hasSkippedItems()) {
    await fileManager.writeJSON('skipped-items.json', report.getSkippedItems(), true, dirName);
    await fileManager.writeJSON('skipped-summary.json', report.getSummary(), true, dirName);
  } else {
    await Promise.all([ // clear stale skipped-item reports when the current run has no skipped items.
      fileManager.removeFile('skipped-items.json', dirName),
      fileManager.removeFile('skipped-summary.json', dirName),
    ]);
  }

  onProgress?.(`Finished writing archive files to ${dirName}.`);

  return {
    allPlaylistItemCount: allPlaylistItems.length,
    dedupedCount: enrichedData.length,
    fetchedItemCount,
    skippedItemCount: report.getSkippedItems().length,
    retainedItemCount: allPlaylistItems.length,
    deduplicatedItemCount: dedupedResults.length,
    archivedVideoCount: enrichedData.length,
    missingMetadataCount: missingDetails.length,
    duplicateRemovedCount: duplicateReport.removedCount,
    duplicateReportFile: duplicateReport.removedCount > 0
      ? `${dirName}/dedupe-difference.json`
      : null,
    playlistCount: playlists.length,
    skippedSummary: report.getSummary(),
    outputFile: `${dirName}/videos.json`,
    listLabel,
  };
}

function comparePlaylistOrder(a, b, playlistOrderById) { // ADDED: compare entries within their source playlist groups.
  const playlistOrderA = playlistOrderById.get(a.playlistid) ?? Number.MAX_SAFE_INTEGER; // ADDED: place entries with unknown playlists after known playlists.
  const playlistOrderB = playlistOrderById.get(b.playlistid) ?? Number.MAX_SAFE_INTEGER; // ADDED: place entries with unknown playlists after known playlists.

  if (playlistOrderA !== playlistOrderB) return playlistOrderA - playlistOrderB; // ADDED: keep playlists in their input order.

  const sequenceA = Number.isFinite(a.sequence) ? a.sequence : Number.MAX_SAFE_INTEGER; // ADDED: place entries without a numeric position after positioned entries.
  const sequenceB = Number.isFinite(b.sequence) ? b.sequence : Number.MAX_SAFE_INTEGER; // ADDED: place entries without a numeric position after positioned entries.

  return sequenceA - sequenceB; // ADDED: keep each playlist's own item order.
}

function buildDedupeDifferenceReport({ originalItems, dedupedItems, key }) {
  const keptIds = new Set(dedupedItems.map(item => item?.[key]).filter(Boolean));
  const groups = groupItemsByKey(originalItems, key);

  const duplicateGroups = [];
  const removedItems = [];

  for (const [value, items] of groups.entries()) {
    if (!value || items.length <= 1) continue;

    const keptItem = findKeptItem(items, dedupedItems, key);
    const removed = removeSingleKeptItem(items, keptItem);

    duplicateGroups.push({
      [key]: value,
      totalOccurrences: items.length,
      kept: simplifyDedupeItem(keptItem),
      removed: removed.map(simplifyDedupeItem),
    });

    removedItems.push(...removed.map(item => ({
      [key]: value,
      ...simplifyDedupeItem(item),
    })));
  }

  return {
    originalCount: originalItems.length,
    dedupedCount: dedupedItems.length,
    removedCount: originalItems.length - dedupedItems.length,
    duplicateVideoCount: duplicateGroups.length,
    removedItems,
    duplicateGroups,
  };
}

function groupItemsByKey(items, key) {
  const groups = new Map();

  for (const item of items) {
    const value = item?.[key];

    if (!groups.has(value)) {
      groups.set(value, []);
    }

    groups.get(value).push(item);
  }

  return groups;
}

function findKeptItem(originalGroup, dedupedItems, key) {
  const groupKey = originalGroup[0]?.[key];

  return dedupedItems.find(item => item?.[key] === groupKey) ?? originalGroup[0];
}

function removeSingleKeptItem(items, keptItem) {
  let removedKept = false;

  return items.filter(item => {
    if (!removedKept && item === keptItem) {
      removedKept = true;
      return false;
    }

    if (!removedKept && item?.videoId === keptItem?.videoId) {
      removedKept = true;
      return false;
    }

    return true;
  });
}

function simplifyDedupeItem(item) {
  if (!item) return null;

  return {
    videoId: item.videoId,
    title: item.title,
    playlist: item.playlistTitle,
    published: item.published,
    channelobjid: item.chanId,
    sequence: item.sequence,
  };
}
