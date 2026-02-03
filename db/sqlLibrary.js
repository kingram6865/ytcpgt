import { formatSQL, executeSQL } from './connection.js';

export async function listTables(dbsrc, db) {
  let SQL = "show tables"
  let results = await executeSQL(SQL, dbsrc, db);
  return results.data;
}

export async function videoExists(videoid, dbsrc, db) {
  let exists = false
  let sql = `SELECT * FROM youtube_downloads WHERE videoid = '${videoid}'`;
  let results = await executeSQL(sql, dbsrc, db)
  
  if (results.success && results.data && results.data.length > 0) {
    exists = true;
  }
  
  results = {...results, exists};
  return results;
}

export async function channelExists(channelid, dbsrc, db) {
  let exists = false;
  let sql = `SELECT * FROM youtube_channel_owners WHERE channel_id = '${channelid}'`;
  let results = await executeSQL(sql, dbsrc, db);

  if (results.success && results.data && results.data.length > 0) {
    exists = true;
  }

  results = {...results, exists};
  return results;
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

  const results = await executeSQL(sql, dbsrc, db);
  return { ...results, objid: results.insertId };
}

export async function addVideo(data, channelid, dbsrc, db) {
  let keywords = (data.keywords) ? data.keywords.join(",") : ""
  let values = [keywords, data.published, data.title, data.description, data.duration, data.url, channelid, JSON.stringify(data.thumbnails), data.sequence, data.playlistid]
  let sql = `INSERT INTO youtube_downloads (keywords, upload_date, caption, description, play_length, url, channel_owner_id, thumbnail, status, rewatch, sequence, playlistid) \
  VALUES (?, date_format(?, '%Y-%m-%d %r'), ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`;
  sql = formatSQL(sql, values)

  let results = await executeSQL(sql, dbsrc, db);
  return results.data
}

export async function addVideoBatch(dataArray, dbsrc, db) {
  const params = [];
  const rowSql = `(?, date_format(?, '%Y-%m-%d %r'), ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`;
  const valuesSql = dataArray.map(() => rowSql).join(', ');

  const sql = `
    INSERT INTO youtube_downloads
      (keywords, upload_date, caption, description, play_length, url, channel_owner_id, thumbnail, status, rewatch, sequence, playlistid)
    VALUES ${valuesSql}`;
  
  for (const data of dataArray) {
    const keywords = Array.isArray(data?.keywords) ? data.keywords.join(',') : (data?.keywords ?? '');
    params.push(
      keywords,
      data?.published ?? null,
      data?.title ?? null,
      data?.description ?? null,
      data?.duration ?? null,
      data?.url ?? null,
      data.chanId,
      data?.thumbnails ? JSON.stringify(data.thumbnails) : null,
      data?.sequence ?? null,
      data?.playlistid ?? null
    );
  }

  const results = await executeSQL(sql, dbsrc, db, params);
  console.log(results)
  return results.data;
}

export async function ensureChannelObjid(channelId, channelInsertData, dbsrc, db) {
  // 1) Try fetch existing
  let existingSQL = `SELECT objid FROM youtube_channel_owners WHERE channel_id = ${channelId} LIMIT 1`
  const sel = await executeSQL(existingSQL, dbsrc, db);
  if (sel.rowCount > 0) return sel.data[0].objid;

  // 2) Insert, return insertId
  const ins = await addChannel(channelInsertData, dbsrc, db);
  return ins.objid; // using insertId from executeSQL
}
