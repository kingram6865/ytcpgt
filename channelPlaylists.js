import chalk from "chalk";
import { FileManager } from "./lib/fileManager.js";
import { videoData, channelData, playlistItems, channelSections, getChannelId, channelPlaylists } from './youtube/getData.js'
import { parseYouTubeUrl } from "./youtube/utils.js";
import { formatDuration, formatPublishedDate } from "./utilities/tools.js";
const baseUrl = "https://youtube.googleapis.com/youtube/v3"

async function channelInfo(input) {
  let output = []
  let sections = await channelSections(input)
  sections.forEach(element => {
    output.push({
      kind: element.kind,
      sectionId: element.id,
      type: element.snippet.type,
      title: element.snippet.title?? "",
      position: element.snippet.position
    })
  });

  // output.forEach(async item => {
  //   console.log(item.position, item.sectionId, item.type, item.title)
  //   await getPlaylistItems(item.sectionId)
  // })

  return output;
}

async function getChannelPlaylists(id) {
  const listOfPlaylists = await channelPlaylists(id);
  return listOfPlaylists;
}

async function getVideoInfo(input) {
  result = await videoData(input)
    output = {
      publishedAt: formatPublishedDate(result.items[0].snippet.publishedAt),
      channelId: result.items[0].snippet.channelId,
      title: result.items[0].snippet.title,
      description: result.items[0].snippet.description,
      thumbnails: result.items[0].snippet.thumbnails,
      channelTitle:  result.items[0].snippet.channelTitle,
      tags:  result.items[0].snippet.tags.join(","),
      duration: formatDuration(result.items[0].contentDetails.duration),
      views: result.items[0].statistics.viewCount,
      comments: result.items[0].statistics.commentCount
    }

    console.log(output.duration, output.publishedAt, output.title)
    return output;
}

async function getPlaylistItems(id) {
  const videos = await playlistItems(id);
  // videos.forEach(video => {
  //   console.log(video)
  // })
  return videos;
}

async function execute(input) {
  // const result = await listTables(55, 'random_facts');
  // console.log('Query completed successfully');
  // console.log('Result:', result);
  // return result;
  let message = chalk.ansi256(86)("Retrieving data for")
  let dirName, test, urlType, result, output
  urlType = parseYouTubeUrl(input);
  if (urlType.type === 'video') {
    console.log(`${message} ${chalk.ansi256(214)("video Id:")} ${chalk.ansi256(184)(urlType.videoId)}`)
    const videoInfo = await getVideoInfo(urlType.videoId);
  } else if (urlType.type === 'channel-id') {
    console.log(`${message} ${chalk.ansi256(214)("channel Id:")} ${chalk.ansi256(184)(urlType.channelId)}`)
    await channelInfo(urlType.channelId)
  } else if (urlType.type === 'channel-handle') {
    console.log(`${message} ${chalk.ansi256(214)("channel handle:")} ${chalk.ansi256(184)(urlType.handle)}`)
    const channelid = await getChannelId(urlType.handle)
    console.log(`The channel Id is ${chalk.ansi256(190)(channelid)}`)
    // await channelInfo(channelid)
    const listOfPlaylists = await getChannelPlaylists(channelid)

    for (const playlist of listOfPlaylists) {
      console.log(playlist.id, playlist.snippet.channelTitle, `"${playlist.snippet.title}", `, `items in playlist => ${chalk.ansi256(226)(playlist.contentDetails.itemCount)}`)
      let allItems = await getPlaylistItems(playlist.id)
      allItems.forEach(item => console.log(item.snippet.position, item.contentDetails.videoId, item.contentDetails.videoPublishedAt, item.status.privacyStatus));
    }
  } else if (urlType.type === 'playlist') {
    console.log(`${message} ${chalk.ansi256(214)("playlist Id:")} ${chalk.ansi256(184)(urlType.playlistId)}`)

  }
  

  // const channelId = await getChannelId(input);
  // console.log(channelId)


  // const lz = new FileManager('./data')
  // const getVideoInfo = await videoData(input)
  // const channelInfo = await channelData(getVideoInfo[0].snippet.channelId)
  // // console.log(channelInfo.items[0].contentDetails)
  // dirName = channelInfo.items[0].snippet.title.replace(/\./g, '').replace(/\s+/g, '_');
  // Object.keys(channelInfo.items[0].contentDetails.relatedPlaylists).forEach(l => {
  //   let plId = channelInfo.items[0].contentDetails.relatedPlaylists[l]
  //   if (plId) {
  //     console.log(`${plId} => ${channelInfo.items[0].snippet.title}`)
  //   }
  // })

  // const playlist = await playlistItems(channelInfo.items[0].contentDetails.relatedPlaylists.uploads)
  // lz.writeJSON(`videos.json`, playlist, true, dirName)
}


await execute(process.argv[2])
  // .then(x => {
  // //   console.log(x[0].id, x[0].contentDetails) ;
  //   x.items.forEach(element => {
  //     console.log(element.snippet.publishedAt, element.snippet.title)
  //   });
  // });