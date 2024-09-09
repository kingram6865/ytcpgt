import { channelExists, videoExists, getChannel, getVideo, addChannel, addVideo } from './db/sqlLibrary.js';
import { videoData, channelData } from './youtube/getData.js';
import * as colors from  './utilities/consoleColors.js'

function highestResThumbnail(input) {
  const choices = Object.keys(input)
}

function formatDate(data, format=null) {
  let newDate = data.split(/[: T-]/).map(parseFloat)
  const year = (newDate[0] < 10) ? `0${newDate[0]}` : newDate[0]
  const month = (newDate[1] < 10) ? `0${newDate[1]}` : newDate[1]
  const day = (newDate[2] < 10) ? `0${newDate[2]}` : newDate[2]
  const hours = (newDate[3] < 10) ? `0${newDate[3]}` : newDate[3]
  const minutes = (newDate[4] < 10) ? `0${newDate[4]}` : newDate[4]
  const seconds = (newDate[5] < 10) ? `0${newDate[5]}` : newDate[5]

  if (!format) {
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } else {
    return `${year}-${month}-${day}`
  }
}

/**
 * Extract the videoid from the url
 */
function videoId(data){
  const rePattern = /=/;
  let index = rePattern.exec(data)['index'] + 1;
  let result = data.substring(index);
  console.log(`Processing VideoId [${result}]`)
  return result;
}

/**
 * Reformats 'HH:MM:SS' to "HHMMSS". Prepends 0 for digits [0-9]
 */
function formatDuration(input, version=null){
  let timeinfo = [];
  let timedata = input
  let matches =[/(\d+)H/,/(\d+)M/,/(\d+)S/];

  for (let k=0; k < matches.length; k++){
    timeinfo[k] = (timedata.match(matches[k])) ? timedata.match(matches[k])[1].padStart(2,'0') : '00';
  }

  if (!version) {
    return timeinfo.join("");
  } else {
    return timeinfo.join(":")
  }
}

async function buildDataInsertion(url) {
  let videoInfo, channelInfo
  let videoid = videoId(url)
  let video_data = await videoData(videoid)
  let channel_data = await channelData(video_data.items[0].snippet.channelId)
  // console.log(JSON.stringify(channel_data, null, 2))
  // console.log(JSON.stringify(video_data, null, 2))
  // console.log("ChannelId: ", channel_data.items[0].id, "\nsnippet ====\n", channel_data.items[0].snippet, "\nContentDetails ====\n", channel_data.items[0].contentDetails, "\nstatistics ====\n", channel_data.items[0].statistics)
  // console.log(channel_data.items[0].snippet, channel_data.items[0].contentDetails, channel_data.items[0].statistics)
  // console.log(video_data.items[0].snippet.channelId, JSON.stringify(channel_data, null, 2))
  let haveVideo = await videoExists(videoid)
  let haveChannel = await channelExists(video_data.items[0].snippet.channelId)
  let dbChannelInfo = await getChannel(channel_data.items[0].id)
  // console.log("Channel Exists: ", channel_data.items[0].id, dbChannelInfo[0])
  let dbVideoInfo = await getVideo(videoid)
  // console.log(dbChannelInfo)

  videoInfo = {
    keywords: video_data.items[0].snippet.tags,
    published: formatDate(video_data.items[0].snippet.publishedAt),
    title: video_data.items[0].snippet.title,
    description: video_data.items[0].snippet.description,
    dbDuration: formatDuration(video_data.items[0].contentDetails.duration),
    url,
    channelObjid: 0,
    rewatch: 0,
    thumbnails: video_data.items[0].snippet.thumbnails,
    channelTitle: video_data.items[0].snippet.channelTitle,
    channelId: video_data.items[0].snippet.channelId,
    duration: formatDuration(video_data.items[0].contentDetails.duration, 1),
    videoId: videoid,
    dbData: dbVideoInfo
  }

  channelInfo = {
    channelId: channel_data.items[0].id,
    title: channel_data.items[0].snippet.title,
    description: channel_data.items[0].snippet.description,
    customUrl: channel_data.items[0].snippet.customUrl,
    created: channel_data.items[0].snippet.publishedAt,
    thumbnail: channel_data.items[0].snippet.thumbnails.high.url,
    relatedPlaylists: channel_data.items[0].contentDetails.relatedPlaylists,
    views: channel_data.items[0].statistics.viewCount,
    dbData: dbChannelInfo
  }
  
  return {haveChannel, haveVideo, videoInfo, channelInfo}
}

async function processData(data) {
  if (data.haveChannel && !data.haveVideo) {
    console.log(`Check 1: Channel is archived, but not Video`)
  } else if (!data.haveChannel && data.haveVideo) {
    console.log(`Check 2: Have Video: ${data.haveVideo}, Do not have Channel: ${data.haveChannel}`)
  } else if (!data.haveChannel && !data.haveVideo){
    console.log(`Check 3: Do not have Video, Do not have Channel`)
    console.log(`${colors.greenOnBlack}Adding Channel${colors.Reset} ${data.channelInfo.channelId}, ${colors.brightBlue}${data.channelInfo.title}${colors.Reset} ${data.channelInfo.customUrl} (${colors.brightMagenta}Since ${formatDate(data.channelInfo.created, 1)}${colors.Reset})`)
    let channelInsertResults = await addChannel(data.channelInfo)
    let videoInsertResults = await addVideo(data.videoInfo, channelInsertResults.insertId)
    console.log(`${colors.greenOnBlack}Added Video   ${colors.Reset} ${data.videoInfo.videoId}, ${colors.brightBlue}${data.videoInfo.title}${colors.Reset} [${colors.brightYellow}${data.videoInfo.duration}${colors.Reset}] ${colors.brightRed}objid: ${videoInsertResults.insertId}${colors.Reset} to Channel objid: [${colors.brightCyan}${channelInsertResults.insertId}${colors.Reset}], ${data.channelInfo.title}`)
  } else if (data.haveChannel && data.haveVideo){
    console.log(`Check 4: Have Video and have Channel`)
    console.log(data.channelInfo, data.videoInfo.title)
  }

}

async function execute(input) {
  
  // let tables = await listTables()
  // let dupe = (await videoExists('r8-RIMdl8Bs'))[0]
  // console.log(tables, "\n", dupe)
  const data = await buildDataInsertion(input)
  processData(data)
  // console.log(data.haveChannel, data.haveVideo)


}

execute(process.argv[2])
