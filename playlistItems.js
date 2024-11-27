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
  // if (data.channelId) {
    channelInfo = await getChannel(data.channelId)
    // let videoStatus = await videoExistsInDb(data.videoId)
    // console.log(videoStatus.status)
    // if (!videoStatus.status) {
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

      // console.log("Insert ", data.videoId, insertData.duration, insertData.title, )
    // }
  // }


  let results = await addVideo(insertData, channelInfo[0].objid)
  return results

  // console.log(colors.brightCyan, result.items[0].snippet.publishedAt, colors.Reset, result.items[0].contentDetails.duration, colors.brightYellow, result.items[0].snippet.title, colors.Reset, `https://www.youtube.com/watch?v=${data}`)
  // console.log(result.items[0].snippet.title, colors.brightBlue, formatDuration(result.items[0].contentDetails.duration), colors.Reset, colors.brightYellow, result.items[0].contentDetails.duration, colors.Reset)
  // console.log(result.items, result.items.contentDetails)
  // console.log(result.items[0])
  // console.log(Object.keys(result))
  // console.log(JSON.stringify(result))
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


async function processPlaylist(id) {
  // console.log(`processPlaylist(${id})`)

  let processingList, finalResults, channelInfo
  let data = await playlistItems(id)
  console.log(`${colors.brightYellow}================${colors.Reset} ${colors.brightGreen}${id}${colors.Reset} ${colors.brightYellow}================${colors.Reset}`)

  // for (let index = 0; index < data.items.length; index++) {
  //   // console.log(data.items[index].snippet.channelId)
  //   if (!channelList.includes(data.items[index].snippet.channelId)) {
  //     channelList.push(data.items[index].snippet.channelId)
  //   }

  // //   const element = data.items[index];
  // //   let channelResult = await channelExistsInDb(element.snippet.channelId)
  // //   console.log(channelResult)
  // //   if (channelResult.status === false) {
  // //     let apiData = await channelData(element.snippet.channelId)
  // //     let channelInsertData = {
  // //       title: apiData.items[0].snippet.title,
  // //       channelId: data.channelId,
  // //       description: apiData.items[0].snippet.description,
  // //       created: apiData.items[0].snippet.publishedAt,
  // //       views: (apiData.items[0].statistics) ? apiData.items[0].statistics.viewCount : 0,
  // //       thumnbnail: apiData.items[0].snippet.thumbnails.high,
  // //       customUrl: apiData.items[0].snippet.customUrl
  // //     }

  // //     let InsertResults = await addChannel(channelInsertData)
  // //     channelInfo = {objid: InsertResults.insertId}
  // }




  //   // console.log(Object.keys(element))
  // }


  // console.log(`Channel Id: ${data.items[0].snippet.channelId}, Video Id: ${data.items[0].snippet.resourceId.videoId}`)
  // let validationData = await validateListItem({channelId: data.items[0].snippet.channelId, videoId: data.items[0].snippet.resourceId.videoId})
  // console.log("Line 82: ", validationData)
  // processingList = data.items.map(async (element, i) => {
  //   let channelResults, videoStatus
  //   // console.log("Line 87: ", element.snippet.channelId, element.snippet.resourceId.videoId)
  //   // console.log("Line 72: ", element.snippet.resourceId.videoId)
  //   // console.log(`${colors.brightCyan}${info.title}${colors.Reset}, ${info.channelId} ${info.channelTitle} ${info.resourceId.videoId}`)
  //   let channelResult = await channelExistsInDb(element.snippet.channelId)
  //   // console.log(i, channelResult.status)
  //   // console.log(element.snippet.channelId)
  //   if (channelResult.status === false) {
  //     let apiData = await channelData(element.snippet.channelId)
  //     let channelInsertData = {
  //       title: apiData.items[0].snippet.title,
  //       channelId: data.channelId,
  //       description: apiData.items[0].snippet.description,
  //       created: apiData.items[0].snippet.publishedAt,
  //       views: (apiData.items[0].statistics) ? apiData.items[0].statistics.viewCount : 0,
  //       thumnbnail: apiData.items[0].snippet.thumbnails.high,
  //       customUrl: apiData.items[0].snippet.customUrl
  //     }

  //     let InsertResults = await addChannel(channelInsertData)
  //     channelResults = {objid: InsertResults.insertId}
  //   } else {
  //     let dbData = await getChannel(data.channelId)
  //     channelResults = dbData
  //   }

  //   return channelResults
  //   // let validationData = await validateListItem({channelId: element.snippet.channelId, videoId: element.snippet.resourceId.videoId})
  //   // console.log(validationData)

  //   // return validationData
  // });

  // finalResults = await Promise.all(processingList)
  // finalResults.sort((a, b) => (a.videoResultObjid > b.videoResultObjid) ? 1 : (a.videoResultObjid < b.videoResultObjid) ? -1 : 0 )
  return finalResults
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

  // console.log(playlistData.videos)

  let videoCheck = playlistData.videos.map(async video => {
    let results = await videoExistsInDb(video.videoId)
    if (!results.status) {
      return video
    }
  }) 

  let videoList = await Promise.all(videoCheck)
  // console.log(videoList)

  let videoInsertList = videoList.filter(Boolean)
  
  videoInsertList.forEach(async video => {
    let insertResults
    if (video.channelId) {
      // console.log(video.videoId, video.channelId)
       insertResults = await processVideoInfo({videoId: video.videoId, channelId: video.channelId})
       console.log(`${colors.brightGreen}Added video${colors.Reset} ${colors.brightCyan}${video.videoId}${colors.Reset} ${colors.brightGreen}with objid${colors.Reset} ${colors.brightMagenta}${insertResults.insertId}${colors.Reset}`)
     } else {
      console.log(`${colors.brightRed}${video.videoId}${colors.Reset} ${colors.brightCyan}not added${colors.Reset}`)
     }
  })

  // let addChannelResults = channelList.channels.map(async channel =>{
  //   let result = await processChannelInfo(channel)
  //   // console.log(result)
  //   return result
  // })

  // let channelResults = Promise.all(addChannelResults)

  // console.log("Line 245: ", channelResults)
  // let videoList = extractVideoData(info)
  // let videoList = await processPlaylist(info)
  // console.log(videoList)
  // videoList.items.forEach(element => {
  //   processVideo(element, videoList.channelId)
  // })

}

execute(process.argv[2])
