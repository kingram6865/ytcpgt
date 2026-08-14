import chalk from 'chalk';
import { channelPlaylists, playlistItems } from '../youtube/getData.js';
import { formatPublishedDate } from '../utilities/tools.js';
import { normalizeArchiveDirectoryName } from './archiveNames.js';
import { archivePlaylistVideos } from './archiveVideos.js';
import { ensureChannelArchiveInfo } from './channelArchiveInfo.js';

export async function archiveChannel(channelId, { source, database }) {
  const { channelobjid, apiChannelId, chanName, apiChannelData } =
    await ensureChannelArchiveInfo(channelId, source, database);

  if (apiChannelData) console.log(apiChannelData);

  console.log(chalk.ansi256(184)(
    `objid: ${channelobjid}, Channel Id: ${apiChannelId}, Channel Owner: ${chanName}`
  ));

  const apiPlaylists = await channelPlaylists(apiChannelId);

  apiPlaylists.sort((a, b) =>
    (a.snippet.publishedAt > b.snippet.publishedAt) ? 1 :
      (a.snippet.publishedAt < b.snippet.publishedAt) ? -1 : 0
  );

  apiPlaylists.push({
    id: apiChannelId.replace('UC', 'UU'),
    snippet: {
      title: 'Uploads',
      publishedAt: new Date(),
    },
    status: {
      privacyStatus: 'public',
    },
  });

  const playlists = [];

  for (let i = 0; i < apiPlaylists.length; i++) {
    const playlist = apiPlaylists[i];
    const items = await playlistItems(playlist.id);

    if (!Array.isArray(items) || items.length === 0) continue;

    const id = chalk.ansi256(33)(
      `[${i.toString().padStart(3, ' ')}]`,
      playlist.id.padStart(35, ' ')
    );

    const title = chalk.ansi256(118)(playlist.snippet.title);
    const childrenCount = chalk.ansi256(226)(items.length.toString().padStart(3, ' '));
    const published = chalk.ansi256(206)(formatPublishedDate(playlist.snippet.publishedAt));

    console.log(`${id} ${published} (${childrenCount}) ${title}`);

    playlists.push({
      id: playlist.id,
      title: playlist.snippet.title,
      publishedAt: playlist.snippet.publishedAt,
      items,
    });
  }

  const dirName = normalizeArchiveDirectoryName(chanName);

  const result = await archivePlaylistVideos({
    playlists,
    channelobjid,
    dirName,
    listLabel: 'channel playlists',
  });

  console.log(
    `${chalk.ansi256(226)(result.allPlaylistItemCount)} playlist items from ` +
    `${chalk.ansi256(226)(result.playlistCount)} playlists with ` +
    `${result.dedupedCount} deduplicated items saved to ` +
    `${chalk.ansi256(190)(result.outputFile)}`
  );

  if (Object.keys(result.skippedSummary).length > 0) {
    console.log('Skipped item summary:', result.skippedSummary);
  }

  return result;
}
