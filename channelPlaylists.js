import { FileManager } from "./lib/fileManager.js";
import { videoData, channelData, playlistItems, channelSections } from './youtube/getData.js'
const baseUrl = "https://youtube.googleapis.com/youtube/v3"

async function execute(input) {
  // const result = await listTables(55, 'random_facts');
  // console.log('Query completed successfully');
  // console.log('Result:', result);
  // return result;
  let dirName
  const lz = new FileManager('./data')
  const videoInfo = await videoData(input)
  const channelInfo = await channelData(videoInfo[0].snippet.channelId)
  // console.log(channelInfo.items[0].contentDetails)
  dirName = channelInfo.items[0].snippet.title.replace(/\./g, '').replace(/\s+/g, '_');
  Object.keys(channelInfo.items[0].contentDetails.relatedPlaylists).forEach(l => {
    let plId = channelInfo.items[0].contentDetails.relatedPlaylists[l]
    if (plId) {
      console.log(`${plId} => ${channelInfo.items[0].snippet.title}`)
    }
  })

  const playlist = await playlistItems(channelInfo.items[0].contentDetails.relatedPlaylists.uploads)
  lz.writeJSON(`videos.json`, playlist, true, dirName)
}


await execute(process.argv[2])
  // .then(x => {
  // //   console.log(x[0].id, x[0].contentDetails) ;
  //   x.items.forEach(element => {
  //     console.log(element.snippet.publishedAt, element.snippet.title)
  //   });
  // });