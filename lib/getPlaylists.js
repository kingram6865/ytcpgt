import 'dotenv/config';
import axios from 'axios';
import { channelPlaylists } from '../youtube/getData.js';
import { formatPublishedDate } from '../utilities/tools.js';
import chalk from 'chalk';

async function showAllPlaylists(id) {
  const results = await channelPlaylists(id);
  return results;
}

showAllPlaylists(process.argv[2])
  .then(x => {
    x.sort((a, b) => (a.snippet.publishedAt > b.snippet.publishedAt) ? 1 : (a.snippet.publishedAt < b.snippet.publishedAt) ? -1 : 0)
    x.forEach(item => {
      console.log(chalk.ansi256(161)(item.id), chalk.ansi256(85)(formatPublishedDate(item.snippet.publishedAt)), chalk.ansi256(27)(item.snippet.title), `[${chalk.ansi256(227)(item.contentDetails.itemCount)} items in playlist]`)
    })
    // console.log(x.length, ' playlists')
    // console.log(x[0])
  })