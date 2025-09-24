import 'dotenv/config'
import axios from 'axios'
import { formatPublishedDate, formatDuration } from '../utilities/tools.js'

const baseUrl = `https://youtube.googleapis.com/youtube/v3`
const videoId = process.argv[2]

async function gatherAPIData(id) {
  const videoUrl = `${baseUrl}/videos?part=snippet%2CcontentDetails%2Cstatistics&id=${videoId}&key=${process.env.API_KEY1}`;
  
  try {
    const result = await axios.get(videoUrl);
    const desiredData = {
      UploadDate: formatPublishedDate(result.data.items[0].snippet.publishedAt),
      ChannelId: result.data.items[0].snippet.channelId,
      Title: result.data.items[0].snippet.title,
      Description: result.data.items[0].snippet.description,
      Thumbnails: JSON.stringify(result.data.items[0].snippet.thumbnails),
      Keywords: (result.data.items[0].snippet.tags) ? result.data.items[0].snippet.tags.join(",") : "",
      PlayLength: formatDuration(result.data.items[0].contentDetails.duration),
      VideoId: videoId
    }

    return desiredData;
  } catch(err) {
    console.log(err)
  }  
}

gatherAPIData(videoId)
  .then(x => console.log(x))
