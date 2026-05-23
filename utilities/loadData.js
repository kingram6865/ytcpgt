import { FileManager } from "../lib/fileManager.js";

const rj = new FileManager('./data');
const dirName = process.argv[2].replace(/\./g, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g,'');

const data = await rj.readJSON('videos.json', dirName);

const grouped = data.reduce((acc, element) => {
  const title = element.playlistTitle || 'Uncategorized';
  if (!acc[title]) acc[title] = [];
  acc[title].push(element);
  return acc;
}, {});

return grouped;
