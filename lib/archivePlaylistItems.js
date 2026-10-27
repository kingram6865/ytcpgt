import { videoData, channelData, playlistItems, channelSections, channelPlaylists } from '../youtube/getData.js'
import { channelExists, addChannel, addVideoBatch } from "../db/sqlLibrary.js";
import { closePool } from "../db/connection.js";
import { formatDuration } from "../utilities/tools.js";

const source = 55;
const database = 'test';

function buildVideoInsert(chanObjid, a, playlistEntriesById) {
  return a.map(item => {
    const playlistEntry = playlistEntriesById.get(item.id);
    return {
      chanId: chanObjid,
      keywords: (item) ? item.snippet?.tags : "",
      published: (item) ? item.snippet.publishedAt : "",
      title: (item) ? item.snippet.title : "",
      description: (item) ? item.snippet.description : "",
      duration: formatDuration((item) ? item.contentDetails.duration : "").default,
      url: `https://www.youtube.com/watch?v=${item.id}`,
      thumbnails: (item) ? item.snippet.thumbnails : "",
      sequence: playlistEntry?.snippet?.position ?? null,
      playlistid: playlistEntry?.snippet?.playlistId ?? null,
      notes: `Extracted from playlist processor`
    }
  });
}


async function insertNewVideos(channel, videoIdList, playlistEntriesById) {
  // let idlist
  // const BATCH_SIZE = 50;
  // let insertList = []

  // for (let i = 0; i < videoIdList.length; i += BATCH_SIZE) {
  //   idlist = videoIdList.slice(i, i + BATCH_SIZE);
  //   let apiResults = await videoData(idlist)

  //   insertList.push( ...(await buildVideoInsert(channel, apiResults)) )
  //   // insertList.push( ...apiResults)
  // }

  // // insertList.forEach((item, i) => console.log(`[${i}] (${item.url}) ${item.duration} ${item.title}`))
  // const insertResults = await addVideoBatch(insertList, source, database);
  const YT_MAX_IDS_PER_REQUEST = 50;
  for (let offset = 0; offset < videoIdList.length; offset += YT_MAX_IDS_PER_REQUEST) {
    const videoIdsBatch = videoIdList.slice(offset, offset + YT_MAX_IDS_PER_REQUEST);
    const videos = await videoData(videoIdsBatch);

    const videoItems = Array.isArray(videos?.items) ? videos.items : [];

    if (!videoItems.length) continue;

    const insertRows = await buildVideoInsert(channel, videoItems, playlistEntriesById);
    if (insertRows?.length) {
      await addVideoBatch(insertRows, source, database);
    }
  }
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
  // allVideos.sort((a, b) => (a.contentDetails.videoPublishedAt > b.contentDetails.videoPublishedAt) ? 1 : (a.contentDetails.videoPublishedAt < b.contentDetails.videoPublishedAt) ? -1 : 0)

  allVideos = allVideos.filter(v => {
    const title = v?.snippet?.title;
    return title !== 'Private video' && title !== 'Deleted video';
  });

  const seen = new Set();
  const deduped = [];
  let dupesRemoved = 0;

  for (const video of allVideos) {
    const videoId = video?.contentDetails?.videoId;
    if (!videoId) continue;

    if (seen.has(videoId)) {
      dupesRemoved++;
      continue;
    }

    seen.add(videoId);
    deduped.push(video);
  }

  allVideos = deduped;


  allVideos.sort((a, b) => (a.contentDetails.videoPublishedAt > b.contentDetails.videoPublishedAt) ? 1 : (a.contentDetails.videoPublishedAt < b.contentDetails.videoPublishedAt) ? -1 : 0)

  // allVideos.forEach((video, i) => {
  //   console.log(`[${i}]`, formatPublishedDate(video.contentDetails.videoPublishedAt), video.contentDetails.videoId, video.status.privacyStatus, video.snippet.title)
  // })

  console.log('global:', { total_after_flat: resolvedArray.flat().length, kept: allVideos.length, dupesRemoved });
  let videoids = allVideos.map(video => video.contentDetails.videoId)
  const playlistEntriesById = new Map(allVideos.map(video => [video.contentDetails.videoId, video]));
  let insertResults = await insertNewVideos(channelObjid, videoids, playlistEntriesById);
  console.log(`(archivePlaylistItems.js): ${JSON.stringify(insertResults, null, 2)}`);
  // const final = await closePool(source, database)
}

try {
  await execute(process.argv[2]);
} catch (err) {
  console.log(err);
  process.exitCode = 1;
} finally {
  await closePool(source, database);
}
