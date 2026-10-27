import chalk from "chalk";
import { FileManager } from "./lib/fileManager.js";
import { videoData, channelData, playlistItems, channelSections, getChannelId, channelPlaylists } from './youtube/getData.js'
import { parseYouTubeUrl } from "./youtube/utils.js";
import { formatDuration, formatPublishedDate, chunkArray, sleep, toTime } from "./utilities/tools.js";
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
  const result = await videoData(input);
  if (!result?.items?.length) throw new Error(`No accessible video found for ID: ${input}`);
  const output = {
    publishedAt: formatPublishedDate(result.items[0].snippet.publishedAt),
    channelId: result.items[0].snippet.channelId,
    title: result.items[0].snippet.title,
    description: result.items[0].snippet.description,
    thumbnails: result.items[0].snippet.thumbnails,
    channelTitle: result.items[0].snippet.channelTitle,
    tags: (result.items[0].snippet.tags ?? []).join(","),
    duration: formatDuration(result.items[0].contentDetails.duration),
    views: result.items[0].statistics.viewCount,
    comments: result.items[0].statistics.commentCount
  }

  console.log(output.duration, output.publishedAt, output.title)
  return output;
}

async function getPlaylistItems(id) {
  const videoInfoSet = await playlistItems(id);
  return videoInfoSet;
}

async function gatherAllPlaylistItems(listOfPlaylists) {
  const batchSize = 50;
  const waitMs = 600;

  // Map videoId -> best occurrence (newest playlist-added date)
  const bestOccByVideoId = new Map();
  let itemCount = 0;

  // 1) Collect playlist occurrences, keep only the newest per videoId
  for (const playlist of listOfPlaylists) {
    const allItems = await getPlaylistItems(playlist.id);

    for (const item of allItems) {
      const videoId = item?.contentDetails?.videoId;
      if (!videoId) continue;

      itemCount += 1;

      // This is the date that differs across occurrences
      const playlistAddedAt = item?.snippet?.publishedAt ?? null;

      const occ = {
        videoId,
        // playlist provenance
        playlistId: playlist.id,
        playlistTitle: playlist?.snippet?.title ?? null,
        playlistChannelTitle: playlist?.snippet?.channelTitle ?? null,
        // playlist item provenance
        playlistItemId: item?.id ?? null,
        playlistPosition: item?.snippet?.position ?? null,
        playlistAddedAt, // <-- used for dedupe choice
        // optional: keep if you want it in output
        videoPublishedAt: item?.contentDetails?.videoPublishedAt ?? null,
      };

      const prev = bestOccByVideoId.get(videoId);
      if (!prev) {
        bestOccByVideoId.set(videoId, occ);
        continue;
      }

      // Keep newest occurrence based on playlistAddedAt
      if (toTime(occ.playlistAddedAt) > toTime(prev.playlistAddedAt)) {
        bestOccByVideoId.set(videoId, occ);
      }
    }
  }

  const uniqueVideoIds = Array.from(bestOccByVideoId.keys());
  const batches = chunkArray(uniqueVideoIds, batchSize);
  const allChannelVideos = [];
  const missingVideoIds = [];

  // 2) Fetch videos.list data in batches and attach the best occurrence fields
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(chalk.cyan(`[videoData] batch ${i + 1}/${batches.length}`), `(${batch.length} ids)`);

    const result = await videoData(batch);
    const items = Array.isArray(result?.items) ? result.items : [];
    console.log(chalk.magenta(`[videoData] batch ${i + 1} returned=${items.length}`));

    const videoById = new Map(items.map((v) => [v.id, v]));

    // Track missing IDs (private/deleted/etc.)
    for (const vid of batch) {
      if (!videoById.has(vid)) missingVideoIds.push(vid);
    }

    // Build final outputs: one row per videoId (best occurrence only)
    for (const vid of batch) {
      const video = videoById.get(vid);
      if (!video) continue;

      const occ = bestOccByVideoId.get(vid);

      allChannelVideos.push({
        // --- chosen playlist provenance (newest occurrence) ---
        playlistId: occ.playlistId,
        playlistTitle: occ.playlistTitle,
        playlistChannelTitle: occ.playlistChannelTitle,
        playlistItemId: occ.playlistItemId,
        playlistPosition: occ.playlistPosition,
        playlistAddedAt: occ.playlistAddedAt,
        videoPublishedAt: occ.videoPublishedAt,

        // --- video resource fields ---
        videoId: video.id,
        channelId: video?.snippet?.channelId ?? null,
        channelTitle: video?.snippet?.channelTitle ?? null,
        publishedAt: video?.snippet?.publishedAt ?? null,
        title: video?.snippet?.title ?? null,
        description: video?.snippet?.description ?? null,
        thumbnails: video?.snippet?.thumbnails ?? null,
        tags: video?.snippet?.tags ?? null,
        duration: video?.contentDetails?.duration ?? null,
        views: video?.statistics?.viewCount ?? null,
        likes: video?.statistics?.likeCount ?? null,
        comments: video?.statistics?.commentCount ?? null,
      });
    }

    if (i < batches.length - 1 && waitMs > 0) {
      await sleep(waitMs);
    }
  }

  return {
    playlistCount: listOfPlaylists.length,
    itemCount,
    uniqueVideoCount: uniqueVideoIds.length,
    missingCount: missingVideoIds.length,
    missingVideoIds,
    allChannelVideos
  };
}


