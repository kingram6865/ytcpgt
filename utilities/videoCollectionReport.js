export function createVideoCollectionReport() {
  const skippedItems = [];

  function addSkippedItem(reason, item, context = {}) {
    const videoId =
      item?.snippet?.resourceId?.videoId ??
      item?.contentDetails?.videoId ??
      item?.videoId ??
      null;

    skippedItems.push({
      reason,
      videoId,
      title: item?.snippet?.title ?? item?.title ?? null,
      videoUrl: item?.url ?? (videoId ? `https://www.youtube.com/watch?v=${videoId}` : null),
      playlistId: item?.snippet?.playlistId ?? item?.playlistid ?? context.playlistId ?? null,
      playlistUrl: (item?.snippet?.playlistId ?? item?.playlistid ?? context.playlistId)
        ? `https://www.youtube.com/playlist?list=${item?.snippet?.playlistId ?? item?.playlistid ?? context.playlistId}`
        : null,
      playlistTitle: context.playlistTitle ?? item?.playlistTitle ?? null,
      playlistAddedAt: item?.playlistAddedAt ?? null,
      position: item?.snippet?.position ?? item?.sequence ?? null,
      privacyStatus: item?.status?.privacyStatus ?? null,
      itemId: item?.id ?? null,
      ...(context.missingFields ? { missingFields: context.missingFields } : {}),
    });
  }

  function getSkippedItems() {
    return [...skippedItems];
  }

  function getSummary() {
    return skippedItems.reduce((summary, item) => {
      summary[item.reason] = (summary[item.reason] ?? 0) + 1;
      return summary;
    }, {});
  }

  function hasSkippedItems() {
    return skippedItems.length > 0;
  }

  return {
    addSkippedItem,
    getSkippedItems,
    getSummary,
    hasSkippedItems,
  };
}
