import { FileManager } from './fileManager.js';
import { createVideoCollectionReport } from '../utilities/videoCollectionReport.js';
import {
  deduplicateWithPriority,
  gatherVideoDataForArchival,
} from '../utilities/tools.js';
import { enrichVideosWithYouTubeData } from '../youtube/enrichVideoData.js';

export async function archivePlaylistVideos({
  playlists,
  channelobjid,
  dirName,
  listLabel = 'playlist',
}) {
  const report = createVideoCollectionReport();
  const fileManager = new FileManager('./data');
  const allPlaylistItems = [];

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
      }

      allPlaylistItems.push(archivalItem);
    }
  }

  allPlaylistItems.sort((a, b) =>
    (a.published > b.published) ? 1 : (a.published < b.published) ? -1 : 0
  );

  const dedupedResults = deduplicateWithPriority(allPlaylistItems, 'videoId');
  const duplicateRemovedCount = allPlaylistItems.length - dedupedResults.length;

  const duplicateReport = duplicateRemovedCount > 0
    ? buildDedupeDifferenceReport({
        originalItems: allPlaylistItems,
        dedupedItems: dedupedResults,
        key: 'videoId',
      })
    : null;


  const enrichedData = await enrichVideosWithYouTubeData(dedupedResults);

  enrichedData.sort((a, b) =>
    (a.sequence > b.sequence) ? 1 : (a.sequence < b.sequence) ? -1 : 0
  );

  await fileManager.writeJSON('videos.json', enrichedData, true, dirName);

  if (duplicateReport.removedCount > 0) {
    await fileManager.writeJSON('dedupe-difference.json', duplicateReport, true, dirName);

    console.log(
      `${duplicateReport.removedCount} duplicate playlist items removed during deduplication. ` +
      `See ${dirName}/dedupe-difference.json`
    );
  }

  if (report.hasSkippedItems()) {
    await fileManager.writeJSON('skipped-items.json', report.getSkippedItems(), true, dirName);
    await fileManager.writeJSON('skipped-summary.json', report.getSummary(), true, dirName);
  }

  return {
    allPlaylistItemCount: allPlaylistItems.length,
    dedupedCount: enrichedData.length,
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
    playlist: item.playlist,
    published: item.published,
    channelobjid: item.channelobjid,
    sequence: item.sequence,
  };
}
