import 'dotenv/config';
const APIKEY = process.env.API_KEY2;

/**
 * Fetch video details from YouTube API
 * @param {Array<string>} videoIds - Array of video IDs (max 50)
 * @param {string} apiKey - YouTube API key
 * @returns {Promise<Object>} - Object mapping videoId to details
 */
export async function fetchVideoDetails(videoIds) {
  const idsParam = videoIds.join(',');
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${idsParam}&key=${APIKEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Create mapping: videoId -> { tags, duration }
  const result = {};

  if (data.items && Array.isArray(data.items)) {
    data.items.forEach(item => {
      result[item.id] = {
        tags: item.snippet?.tags?.join(",") || [],
        duration: item.contentDetails.duration
      };
    });
  }

  return result;
}
