export function createVideoCollectionReport() {
  const skippedItems = [];

  function addSkippedItem(reason, item, context = {}) {
    const videoId =
      item?.snippet?.resourceId?.videoId ??
      item?.contentDetails?.videoId ??
      null;

    skippedItems.push({
      reason,
      videoId,
      title: item?.snippet?.title ?? null,
      playlistId: item?.snippet?.playlistId ?? context.playlistId ?? null,
      playlistTitle: context.playlistTitle ?? null,
      position: item?.snippet?.position ?? null,
      privacyStatus: item?.status?.privacyStatus ?? null,
      itemId: item?.id ?? null,
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
