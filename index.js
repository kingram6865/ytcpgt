import { getChannelId, channelData, channelPlaylists } from "./youtube/getData.js";
import { channelExists, getChannel } from "./db/sqlLibrary.js";
import { closePool } from "./db/connection.js";
import { formatPublishedDate } from "./utilities/tools.js";
import chalk from "chalk";

const source = 55;
const database = 'test';
let channel = process.argv[2];

// import { channelExists, videoExists, getChannel, getVideo, addChannel, addVideo } from './db/sqlLibrary.js';
// import { videoData, channelData } from './youtube/getData.js';
// import * as colors from  './utilities/consoleColors.js'

// function highestResThumbnail(input) {
//   const choices = Object.keys(input)
// }

// function formatDate(data, format=null) {
//   let newDate = data.split(/[: T-]/).map(parseFloat)
//   const year = (newDate[0] < 10) ? `0${newDate[0]}` : newDate[0]
//   const month = (newDate[1] < 10) ? `0${newDate[1]}` : newDate[1]
//   const day = (newDate[2] < 10) ? `0${newDate[2]}` : newDate[2]
//   const hours = (newDate[3] < 10) ? `0${newDate[3]}` : newDate[3]
//   const minutes = (newDate[4] < 10) ? `0${newDate[4]}` : newDate[4]
//   const seconds = (newDate[5] < 10) ? `0${newDate[5]}` : newDate[5]

//   if (!format) {
//     return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
//   } else {
//     return `${year}-${month}-${day}`
//   }
// }

// /**
//  * Extract the videoid from the url
//  */
// function videoId(data){
//   const rePattern = /=/;
//   let index = rePattern.exec(data)['index'] + 1;
//   let result = data.substring(index);
//   return result;
// }

// /**
//  * Reformats 'HH:MM:SS' to "HHMMSS". Prepends 0 for digits [0-9]
//  */
// function formatDuration(input, version=null){
//   let timeinfo = [];
//   let timedata = input
//   let matches =[/(\d+)H/,/(\d+)M/,/(\d+)S/];

//   for (let k=0; k < matches.length; k++){
//     timeinfo[k] = (timedata.match(matches[k])) ? timedata.match(matches[k])[1].padStart(2,'0') : '00';
//   }

//   if (!version) {
//     return timeinfo.join("");
//   } else {
//     return timeinfo.join(":")
//   }
// }

// async function buildDataInsertion(url) {
//   let videoInfo, channelInfo
//   let videoid = videoId(url)
//   let video_data = await videoData(videoid)
//   let channel_data = await channelData(video_data.items[0].snippet.channelId)
//   let haveVideo = await videoExists(videoid)
//   let haveChannel = await channelExists(video_data.items[0].snippet.channelId)
//   let dbChannelInfo = await getChannel(channel_data.items[0].id)
//   let dbVideoInfo = await getVideo(videoid)

//   videoInfo = {
//     keywords: video_data.items[0].snippet.tags,
//     published: formatDate(video_data.items[0].snippet.publishedAt),
//     title: video_data.items[0].snippet.title,
//     description: video_data.items[0].snippet.description,
//     dbDuration: formatDuration(video_data.items[0].contentDetails.duration),
//     url,
//     channelObjid: 0,
//     rewatch: 0,
//     thumbnails: video_data.items[0].snippet.thumbnails,
//     channelTitle: video_data.items[0].snippet.channelTitle,
//     channelId: video_data.items[0].snippet.channelId,
//     duration: formatDuration(video_data.items[0].contentDetails.duration, 1),
//     videoId: videoid,
//     dbData: dbVideoInfo
//   }

//   channelInfo = {
//     channelId: channel_data.items[0].id,
//     title: channel_data.items[0].snippet.title,
//     description: channel_data.items[0].snippet.description,
//     customUrl: channel_data.items[0].snippet.customUrl,
//     created: channel_data.items[0].snippet.publishedAt,
//     thumbnail: channel_data.items[0].snippet.thumbnails.high.url,
//     relatedPlaylists: channel_data.items[0].contentDetails.relatedPlaylists,
//     views: channel_data.items[0].statistics.viewCount,
//     dbData: dbChannelInfo
//   }
  
//   return {haveChannel, haveVideo, videoInfo, channelInfo}
// }

// async function processData(data) {
//   if (data.haveChannel && !data.haveVideo) {
//     console.log(`Check 1: Channel is archived, but not Video`)
//   } else if (!data.haveChannel && data.haveVideo) {
//     console.log(`Check 2: Have Video: ${data.haveVideo}, Do not have Channel: ${data.haveChannel}`)
//   } else if (!data.haveChannel && !data.haveVideo){
//     console.log(`Check 3: [${colors.brightYellow}${data.videoInfo.videoid}${colors.Reset}] ${colors.brightRed}Do not have Video${colors.Reset}, ${colors.brightRed}Do not have Channel${colors.Reset}\n=====================================`)
//     console.log(`${colors.greenOnBlack}Adding Channel${colors.Reset} ${data.channelInfo.channelId}, ${colors.brightBlue}${data.channelInfo.title}${colors.Reset} ${data.channelInfo.customUrl} (${colors.brightMagenta}Since ${formatDate(data.channelInfo.created, 1)}${colors.Reset})`)
//     let channelInsertResults = await addChannel(data.channelInfo)
//     let videoInsertResults = await addVideo(data.videoInfo, channelInsertResults.insertId)
//     console.log(`${colors.greenOnBlack}Added Video   ${colors.Reset} https://youtube.com/watch?v=${data.videoInfo.videoId}, ${colors.brightBlue}${data.videoInfo.title}${colors.Reset} [${colors.brightYellow}${data.videoInfo.duration}${colors.Reset}] objid: [${colors.brightRed}${videoInsertResults.insertId}${colors.Reset}] to Channel objid: [${colors.brightCyan}${channelInsertResults.insertId}${colors.Reset}], ${colors.brightBlue}${data.channelInfo.title}${colors.Reset}\n=====================================================================`)
//   } else if (data.haveChannel && data.haveVideo){
//     console.log(`Check 4: ${colors.brightGreen}Have Video and Channel${colors.Reset}`)
//     console.log(data.channelInfo.dbData, data.videoInfo.dbData)
//   }

// }

// async function execute(input) {
//   const data = await buildDataInsertion(input)
//   processData(data)
// }

// execute(process.argv[2])

async function main() {
  let channelApiData, channelDbData
  if (/^http|@/.test(channel)) {
    channel = await getChannelId(channel);
  }

  let channelExistence = await channelExists(channel, source, database);
  // console.log(channel, `${channelExistence.exists}`);


  if (!channelExistence.exists) {
    channelApiData = await channelData(channel);
    // console.log(chalk.bgAnsi256(196)("Channel Not in Youtube Archive: \n"), JSON.stringify(channelApiData, null, 2))
    const playlists = await channelPlaylists(channel);
    
    // playlists.forEach(element => {
    //   let id = chalk.ansi256(33)(element.id);
    //   let title = chalk.ansi256(118)(element.snippet.title);
    //   let childrenCount = chalk.ansi256(226)(element.contentDetails?.itemCount.toString().padStart(3, ' '));
    //   let published = chalk.ansi256(206)(formatPublishedDate(element.snippet.publishedAt));

    //   console.log(`${id} ${published} (${childrenCount}) ${title}`)
    // });







  } else {
    channelDbData = await getChannel(channel, source, database);
    console.log(chalk.bgAnsi256(226)("Youtube Archive Data: \n"), channelDbData)
  }








  const final = await closePool(source, database)
}

main()