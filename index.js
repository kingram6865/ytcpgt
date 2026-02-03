import { getChannelId, channelData, channelPlaylists, playlistItems } from "./youtube/getData.js";
import { channelExists, getChannel, addChannel, addVideoBatch } from "./db/sqlLibrary.js";
import { closePool } from "./db/connection.js";
import { formatPublishedDate, gatherChannelDataForArchival, gatherVideoDataForArchival } from "./utilities/tools.js";
import chalk from "chalk";

const source = 55;
const database = 'test';
let channel = process.argv[2];
let channelApiData, apiChannelId, channelobjid, apiChannelData

async function main() {
  let channelDbData, playlists
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

    apiChannelData = gatherChannelDataForArchival(channelApiData.items[0])
    console.log(apiChannelData)
    let channelAdded = await addChannel(apiChannelData, source, database);
    channelobjid = channelAdded.insertId
    
    console.log(`objid: ${channelobjid}, Channel Id: ${apiChannelId}`)
  } else {
    channelDbData = await getChannel(channel, source, database);
    channelobjid = channelDbData.objid
    apiChannelId = channelDbData.channel_id
  } 

  playlists = await channelPlaylists(apiChannelId);
  playlists.sort((a, b) => (a.snippet.publishedAt > b.snippet.publishedAt) ? 1 : (a.snippet.publishedAt < b.snippet.publishedAt) ? -1 : 0)

  for (let i = 0; i < playlists.length; i++) {
    let insertDataList = []
    const items = await playlistItems(playlists[i].id);
    let id = chalk.ansi256(33)(playlists[i].id);
    let title = chalk.ansi256(118)(playlists[i].snippet.title);
    let childrenCount = chalk.ansi256(226)(playlists[i].contentDetails?.itemCount.toString().padStart(3, ' '));
    let published = chalk.ansi256(206)(formatPublishedDate(playlists[i].snippet.publishedAt));

    if (!Array.isArray(items) || items.length === 0) continue;

    console.log(`${id} ${published} (${childrenCount}) ${title}`)
    
    items?.forEach(item => {
      if (item.status.privacyStatus !== "private") {
        console.log("\t", `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`, item.snippet.title, `[${item.status.privacyStatus}]`)
        // insertDataList.push(gatherVideoDataForArchival(item, channelobjid));
      }
    })

    // console.log(insertDataList.length, items.length)

    // let results = await addVideoBatch(insertDataList, source, database);
    // console.log(results);
  }

  const final = await closePool(source, database)
  }

main()