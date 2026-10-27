import { FileManager } from "../lib/fileManager.js";
import { normalizeArchiveDirectoryName } from "../lib/archiveNames.js"; // ADDED: use the same directory normalization as the archive commands.

async function main() { // ADDED: validate the CLI directory argument before using it.
  const archiveName = process.argv[2]; // ADDED: read the archive directory argument.

  if (!archiveName) { // ADDED: handle a missing archive-directory argument.
    console.error('Usage: node utilities/readFile.js <archive-directory>'); // ADDED: show the required CLI argument.
    process.exitCode = 1; // ADDED: report invalid invocation to the calling shell.
    return; // ADDED: stop before constructing a path from a missing argument.
  }

  const rj = new FileManager('./data'); // CHANGED: initialize the file manager after argument validation.
  const dirName = normalizeArchiveDirectoryName(archiveName); // CHANGED: normalize the supplied archive name consistently with archive creation.
  const data = await rj.readJSON('videos.json', dirName); // CHANGED: read the archive after validating and normalizing its directory argument.

  const grouped = data.reduce((acc, element) => {
    const title = element.playlistTitle || 'Uncategorized';
    if (!acc[title]) acc[title] = [];
    acc[title].push(element);
    return acc;
  }, {});

  Object.entries(grouped)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([playlistTitle, items]) => {
      const sortedItems = items.sort((a, b) => { // CHANGED: handle missing playlist positions instead of treating null as position zero.
        if (a.sequence == null) return b.sequence == null ? 0 : 1; // ADDED: place items without positions after positioned items.
        if (b.sequence == null) return -1; // ADDED: keep positioned items ahead of items without positions.
        return a.sequence - b.sequence; // ADDED: order items with positions numerically.
      });
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📁 Playlist: ${playlistTitle} (${sortedItems.length} items)`);
      console.log(`${'='.repeat(80)}`);

      sortedItems.forEach((element, idx) => {
        console.log(
          `${(idx + 1).toString().padStart(3)}.`.padEnd(5), element.duration,
          `[${element.sequence ?? ''}]`.padEnd(8), element.published, element.url, // CHANGED: show an empty position label when sequence is missing.
          element.title
        );
      });
    });
}

await main(); // ADDED: run the argument-validated CLI entry point.
