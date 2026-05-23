import { fetchVideoDetails } from "./getData.js";
import { formatDuration, extractVideoId } from "../utilities/tools.js";

/**
 * Enriches array of video objects with keywords and duration from YouTube API
 * @param {Array} videos - Array of video objects with url field containing v= parameter
 * @param {string} apiKey - YouTube Data API v3 key
 * @param {number} batchSize - Batch size for API calls (max 50 per YouTube API)
 * @returns {Promise<Array>} - Enriched videos array
 */
export async function enrichVideosWithYouTubeData(videos) {
  const batchSize = 50;
  if (!videos || videos.length === 0) return videos;

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

  // Process in batches
  for (let i = 0; i < videosWithIds.length; i += batchSize) {
    const batch = videosWithIds.slice(i, i + batchSize);
    const videoIds = batch.map(v => v._videoId);

    try {
      const videoDetails = await fetchVideoDetails(videoIds);

      // Map results back to original positions
      batch.forEach(video => {
        const details = videoDetails[video._videoId];
        if (details) {
          enrichedVideos[video._originalIndex] = {
            ...enrichedVideos[video._originalIndex],
            keywords: details.tags || null,
            duration: formatDuration(details.duration).default || null
          };
        }
      });
    } catch (error) {
      console.error(`Batch failed for IDs: ${videoIds.join(', ')}`, error);
      // Continue with other batches, leave failed ones with null values
    }
  }

  // Clean up temporary properties
  return enrichedVideos.map(({ _videoId, _originalIndex, ...rest }) => rest);
}
