import { formatSQL, executeSQL } from './connection.js';

export async function listTables(dbsrc, db) {
  let SQL = "show tables"
  let results = await executeSQL(SQL, dbsrc, db);
  return results.data;
}

export async function videoExists(videoid, dbsrc, db) {
  let exists = false
  let sql = `SELECT count(*) as dupes FROM youtube_downloads WHERE videoid = '${videoid}'`;
  let results = await executeSQL(sql, dbsrc, db)
  
  if (results.success && results.data && results.data[0]?.dupes > 0) {
    exists = true;
  }
  
  return exists;
}

export async function channelExists(channelid, dbsrc, db) {
  let exists = false;
  let sql = `SELECT COUNT(*) as dupes FROM youtube_channel_owners WHERE channel_id = '${channelid}'`;
  let results = await executeSQL(sql, dbsrc, db);

  if (results.success && results.data && results.data[0]?.dupes > 0) {
    exists = true;
  }

  return exists;
}

export async function getChannel(channelid, dbsrc, db) {
  const sql = `SELECT * FROM youtube_channel_owners WHERE channel_id = '${channelid}'`
  let results = await executeSQL(sql, dbsrc, db)
  return results.data[0]
}

export async function getVideo(id, dbsrc, db) {
  const sql = `SELECT * FROM youtube_downloads WHERE videoid = '${id}'`;
  let results = await executeSQL(sql, dbsrc, db);
  return results.data
}

export async function addChannel(data, dbsrc, db) {
  let values = [data.title, data.channelId, data.description, data.created, data.views, data.thumbnail, data.customUrl]
  let sql = `INSERT INTO youtube_channel_owners (owner_name, channel_id, description, joined, views, thumbnail_link, custom_url) VALUES (?, ?, ?, str_to_date(?, '%Y-%m-%d %H:%i:%s'), ?, ?, ?)`;
  sql = formatSQL(sql, values)
  let results = await executeSQL(sql, dbsrc, db);
  return results.data
}

export async function addVideo(data, channelid, dbsrc, db) {
  let keywords = (data.keywords) ? data.keywords.join(",") : ""
  let values = [keywords, data.published, data.title, data.description, data.duration, data.url, channelid, JSON.stringify(data.thumbnails), data.sequence]
  let sql = `INSERT INTO youtube_downloads (keywords, upload_date, caption, description, play_length, url, channel_owner_id, thumbnail, status, rewatch, sequence) \
  VALUES (?, date_format(?, '%Y-%m-%d %r'), ?, ?, ?, ?, ?, ?, 1, 0, ?)`;
  sql = formatSQL(sql, values)
  // console.log(sql)
  let results = await executeSQL(sql, dbsrc, db);
  return results.data
}