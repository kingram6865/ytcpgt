import { formatPublishedDate, formatDuration } from "./utilities/tools.js";
import { FileManager } from "./lib/fileManager.js";

const fm = new FileManager()
const data = await fm.readJSON(`${process.argv[2]}`)
// console.log(data)

data.sort((a,b) => (a.published > b.published) ? 1 : (a.published < b.published) ? -1 : 0)

data.forEach(element => {
  console.log(element.url, formatPublishedDate(element.published), formatDuration(element.duration).display, element.title)
});
