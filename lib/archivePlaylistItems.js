import { FileManager } from "./fileManager.js";
import { videoData, channelData, playlistItems, channelSections, channelPlaylists } from '../youtube/getData.js'
import { channelExists, videoExists, addChannel, addVideo, ensureChannelObjid } from "../db/sqlLibrary.js";
import { closePool } from "../db/connection.js";
import { formatPublishedDate } from "../utilities/tools.js";

const source = 55;
const database = 'test';

function buildVideoInsert(a) {
  // console.log(`a[0]: ${JSON.stringify(a[0], null, 2)}`)  
  console.log(`a.length: ${a.length}`)  
  // keywords, data.published, data.title, data.description, data.duration, data.url, channelid, JSON.stringify(data.thumbnails), data.sequence
  //     keywords: (a) ? a.snippet.tags : "",
  //     published: (a) ? a.snippet.publishedAt : "",
  //     title: (a) ? a.snippet.title : "",
  //     description: (a) ? a.snippet.description : "",
  //     duration: formatDuration((a) ? a.contentDetails.duration : ""),
  //     url: `https://www.youtube.com/watch?v=${data.videoId}`,
  //     thumbnails: (a) ? a.snippet.thumbnails : "",
  //     sequence: data.position,
  //     notes: `"Extracted from playlist"`

  return a.map(item => {
    return {videoid: item.id, title: item.snippet.title}
  })
}


async function insertNewVideos(channel, playlistItems) {
  let idlist
  const BATCH_SIZE = 50;
  let insertList = []
  let j = 0
  for (let i = 0; i < playlistItems.length; i += BATCH_SIZE) {
    idlist = playlistItems.slice(i, i + BATCH_SIZE);
    // console.log(`insertNewVideos Line 35: Loop [${j}]`, idlist)

    let apiResults = await videoData(idlist)
    
    insertList.push( ...(await buildVideoInsert(apiResults)) )
    j++;
  }

  insertList.forEach((item, i) => console.log(`[${i}], (${item.videoid}) ${item.title}`))

  // console.log(insertList.length)
  // insertList.forEach(item => console.log(item))
  // insertResults = await addVideo(insertList, channel, source, database)
}


async function execute(input) {
  let allVideos, channelInfo, channelInsertData, videoInsertData, channelObjid
  const {data, exists} = await channelExists(input, source, database);
  channelInfo = await channelData(input);

  if (!exists) {
    channelInsertData = {
      title: channelInfo.items[0].snippet.title,
      channelId: channelInfo.items[0].id,
      description: channelInfo.items[0].snippet.description,
      created: channelInfo.items[0].snippet.publishedAt,
      views: channelInfo.items[0].statistics.viewCount,
      thumbnail: JSON.stringify(channelInfo.items[0].snippet.thumbnails),
      customUrl: channelInfo.items[0].snippet.customUrl,
    }

    let { objid } = await addChannel(channelInsertData, source, database);
    channelObjid = objid;
  } else {
    channelObjid = data[0].objid;
  }
  
  console.log("archivePlaylistItems Line 31: ", channelObjid)
  
  // 2025 01 08 1751 channel objid being presented properly. 
  // Pausing for date with Alissa

  const playlists = await channelPlaylists(input);

  const unresolvedPromiseArray = playlists.map(async (playlist, i) => {
    let items = await playlistItems(playlist.id);
    // console.log(items)
    // console.log(items.snippet.position, items.snippet.title)
    return items
  })

  const resolvedArray = await Promise.all(unresolvedPromiseArray);
  allVideos = resolvedArray.flat()
  allVideos.sort((a, b) => (a.contentDetails.videoPublishedAt > b.contentDetails.videoPublishedAt) ? 1 : (a.contentDetails.videoPublishedAt < b.contentDetails.videoPublishedAt) ? -1 : 0)

  let videoids = allVideos.map(video => video.contentDetails.videoId)
  let insertResults = await insertNewVideos(channelObjid, videoids);

  // console.log(allVideos.length, allVideos[0]);
  // allVideos.forEach((video, i) => {
  //   console.log(`[${i}]`, formatPublishedDate(video.contentDetails.videoPublishedAt), video.contentDetails.videoId, video.status.privacyStatus, video.snippet.title)
  // })
  const final = await closePool(source, database)
}

try {
  execute(process.argv[2]);
} catch (err) {
  console.log(err)
} 
// finally {

// }