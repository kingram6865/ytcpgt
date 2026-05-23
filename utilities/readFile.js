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

Object.entries(grouped)
  .sort((a, b) => a[0].localeCompare(b[0]))
  .forEach(([playlistTitle, items]) => {
    const sortedItems = items.sort((a, b) => a.sequence - b.sequence);
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📁 Playlist: ${playlistTitle} (${sortedItems.length} items)`);
    console.log(`${'='.repeat(80)}`);

    sortedItems.forEach((element, idx) => {
      console.log(
        `${(idx + 1).toString().padStart(3)}.`.padEnd(5), element.duration,
        `[${element.sequence}]`.padEnd(8), element.published, element.url,
        element.title
      );
    });
  });
