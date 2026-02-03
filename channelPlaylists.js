import chalk from "chalk";
import { FileManager } from "./lib/fileManager.js";
import { videoData, channelData, playlistItems, channelSections, getChannelId, channelPlaylists } from './youtube/getData.js'
import { parseYouTubeUrl } from "./youtube/utils.js";
import { formatDuration, formatPublishedDate, chunkArray, sleep } from "./utilities/tools.js";
// const baseUrl = "https://youtube.googleapis.com/youtube/v3"

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

async function gatherAllPlaylistItems(listOfPlaylists) {
  const batchSize = 50;
  const waitMs = 600;
  const videoIds = [];

  // 1) Collect ALL ids first
  for (const playlist of listOfPlaylists) {
    const allItems = await getPlaylistItems(playlist.id);
    // const filtered= allItems.filter(item => item.status.privacyStatus !== 'private')

    for (const item of allItems) {
      const vid = item?.contentDetails?.videoId;
      if (vid) videoIds.push(vid);
    }
  }

  // 2) De-dupe once
  const uniqueVideoIds = Array.from(new Set(videoIds));

  // 3) Batch once
  const batches = chunkArray(uniqueVideoIds, batchSize);

  const allVideoMeta = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    // // sanity: show batch size and whether there are empties/dupes
    // const empties = batch.filter((v) => !String(v).trim()).length;
    // const uniqueInBatch = new Set(batch).size;

    console.log(chalk.cyan(`[videoData] batch ${i + 1}/${batches.length}`), `(${batch.length} ids)`);

    const result = await videoData(batch);
    const items = result.items.sort((a, b) => 
      (a.snippet.publishedAt > b.snippet.publishedAt) ? 1
      : (a.snippet.publishedAt < b.snippet.publishedAt) ? -1
      : 0
    )

    const itemsArr = Array.isArray(result?.items) ? result.items : [];
    console.log(chalk.magenta(`[videoData] batch ${i + 1} returned=${itemsArr.length}`));

    if (Array.isArray(items)) {
      console.log(chalk.yellow(`[videoData] batch ${i + 1} returned ${items.length} items`));
      // items.forEach((item, j) => console.log(`[${(j + 1).toString().padStart(2, " ")}]`, formatDuration(item.contentDetails.duration).display, formatPublishedDate(item.snippet.publishedAt), item.snippet.title))
      let desiredData = items.map(item => {
        return {
          channelId: item.snippet.channelId,
          channelTitle: item.snippet.channelTitle,
          // playlistId: playlist.id,
          videoId: item.id,
          publishedAt: item.snippet.publishedAt,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnails: item.snippet.thumbnails,
          tags: item.snippet.tags,
          duration: item.contentDetails.duration,
          views: item.statistics.viewCount,
          likes: item.statistics.likeCount,
          comments: item.statistics.commentCount,
        }
      })
      
    



      allVideoMeta.push(...desiredData);
    } else {
      // If videoData failed and returned undefined/null, you’ll see it
      console.log(chalk.yellow(`[videoData] batch ${i + 1} returned no items`));
    }

    if (i < batches.length - 1 && waitMs > 0) {
      await sleep(waitMs);
    }
  }

  console.log(`There are ${listOfPlaylists.length} playlists with a Total number of videoIds => ${videoIds.length} and a Total Number of Unique videoIds => ${uniqueVideoIds.length} meaning ${videoIds.length - uniqueVideoIds.length} were repeated.`)
  return {
    playlistCount: listOfPlaylists.length,
    itemCount: videoIds.length,
    uniqueVideoCount: uniqueVideoIds.length,
    allChannelVideos: allVideoMeta, // combined results from all batches
  };
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
    const allChannelData = await channelInfo(channelid)
    const listOfPlaylists = await getChannelPlaylists(channelid)
    const allPlaylistsData = await gatherAllPlaylistItems(listOfPlaylists);
    console.log(`Data for ${allPlaylistsData.allChannelVideos.length} youtube videos retrieved.`)
    console.log(allPlaylistsData.allChannelVideos[0])


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