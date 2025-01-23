import { playlistItems, videoData, channelData } from './youtube/getData.js';
import { getChannel, getVideo, addChannel, addVideo } from './db/sqlLibrary.js';
import { formatDuration } from './utilities/tools.js';
import * as colors from  './utilities/consoleColors.js';
let playListData = {playlistId: process.argv[2], playlistName: ""}


async function channelExistsInDb(channel) {
  let information = await getChannel(channel);
  // console.log("Line 8: ", Object.keys(information))
  // console.log(information.objid)
  let result = (information) ? {status: true, data: information} : {status: false, data: `${channel} does not exist`}
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
  // console.log(data.channelId)
  let channelInfo, result, insertData;
  channelInfo = await channelExistsInDb(data.channelId);
  // console.log("Line 41: ", channelInfo)

  // console.log("Line 40: ", channelInfo)
  result = await videoData(data.videoId)
  // console.log("\t(playlistItems Line 45): ", data.videoId, result.length, (result.length > 0), !(result.length > 0)) 
  if (result.length) {
    insertData = {
      keywords: (result[0]) ? result[0].snippet.tags : "",
      published: (result[0]) ? result[0].snippet.publishedAt : "",
      title: (result[0]) ? result[0].snippet.title : "",
      description: (result[0]) ? result[0].snippet.description : "",
      duration: formatDuration((result[0]) ? result[0].contentDetails.duration : ""),
      url: `https://www.youtube.com/watch?v=${data.videoId}`,
      thumbnails: (result[0]) ? result[0].snippet.thumbnails : "",
      sequence: data.position,
      notes: `"Extracted from playlist"`
    }

    let results = await addVideo(insertData, channelInfo.data.objid)
    return results
    // return {insertId: "Testing"}
  } 
  // else {
  //   console.log("\t(playlistItems Line 63): ", result)
    return {insertId: 0}
  // }
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
      channelId: element.snippet.channelId,
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
  playlistData.videos.forEach(item => {
    console.log(`[${colors.brightGreen}${item.videoId}${colors.Reset}] [${colors.brightGreen}${item.title}${colors.Reset}]`)
  })

  // if (playlistData.channels.length) {
  //   let channels = playlistData.channels.map(async channel => {
  //     let insertResults = await processChannelInfo(channel)  
  //     return insertResults
  //   })

  //   let channelAddResults = await Promise.all(channels)
  //   channelAddResults.forEach(item => {
  //     console.log(`${colors.brightGreen}Added channel${colors.Reset} ${colors.brightCyan}${item.channel}${colors.Reset} ${colors.brightGreen}with objid${colors.Reset} ${colors.brightMagenta}${item.dbObjid}${colors.Reset}`)
  //   })
  // } else {
  //   console.log(`${colors.brightGreen}Channel exists for playlist${colors.Reset} ${colors.brightCyan}${info}${colors.Reset}`)
  // }

  // let videoCheck = playlistData.videos.map(async video => {
  //   // console.log(video)
  //   let results = await videoExistsInDb(video.videoId)
  //   if (!results.status) {
  //     return video
  //   } else {
  //     console.log(`${colors.brightGreen}[ARCHIVED]${colors.Reset} ${colors.brightYellow}${video.videoId}${colors.Reset} ${colors.brightCyan}${video.title}${colors.Reset}`)
  //   }
  // }) 

  // let videoList = await Promise.all(videoCheck)

  // let videoInsertList = videoList.filter(Boolean)
  
  // // console.log(videoInsertList)

  // videoInsertList.forEach(async video => {
  //   let insertResults
  //   if (video.channelId) {
  //     // console.log(video)
  //      insertResults = await processVideoInfo({videoId: video.videoId, channelId: video.channelId, position: video.position})
  //      if (insertResults.insertId) {
  //       console.log(`${colors.brightGreen}Added video${colors.Reset} [${colors.brightCyan}${video.videoId}${colors.Reset}] ${colors.brightGreen}with objid${colors.Reset} ${colors.brightMagenta}${insertResults.insertId}${colors.Reset}\t${video.title}`)
  //     } else {
  //       console.log(`[${colors.brightCyan}${video.videoId}${colors.Reset}] ${colors.brightRed}was removed or private. The API returned no data.${colors.Reset}`)
  //     }
  //    } else {
  //     console.log(`${colors.brightRed}${video.videoId}${colors.Reset} ${colors.brightCyan}not added${colors.Reset}`)
  //    }
  // })
}

execute(process.argv[2])

// async function test(input) {
//   let playList = await playlistItems(input)
//   playList.items.forEach(item => {
//     console.log(item)
//     // channelExistsInDb(item.snippet.channelId)
//     //   .then(x => console.log(x))
//     // console.log(item.snippet)
//   })

// }

// test(process.argv[2])
