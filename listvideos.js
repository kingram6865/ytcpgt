import path from "node:path";
import { formatPublishedDate, formatDuration } from "./utilities/tools.js";
import { FileManager } from "./lib/fileManager.js";
import { getChannelOwner } from "./db/sqlLibrary.js";
import chalk from 'chalk';

const source = 55;
const database = 'random_facts';
const fm = new FileManager()

/*
  Usage:
    node listvideos.js <name>
    where name can be
      "<Channel Name>"
      "<directory name>"
      @custom url ==> This has to check the database and return owner_name
      path/to/videos.json

  Automatically reads: data/<name>/videos.json
  OR
  node listvideos.js data/<name>/videos.json
*/

function normalizeChannelDirectoryName(channelName) {
  return channelName
    .replace(/\./g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");
}

const input = process.argv[2];

if (input.includes("@")) {
  const channel = await getChannelOwner(input, source, database);

  console.log("Create function to get owner_name from database.", channel)
  process.exit(0);
}


if (!input) {
  console.error("Usage:");
  console.error('  node listvideos.js "Channel Name"');
  console.error("  node listvideos.js <directory name>");
  console.error("  node listvideos.js @custom url");
  console.error("  node listvideos.js path/to/videos.json");
  process.exit(1);
}

let jsonFile;

/* If the argument ends with .json assume it is a direct filename. */
if (input.toLowerCase().endsWith(".json")) {
  jsonFile = input;
} else {
  const dirName = normalizeChannelDirectoryName(input);
  jsonFile = path.join("data", dirName, "videos.json");
}

console.log(`Reading: ${jsonFile}`);

const data = await fm.readJSON(jsonFile);

data.sort((a,b) => (a.published > b.published) ? 1 : (a.published < b.published) ? -1 : 0);

data.forEach((element, index) => {
  let durationDisplay = "UNKNOWN";

  try {
    if (element.duration) {
      durationDisplay = chalk.ansi256(120)(formatDuration(element.duration).display);
    }
  } catch (err) {
    console.error(`Invalid duration at index ${index}:`, element.duration, element.url);
  }

  // console.log(element.url, formatPublishedDate(element.published), formatDuration(element.duration).display, element.title)
  console.log(
    chalk.ansi256(227)(formatPublishedDate(element.published)),
    chalk.ansi256(33)(element.url),
    `[${durationDisplay}] ${chalk.ansi256(69)(element.title)}`
  );

});

console.log(`===>\t[Total videos: ${data.length}]`);
