import { FileManager } from "../lib/fileManager.js";
import { normalizeArchiveDirectoryName } from "../lib/archiveNames.js"; // ADDED: use the same directory normalization as the archive commands.

async function main() { // ADDED: validate the CLI directory argument before using it.
  const archiveName = process.argv[2]; // ADDED: read the archive directory argument.

  if (!archiveName) { // ADDED: handle a missing archive-directory argument.
    console.error('Usage: node utilities/loadData.js <archive-directory>'); // ADDED: show the required CLI argument.
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

  console.log(grouped); // CHANGED: print the grouped result because top-level `return` is invalid in an ES module.
}

await main(); // ADDED: run the argument-validated CLI entry point.
