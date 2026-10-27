import { fetchVideoDetails } from "./getData.js";
import { formatDuration, extractVideoId } from "../utilities/tools.js";

/**
 * Enriches array of video objects with keywords and duration from YouTube API
 * @param {Array} videos - Array of video objects with url field containing v= parameter
 * @param {string} apiKey - YouTube Data API v3 key
 * @param {number} batchSize - Batch size for API calls (max 50 per YouTube API)
 * @returns {Promise<Object>} - Complete videos and entries with missing detail metadata
 */
export async function enrichVideosWithYouTubeData(videos, onProgress = null) {
  const batchSize = 50;
   if (!videos || videos.length === 0) return { videos: videos ?? [], missingDetails: [] };

  // Extract video IDs while preserving original index
  const videosWithIds = videos.map((video, index) => {
    const videoId = extractVideoId(video.url);
    return {
      ...video,
      _videoId: videoId,
      _originalIndex: index
    };
  }).filter(v => v._videoId); // Filter out invalid URLs

  // Prepare result array (preserve original order)
  const enrichedVideos = [...videos];
  const missingDetails = [];
  const missingDetailIndexes = new Set();

  // Process in batches
  for (let i = 0; i < videosWithIds.length; i += batchSize) {
    const batch = videosWithIds.slice(i, i + batchSize);
    const videoIds = batch.map(v => v._videoId);

    try {
      const videoDetails = await fetchVideoDetails(videoIds);

      // Map results back to original positions
      batch.forEach(video => {
        const details = videoDetails[video._videoId];
        const missingFields = [];
        if (!details) missingFields.push('video-details');
        else if (!details.duration) missingFields.push('duration');

        if (missingFields.length > 0) {
          missingDetailIndexes.add(video._originalIndex);
          missingDetails.push({
            ...enrichedVideos[video._originalIndex],
            missingFields,
          });
          return;
        }

        enrichedVideos[video._originalIndex] = {
          ...enrichedVideos[video._originalIndex],
          keywords: details.tags || null,
          duration: formatDuration(details.duration).default || null
        };
      });
      onProgress?.(`Video details: completed ${Math.min(i + batch.length, videosWithIds.length)} of ${videosWithIds.length} videos.`);
    } catch (error) {
      console.error(`Batch failed for IDs: ${videoIds.join(', ')}`, error);
      throw error;
    }
  }

  // Clean up temporary properties
  // return enrichedVideos.map(({ _videoId, _originalIndex, ...rest }) => rest);
  return {
    videos: enrichedVideos
      .filter((video, index) => !missingDetailIndexes.has(index))
      .map(({ _videoId, _originalIndex, ...rest }) => rest),
    missingDetails: missingDetails.map(({ _videoId, _originalIndex, ...rest }) => rest),
  };
}
