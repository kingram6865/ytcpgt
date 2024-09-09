import { formatSQL, executeSQL } from './connection.js';

export async function listTables() {
  let SQL = "show tables"
  let results = await executeSQL(SQL);
  return results;
}

export async function videoExists(videoid) {
  let exists = false
  let sql = `SELECT count(*) as dupes FROM youtube_downloads WHERE videoid = '${videoid}'`;
  let results = await executeSQL(sql)
  // console.log(`Video Exists: ${JSON.stringify(results)}`)
  if (results[0].dupes > 0) {
    exists = true
  }
  
  return exists;
}

export async function channelExists(channelid) {
  let exists = false;
  let sql = `SELECT COUNT(*) as dupes FROM youtube_channel_owners WHERE channel_id = '${channelid}'`;
  let results = await executeSQL(sql);
  // console.log(`Channel Exists: ${channelid} ${JSON.stringify(results)} ${results[0].dupes}`)
  if (results[0].dupes > 0) {
    exists = true
  }

  return exists;
}

export async function getChannel(channelid) {
  const sql = `SELECT * FROM youtube_channel_owners WHERE channel_id = '${channelid}'`
  let results = await executeSQL(sql)
  return results
}

export async function getVideo(id) {
  const sql = `SELECT * FROM youtube_downloads WHERE videoid = '${id}'`;
  let results = await executeSQL(sql);
  return results
}

export async function addChannel(data) {
  let values = [data.title, data.channelId, data.description, data.created, data.views, data.thumbnail]
  let sql = `INSERT INTO youtube_channel_owners (owner_name, channel_id, description, joined, views, thumbnail_link) VALUES (?, ?, ?, str_to_date(?, '%Y-%m-%d %H:%i:%s'), ?, ?)`;
  sql = formatSQL(sql, values)
  let results = await executeSQL(sql);
  return results
}

export async function addVideo(data, channelid) {
  let keywords = (data.keywords) ? data.keywords.join(",") : ""
  let values = [keywords, data.published, data.title, data.description, data.duration, data.url, channelid, data.rewatch, JSON.stringify(data.thumbnails)]
  let sql = `INSERT INTO youtube_downloads (keywords, upload_date, caption, description, play_length, url, channel_owner_id, status, rewatch, thumbnail) \
  VALUES (?, date_format(?, '%Y-%m-%d %r'), ?, ?, ?, ?, ?, 1, ?, ?)`;
  sql = formatSQL(sql, values)
  let results = await executeSQL(sql);
  return results
}