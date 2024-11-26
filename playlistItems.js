import { playlistItems, videoData, channelData } from './youtube/getData.js';
import { getChannel, getVideo, addChannel, addVideo } from './db/sqlLibrary.js';
import { formatDuration } from './utilities/tools.js';
import * as colors from  './utilities/consoleColors.js';

async function channelExistsInDb(channel) {
  let information = await getChannel(channel);
  let result = (information.length) ? {status: true, data: information} : {status: false, data: `${channel} does not exist`}
  return result
}

async function videoExistsInDb(video) {
  let information = await getVideo(video)
  let result = (information.length) ? {status: true, data: information} : {status: false, data: `${video} does not exist`}
  return result
}



async function validateListItem(data) {
  let channelResults, videoResults
  // console.log(`${colors.brightCyan}${data.title}${colors.Reset}, ${data.channelId} ${data.channelTitle} ${data.videoId}`)
  // console.log("Line 23: ", data)
  let channelInfo = await channelExistsInDb(data.channelId)
  let videoInfo = await videoExistsInDb(data.videoId)
  if (channelInfo.status === false) {
    console.log(`Add ${data.channelId} to database`)
    console.log(channelInfo)

    let apiData = await channelData(data.channelId)
    console.log(apiData)
    let channelInsertData = {
      title: apiData.items[0].snippet.title, 
      channelId: data.channelId, 
      description: apiData.items[0].snippet.description, 
      created: apiData.items[0].snippet.publishedAt, 
      views: (apiData.items[0].statistics) ? apiData.items[0].statistics.viewCount : 0,
      thumnbnail: apiData.items[0].snippet.thumbnails.high,
      customUrl: apiData.items[0].snippet.customUrl
    }

    let InsertResults = await addChannel(channelInsertData)
    channelResults = {objid: InsertResults.insertId}
  } else {
    let getResults = await getChannel(data.channelId)
    channelResults = getResults[0]
  }
  
  if (videoInfo.status === false) {
    // console.log(`Add https://youtube.com/watch?v=${data.videoId} to database`)
    let apiData = await videoData(data.videoId)
    console.log("Line 49: ", apiData)
    // console.log(apiData.items[0].snippet, apiData.items[0].contentDetails)
    // [keywords, data.published, data.title, data.description, data.duration, data.url,        channelid, JSON.stringify(data.thumbnails)]
    // (keywords,    upload_date,    caption,      description,   play_length,      url, channel_owner_id, thumbnail)
    // console.log((apiData.items[0].snippet.tags) ? apiData.items[0].snippet.tags.join() : "")
    let videoInsertData = {
      keywords: (apiData.items[0].snippet.tags) ? apiData.items[0].snippet.tags : "",
      published: apiData.items[0].snippet.publishedAt,
      title: apiData.items[0].snippet.title,
      description: apiData.items[0].snippet.description,
      duration: formatDuration(apiData.items[0].contentDetails.duration),
      url: `https://youtube.com/watch?v=${data.videoId}`,
      thumbnails: apiData.items[0].snippet.thumbnails
    }
    // console.log(channelResults[0].objid, videoInsertData)
    let InsertResults = await addVideo(videoInsertData, channelResults.objid)
    videoResults = {objid: InsertResults.insertId}
  } else {
    let getResults = await getVideo(data.videoId) 
    videoResults = getResults[0] 
  }

  return {channelResultObjid: channelResults.objid, videoResultObjid: videoResults.objid}
}


async function processPlaylist(id) {
  let processingList, finalResults
  let data = await playlistItems(id)
  // console.log(data.items[0].snippet)
  console.log(`================ ${colors.brightGreen}${id}${colors.Reset} ================`)
  // console.log(`Channel Id: ${data.items[0].snippet.channelId}, Video Id: ${data.items[0].snippet.resourceId.videoId}`)
  // let validationData = await validateListItem({channelId: data.items[0].snippet.channelId, videoId: data.items[0].snippet.resourceId.videoId})
  // console.log("Line 82: ", validationData)
  processingList = data.items.map(async element => {
    // console.log("Line 87: ", element.snippet.channelId, element.snippet.resourceId.videoId)
  //   console.log("Line 72: ", element.snippet.resourceId.videoId)
  //   let info = {
  //     title: element.snippet.title,
  //     channelId: element.snippet.channelId,
  //     channelTitle: element.snippet.channelTitle,
  //     videoId: element.snippet.resourceId.videoId,
  //     channelObjid: ""
  //   }
  //   // console.log(`${colors.brightCyan}${info.title}${colors.Reset}, ${info.channelId} ${info.channelTitle} ${info.resourceId.videoId}`)
    let validationData = await validateListItem({channelId: element.snippet.channelId, videoId: element.snippet.resourceId.videoId})
    return validationData
    // console.log(validationData)
    // processingList.push(validationData)
  });

  finalResults = await Promise.all(processingList)
  finalResults.sort((a, b) => (a.videoResultObjid > b.videoResultObjid) ? 1 : (a.videoResultObjid < b.videoResultObjid) ? -1 : 0 )
  return finalResults
}

// async function processVideo(data) {
  

//   let result = await videoData(data)
//   let insertData = [
//     result.items[0].snippet.publishedAt,
//     result.items[0].snippet.title,
//     result.items[0].snippet.description,
//     formatDuration(result.items[0].contentDetails.duration),
//     `https://www.youtube.com/watch?v=${data}`,
//     result.items[0].snippet.channelId,

//   ]
//   // console.log(colors.brightCyan, result.items[0].snippet.publishedAt, colors.Reset, result.items[0].contentDetails.duration, colors.brightYellow, result.items[0].snippet.title, colors.Reset, `https://www.youtube.com/watch?v=${data}`)
//   // console.log(result.items[0].snippet.title, colors.brightBlue, formatDuration(result.items[0].contentDetails.duration), colors.Reset, colors.brightYellow, result.items[0].contentDetails.duration, colors.Reset)
//   // console.log(result.items, result.items.contentDetails)
//   // console.log(result.items[0])
//   // console.log(Object.keys(result))
//   // console.log(JSON.stringify(result))
// }


async function execute(info) {
  let videoList = await processPlaylist(info)
  console.log(videoList)
  // videoList.items.forEach(element => {
  //   processVideo(element, videoList.channelId)
  // })

}

execute(process.argv[2])
