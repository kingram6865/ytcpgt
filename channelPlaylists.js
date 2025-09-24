import axios from 'axios'
import { videoData, channelData, playlistItems, channelSections } from './youtube/getData.js'
import { listPublishTitle } from './utilities/playlistParse.js'
const baseUrl = "https://youtube.googleapis.com/youtube/v3"

async function execute(input) {
  const videoInfo = await videoData(input)
  const channelInfo = await channelData(videoInfo[0].snippet.channelId)
  // return channelInfo.items;
  // const channelInfo = await channelSections(videoInfo[0].snippet.channelId)
  // const final = await playlistItems(channelInfo[0].id)
  // return channelInfo;
  const playlist = await playlistItems(channelInfo.items[0].contentDetails.relatedPlaylists.uploads)
  listPublishTitle(playlist);
}


execute(process.argv[2])
  // .then(x => {
  // //   console.log(x[0].id, x[0].contentDetails) ;
  //   x.items.forEach(element => {
  //     console.log(element.snippet.publishedAt, element.snippet.title)
  //   });
  // });