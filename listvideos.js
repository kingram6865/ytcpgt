import { formatPublishedDate } from "./utilities/tools.js";
import { FileManager } from "./lib/fileManager.js";

const fm = new FileManager()
const data = await fm.readJSON(`${process.argv[2]}`)
// console.log(data)

data.sort((a,b) => (a.snippet.publishedAt > b.snippet.publishedAt) ? 1 : (a.snippet.publishedAt < b.snippet.publishedAt) ? -1 : 0)

data.forEach(element => {
  console.log(element.snippet?.playlistId, element.contentDetails.videoId, formatPublishedDate(element.snippet.publishedAt), element.snippet.title)
});