async function execute(input) {
  const lz = new FileManager('./data');
  // const result = await listTables(55, 'random_facts');
  // console.log('Query completed successfully');
  // console.log('Result:', result);
  // return result;
  let message = chalk.ansi256(86)("Retrieving data for")
  let dirName, test, urlType, result, output
  urlType = parseYouTubeUrl(input);
  if (!urlType) throw new Error(`Unsupported or incomplete YouTube URL: ${input ?? "(no input)"}`);

  if (urlType.type === 'video') {
    console.log(`${message} ${chalk.ansi256(214)("video Id:")} ${chalk.ansi256(184)(urlType.videoId)}`)
    const videoInfo = await getVideoInfo(urlType.videoId);
  } else if (urlType.type === 'channel-id') {
    console.log(`${message} ${chalk.ansi256(214)("channel Id:")} ${chalk.ansi256(184)(urlType.channelId)}`)
    const channelSections = await channelInfo(urlType.channelId)

  } else if (urlType.type === 'channel-handle') {
    const channelid = await getChannelId(urlType.handle)
    console.log(`${message} ${chalk.ansi256(214)("channel handle:")} ${chalk.ansi256(184)(urlType.handle)} and channel Id is ${chalk.ansi256(190)(channelid)}`)

    const listOfPlaylists = await getChannelPlaylists(channelid)
    const allPlaylistsData = await gatherAllPlaylistItems(listOfPlaylists);
    const channelTitle = listOfPlaylists[0]?.snippet?.channelTitle ?? channelid;
    const dirName = channelTitle.replaceAll('/', '_').replaceAll('\\', '_').replace(/[<>:"|?*\u0000-\u001F]/g, '_').replace(/\./g, '').replace(/\s+/g, '_').replace(/^_+|_+$/g, '') || channelid;

    console.log(`Data for a total of ${chalk.ansi256(77)(allPlaylistsData.allChannelVideos.length)} youtube videos retrieved.`)
    console.log(
      `There are ${allPlaylistsData.playlistCount} playlists consisting of`,
      `${allPlaylistsData.itemCount} total videoIds. There are`,
      `${allPlaylistsData.uniqueVideoCount} unique videoIds meaning`,
      `${allPlaylistsData.itemCount - allPlaylistsData.uniqueVideoCount} were repeated across the playlists.`
    );

    listOfPlaylists.forEach(playlist => {
      console.log(
        `Playlist ${chalk.ansi256(77)(playlist.id)}`,
        `named ${chalk.ansi256(81)(playlist.snippet.title)}`,
        `has ${chalk.ansi256(66)(playlist.contentDetails.itemCount)} items`
      )
    });

    console.log(chalk.ansi256(99)(`Results saved to`), `${chalk.ansi256(55)("./data/" + dirName + "/videos.json")}`)
    await lz.writeJSON(`videos.json`, allPlaylistsData, true, dirName);

  } else if (urlType.type === 'playlist') {
    console.log(`${message} ${chalk.ansi256(214)("playlist Id:")} ${chalk.ansi256(184)(urlType.playlistId)}`)
    const allPlaylistsData = await gatherAllPlaylistItems([{id: urlType.playlistId}]);
    allPlaylistsData.allChannelVideos.forEach(video => {
      console.log(video.title)
    })

  } else if (urlType.type === 'video-playlist') {
    console.log(`${message} ${chalk.ansi256(220)("playlist Id:")} ${chalk.ansi256(77)(urlType.playlistId)} videoId: ${urlType.videoId}, Position ${urlType.index}`)
    const allPlaylistsData = await gatherAllPlaylistItems([{id: urlType.playlistId}]);
    console.log(allPlaylistsData)
  }

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
