import { FileManager } from "../lib/fileManager.js";
import { normalizeArchiveDirectoryName } from "../lib/archiveNames.js";

// const rj = new FileManager('./data');
// const dirName = process.argv[2].replace(/\./g, '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g,'');
// const searchTerm = new RegExp(process.argv[3]);
// const data = await rj.readJSON('videos.json', dirName);

// const matches = data.filter(item => searchTerm.test(item.title))
// matches.forEach(element => {
//   console.log(String(element.sequence ?? '').padEnd(5, " "), element.url, element.published, element.duration, element.playlistTitle, element.title);
// });

async function main() { // ADDED: validate CLI arguments before using them to construct paths or a regular expression.
  const archiveName = process.argv[2]; // ADDED: read the archive directory argument.
  const searchPattern = process.argv[3]; // ADDED: read the video-title search pattern.

  if (!archiveName || searchPattern === undefined) { // ADDED: handle a missing directory or search-pattern argument.
    console.error('Usage: node utilities/findVideo.js <archive-directory> <title-regex>'); // ADDED: show the required CLI arguments.
    process.exitCode = 1; // ADDED: report invalid invocation to the calling shell.
    return; // ADDED: stop before reading a path or compiling an absent pattern.
  }

  const rj = new FileManager('./data'); // CHANGED: initialize the file manager after argument validation.
  const dirName = normalizeArchiveDirectoryName(archiveName); // CHANGED: normalize the supplied archive name consistently with archive creation.
  const searchTerm = new RegExp(searchPattern); // CHANGED: compile the validated search-pattern argument.
  const data = await rj.readJSON('videos.json', dirName); // CHANGED: read the archive after validating and normalizing its directory argument.

  const matches = data.filter(item => searchTerm.test(item.title)); // CHANGED: keep the existing title-search behavior inside the CLI entry point.
  matches.forEach(element => {
    console.log(String(element.sequence ?? '').padEnd(5, " "), element.url, element.published, element.duration, element.playlistTitle, element.title) // CHANGED: display missing playlist positions without calling `toString()` on `null` or `undefined`.
  });
}

await main(); // ADDED: run the argument-validated CLI entry point.
