import { FileManager } from "./lib/fileManager.js";
import { getChannelId, channelData, channelPlaylists, playlistItems } from "./youtube/getData.js";
import { channelExists, getChannel, addChannel, addVideoBatch } from "./db/sqlLibrary.js";
import { closePool } from "./db/connection.js";
import { formatPublishedDate, gatherChannelDataForArchival, gatherVideoDataForArchival, deduplicateWithPriority } from "./utilities/tools.js";
import { enrichVideosWithYouTubeData } from "./youtube/enrichVideoData.js";
import { createVideoCollectionReport } from "./utilities/videoCollectionReport.js";
import chalk from "chalk";

const source = 55;
const database = 'random_facts';
let channel = process.argv[2];
let channelApiData, apiChannelId, channelobjid, apiChannelData

async function main() {
  const report = createVideoCollectionReport();
  const lz = new FileManager('./data');
  let channelDbData, playlists, chanName
  let allPlaylistItems = []
  if (/@/.test(channel)) {
    channel = await getChannelId(channel);
  } else {
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
    let childrenCount = chalk.ansi256(226)(items.length.toString().padStart(3, ' '));
    let published = chalk.ansi256(206)(formatPublishedDate(playlists[i].snippet.publishedAt));

    if (!Array.isArray(items) || items.length === 0) continue;

    console.log(`${id} ${published} (${childrenCount}) ${title}`)

    items?.forEach(item => {
      const playlistContext = {
        playlistId: playlists[i].id,
        playlistTitle: playlists[i].snippet.title,
      };

      const privacyStatus = item?.status?.privacyStatus;

      // if (privacyStatus !== "private") {
      //   report.addSkippedItem("private", item, {
      //     playlistId: playlists[i].id,
      //     playlistTitle: playlists[i].snippet.title,
      //   });

      //   return;
      // }

      const archivalItem = gatherVideoDataForArchival(
        item,
        channelobjid,
        playlists[i].snippet.title
      );

      if (!archivalItem?.videoId) {
        report.addSkippedItem("missing-videoId", item, playlistContext)
        return;
      }

      if (privacyStatus === "private") {
        report.addSkippedItem("private-but-has-videoId", item, playlistContext);
      }

      allPlaylistItems.push(archivalItem);
    })
  }

  allPlaylistItems.sort((a, b) => (a.published > b.published) ? 1 : (a.published < b.published) ? -1 : 0)

  const dedupedResults = deduplicateWithPriority(allPlaylistItems, "videoId")

  console.log(`# of Items after sort: ${allPlaylistItems.length}\n# of Items after deduplicate ${dedupedResults.length}`)
  const enrichedData = await enrichVideosWithYouTubeData(dedupedResults);

  enrichedData.sort((a, b) => (a.sequence > b.sequence) ? 1 : (a.sequence < b.sequence) ? -1 : 0)
  lz.writeJSON(`videos.json`, enrichedData, true, dirName)
  console.log(`${chalk.ansi256(226)(allPlaylistItems.length)} playlist items from ${chalk.ansi256(226)(playlists.length)} playlists with ${enrichedData.length} deduplicated items saved to ${chalk.ansi256(190)(`${dirName}/videos.json`)}`)

  if (report.hasSkippedItems()) {
    lz.writeJSON("skipped-items.json", report.getSkippedItems(), true, dirName);
    lz.writeJSON("skipped-summary.json", report.getSummary(), true, dirName);

    console.log("Skipped item summary:", report.getSummary());
  }

  const final = await closePool(source, database)
}

main()
