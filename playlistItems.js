import { playlistItems, videoData, channelData } from './youtube/getData.js';
import { getChannel, getVideo, addChannel, addVideo } from './db/sqlLibrary.js';
import { formatDuration } from './utilities/tools.js';
import * as colors from  './utilities/consoleColors.js';

async function channelExistsInDb(channel) {
  let information = await getChannel(channel);
  let result = (information.length) ? {status: true, data: information[0]} : {status: false, data: `${channel} does not exist`}
  return result
}

async function videoExistsInDb(video) {
  let information = await getVideo(video)
  let result = (information.length) ? {status: true, data: information[0]} : {status: false, data: `${video} does not exist`}
  return result
}

async function processChannelInfo(channelId) {
  let insertResults, channelInsertData
  let apiData = await channelData(channelId)
  channelInsertData = {
    title: apiData.items[0].snippet.title,
    channelId,
    description: apiData.items[0].snippet.description,
    created: apiData.items[0].snippet.publishedAt,
    views: (apiData.items[0].statistics) ? apiData.items[0].statistics.viewCount : 0,
    thumnbnail: JSON.stringify(apiData.items[0].snippet.thumbnails),
    customUrl: apiData.items[0].snippet.customUrl
  }

  insertResults = await addChannel(channelInsertData)
  return {channel: channelId, dbObjid: insertResults.insertId} 
}

async function processVideoInfo(data) {
  let channelInfo, result, insertData 
  channelInfo = await getChannel(data.channelId)

  result = await videoData(data.videoId)

  insertData = {
    keywords: (result.items[0].snippet.tags) ? result.items[0].snippet.tags : "",
    published: result.items[0].snippet.publishedAt,
    title: result.items[0].snippet.title,
    description: result.items[0].snippet.description,
    duration: formatDuration(result.items[0].contentDetails.duration),
    url: `https://www.youtube.com/watch?v=${data.videoId}`,
    thumbnails: result.items[0].snippet.thumbnails
  }

  let results = await addVideo(insertData, channelInfo[0].objid)
  return results
}

async function channelChecker(id) {
  let finalResult
  let channelList = []
  let data = await playlistItems(id)

  for (let index = 0; index < data.items.length; index++) {
    if (!channelList.includes(data.items[index].snippet.channelId)) {
      channelList.push(data.items[index].snippet.channelId)
    }
  }

  let videos = data.items.map(element => {
    return {
      videoId: element.snippet.resourceId.videoId,
      channelId: element.snippet.videoOwnerChannelId,
      position: element.snippet.position,
      title: element.snippet.title
    }
  });

  const channelInfo = channelList.map(async channel => {
    let result = await channelExistsInDb(channel)
    return (!result.status) ? channel : null
  })

  finalResult = await Promise.all(channelInfo)
  return {channels: finalResult.filter(Boolean), videos}
}

async function execute(info) {
  let playlistData = await channelChecker(info)

  if (playlistData.channels.length) {
    let channels = playlistData.channels.map(async channel => {
      let insertResults = await processChannelInfo(channel)  
      return insertResults
    })

    let channelAddResults = await Promise.all(channels)
    channelAddResults.forEach(item => {
      console.log(`${colors.brightGreen}Added channel${colors.Reset} ${colors.brightCyan}${item.channel}${colors.Reset} ${colors.brightGreen}with objid${colors.Reset} ${colors.brightMagenta}${item.dbObjid}${colors.Reset}`)
    })
  } else {
    console.log(`${colors.brightRed}No new channels to add from playlist${colors.Reset} ${colors.brightCyan}${info}${colors.Reset}`)
  }

  let videoCheck = playlistData.videos.map(async video => {
    let results = await videoExistsInDb(video.videoId)
    if (!results.status) {
      return video
    }
  }) 

  let videoList = await Promise.all(videoCheck)

  let videoInsertList = videoList.filter(Boolean)
  
  videoInsertList.forEach(async video => {
    let insertResults
    if (video.channelId) {
       insertResults = await processVideoInfo({videoId: video.videoId, channelId: video.channelId})
       console.log(`${colors.brightGreen}Added video${colors.Reset} ${colors.brightCyan}${video.videoId}${colors.Reset} ${colors.brightGreen}with objid${colors.Reset} ${colors.brightMagenta}${insertResults.insertId}${colors.Reset}`)
     } else {
      console.log(`${colors.brightRed}${video.videoId}${colors.Reset} ${colors.brightCyan}not added${colors.Reset}`)
     }
  })
}

execute(process.argv[2])
