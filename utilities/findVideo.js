import { FileManager } from "../lib/fileManager.js";

const rj = new FileManager('./data');
const dirName = process.argv[2].replace(/\./g, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g,'');
const searchTerm = new RegExp(process.argv[3]);
const data = await rj.readJSON('videos.json', dirName);

const matches = data.filter(item => searchTerm.test(item.title))
matches.forEach(element => {
  console.log(element.sequence.toString().padEnd(5, " "), element.url, element.published, element.duration, element.playlistTitle, element.title)
});
