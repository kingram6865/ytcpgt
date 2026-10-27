import 'dotenv/config'
import axios from 'axios'
import { formatPublishedDate, formatDuration } from '../utilities/tools.js'

const baseUrl = `https://youtube.googleapis.com/youtube/v3`
const videoId = process.argv[2]

async function gatherAPIData(id) {
  const videoUrl = `${baseUrl}/videos?part=snippet%2CcontentDetails%2Cstatistics&id=${encodeURIComponent(id)}&key=${process.env.API_KEY1}`;
  const result = await axios.get(videoUrl);
  const video = result.data?.items?.[0];
  if (!video) throw new Error(`No accessible video found for ID: ${id}`);
  return {
    UploadDate: formatPublishedDate(video.snippet.publishedAt),
    ChannelId: video.snippet.channelId,
    Title: video.snippet.title,
    Description: video.snippet.description,
    Thumbnails: JSON.stringify(video.snippet.thumbnails),
    Keywords: (video.snippet.tags) ? video.snippet.tags.join(",") : "",
    PlayLength: formatDuration(video.contentDetails.duration),
    VideoId: id
  };
}

gatherAPIData(videoId)
  .then(x => console.log(x))
  .catch(err => { // report request and validation failures at the CLI boundary.
    console.error(err.response?.data ?? err.message ?? err); // prefer YouTube's API error details when available.
    process.exitCode = 1; // make the command fail so scripts can detect the error.
  });
