import { FileManager } from "./lib/fileManager.js";
import { getChannelId, channelData, channelPlaylists, playlistItems } from "./youtube/getData.js";
import { channelExists, getChannel, addChannel, addVideoBatch } from "./db/sqlLibrary.js";
import { closePool } from "./db/connection.js";
import { formatPublishedDate, gatherChannelDataForArchival, gatherVideoDataForArchival, deduplicateWithPriority } from "./utilities/tools.js";
import { enrichVideosWithYouTubeData } from "./youtube/enrichVideoData.js";
import chalk from "chalk";

const source = 55;
const database = 'random_facts';
let channel = process.argv[2];
let channelApiData, apiChannelId, channelobjid, apiChannelData

async function main() {
  const lz = new FileManager('./data');
  let channelDbData, playlists, chanName
  let allPlaylistItems = []
  if (/@/.test(channel)) {
    channel = await getChannelId(channel);
  } else {
    // console.log(channel.match(/http*\:\/\//))
    channel = channel.split('/')[4]
  }

  let channelExistence = await channelExists(channel, source, database);

  if (!channelExistence.exists) {
    channelApiData = await channelData(channel);
    apiChannelId = channelApiData.items[0].id
    chanName = channelApiData.items[0].snippet.title

    apiChannelData = gatherChannelDataForArchival(channelApiData.items[0])
    console.log(apiChannelData)
    let channelAdded = await addChannel(apiChannelData, source, database);
    channelobjid = channelAdded.insertId

    console.log(chalk.ansi256(184)(`objid: ${channelobjid}, Channel Id: ${apiChannelId} Channel Owner: ${chanName}`))
  } else {
    channelDbData = await getChannel(channel, source, database);
    channelobjid = channelDbData.objid
    apiChannelId = channelDbData.channel_id
    chanName = channelDbData.owner_name
    console.log(chalk.ansi256(184)(`objid: ${channelobjid}, Channel Id: ${apiChannelId}, Channel Owner: ${chanName}`))
  }

  playlists = await channelPlaylists(apiChannelId);
  playlists.sort((a, b) => (a.snippet.publishedAt > b.snippet.publishedAt) ? 1 : (a.snippet.publishedAt < b.snippet.publishedAt) ? -1 : 0)
  playlists.push({id: apiChannelId.replace("UC", "UU"), snippet: { title: "Uploads", publishedAt: new Date() }, status: { privacyStatus: "public"} })
  let dirName = chanName.replace(/\./g, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g,'');


  for (let i = 0; i < playlists.length; i++) {
    const items = await playlistItems(playlists[i].id);

    let id = chalk.ansi256(33)(`[${i.toString().padStart(3, ' ')}]`, playlists[i].id.padStart(35, ' '));
    let title = chalk.ansi256(118)(playlists[i].snippet.title);
    // let childrenCount = chalk.ansi256(226)(playlists[i].contentDetails?.itemCount.toString().padStart(3, ' '));
    let childrenCount = chalk.ansi256(226)(items.length.toString().padStart(3, ' '));
    let published = chalk.ansi256(206)(formatPublishedDate(playlists[i].snippet.publishedAt));

    if (!Array.isArray(items) || items.length === 0) continue;

    console.log(`${id} ${published} (${childrenCount}) ${title}`)

    items?.forEach(item => {
      const currentVideoId = item?.snippet?.resourceId?.videoId ??
        item?.contentDetails?.videoId ??
        null;

      if (currentVideoId === "3qzpLU8ATQQ") {
        console.log("FOUND RAW VIDEO:", {
          title: item?.snippet?.title,
          privacyStatus: item?.status?.privacyStatus,
          playlist: playlists[i].snippet.title,
          playlistId: playlists[i].id,
        });
      }




      if (item.status.privacyStatus !== "private") {
        // if (item.snippet.title.match('Leslie')) {
        //   console.log("\t", `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`, item.snippet.title, `[${item.status.privacyStatus}]`)
        // }
        const archivalItem = gatherVideoDataForArchival(item, channelobjid, playlists[i].snippet.title);
        // Skip malformed playlist entries that have no videoId
        if (!archivalItem?.videoId) {
          console.log(chalk.ansi256(196)(`Skipping item with missing videoId: ${item?.snippet?.title}`));
          return;
        }

        // allPlaylistItems.push(gatherVideoDataForArchival(item, channelobjid, playlists[i].snippet.title));
        allPlaylistItems.push(archivalItem);
      }
    })

    // console.log(insertDataList[0].playlistid, insertDataList[0].chanId, insertDataList[0].duration, insertDataList[0].title, insertDataList[0].keywords)

    // console.log(playlists[i].id, Object.keys(items[0]))
    // console.log(insertDataList.length, items.length)

    // let results = await addVideoBatch(insertDataList, source, database);
    // console.log(results);
  }

const existsAnywhere = allPlaylistItems.some(
  item => item.videoId === "3qzpLU8ATQQ"
);

console.log("VIDEO EXISTS ANYWHERE:", existsAnywhere);


  allPlaylistItems.sort((a, b) => (a.published > b.published) ? 1 : (a.published < b.published) ? -1 : 0)

  const traceVideoId = "3qzpLU8ATQQ";

  console.log("TRACE before dedupe:", allPlaylistItems.filter(
    item => item.videoId === traceVideoId
  ));


  const dedupedResults = deduplicateWithPriority(allPlaylistItems, "videoId")

  console.log("TRACE after dedupe:", dedupedResults.filter(
    item => item.videoId === traceVideoId
  ));


  console.log(`# of Items after sort: ${allPlaylistItems.length}\n# of Items after deduplicate ${dedupedResults.length}`)
  const enrichedData = await enrichVideosWithYouTubeData(dedupedResults);

  console.log("TRACE after enrich:", enrichedData.filter(
    item => item.videoId === traceVideoId
  ));


  enrichedData.sort((a, b) => (a.sequence > b.sequence) ? 1 : (a.sequence < b.sequence) ? -1 : 0)
  lz.writeJSON(`videos.json`, enrichedData, true, dirName)
  console.log(`${chalk.ansi256(226)(allPlaylistItems.length)} playlist items from ${chalk.ansi256(226)(playlists.length)} playlists with ${enrichedData.length} deduplicated items saved to ${chalk.ansi256(190)(`${dirName}/videos.json`)}`)

  // lz.writeJSON(`videos.json`, allPlaylistItems, true, dirName)
  // console.log(`${chalk.ansi256(226)(allPlaylistItems.length)} playlist items from ${chalk.ansi256(226)(playlists.length)} playlists, saved to ${chalk.ansi256(190)(`${dirName}/videos.json`)}`)

  const final = await closePool(source, database)
  }

main()
