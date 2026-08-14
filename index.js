import { closePool } from './db/connection.js';
import { getChannelId } from './youtube/getData.js';
import { resolveStartInput } from './utilities/youtubeInput.js';
import { archiveChannel } from './lib/archiveChannel.js';
import { archivePlaylist } from './lib/archivePlaylist.js';

const source = 55;
const database = 'random_facts';

function printUsage() {
  console.error('Usage:');
  console.error('  npm run start -- <channel-id>');
  console.error('  npm run start -- <channel-url>');
  console.error('  npm run start -- @handle');
  console.error('  npm run start -- <playlist-id>');
  console.error('  npm run start -- "https://www.youtube.com/playlist?list=<playlist-id>"');
}

async function main() {
  const input = resolveStartInput(process.argv[2]);

  if (input.type === 'missing') {
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (input.type === 'playlist') {
    await archivePlaylist(input.playlistId, { source, database });
    return;
  }

  if (input.type === 'channel-handle') {
    const channelId = await getChannelId(input.handle);
    await archiveChannel(channelId, { source, database });
    return;
  }

  if (input.type === 'channel') {
    await archiveChannel(input.channelId, { source, database });
    return;
  }

  throw new Error(`Unsupported input type: ${input.type}`);
}

try {
  await main();
} catch (err) {
  const status = err.response?.status ?? err.code;

  if (Number(status) >= 400 && Number(status) < 500) {
    console.error(`HTTP ${status} error`);

    const details =
      err.response?.data ??
      err.errors ??
      err.message ??
      err;

    if (typeof details === 'object') {
      console.error(JSON.stringify(details, null, 2));
    } else {
      console.error(details);
    }
  } else {
    console.error(err.message ?? err);
  }

  process.exitCode = 1;
} finally {
  await closePool(source, database);
}
