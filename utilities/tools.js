export function formatDuration(input){
  /**
   * Youtube metadata contains a duration field in the form PT99H99M99S
   * 
   * The duration data in the video data is in ISO 8601 format (https://www.w3.org/TR/NOTE-datetime)
   * E.g.: PT11M58S
   * 
   * This function converts it to a string of digits
   */

  let timeinfo = [];
  let timedata = input
  let matches =[/(\d+)H/,/(\d+)M/,/(\d+)S/];

  for (let k=0; k < matches.length; k++){
    timeinfo[k] = (timedata.match(matches[k])) ? timedata.match(matches[k])[1].padStart(2,'0') : '00';
  }

  return {default: timeinfo.join(""), display: timeinfo.join(":")};
}

export function formatPublishedDate(data) {
  const date = new Date(data)
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

export function gatherChannelDataForArchival(data) {
  // data.title, data.channelId, data.description, data.created, data.views, data.thumbnail, data.customUrl
  const result = {
    title: data.snippet.title, 
    channelId: data.id, 
    description: data.snippet.description, 
    created: data.snippet.publishedAt, 
    views: data.statistics.viewCount, 
    thumbnail: JSON.stringify(data.snippet.thumbnails), 
    customUrl: data.snippet.customUrl
  }

  return result;
}

export function gatherVideoDataForArchival(data, chanId, playlistTitle) {
  // const keywords = Array.isArray(data?.snippet?.keywords) ? data?.snippet?.keywords.join(',') : (data?.snippet?.keywords ?? '');
  const result = {
      keywords: null,
      published: formatPublishedDate(data?.snippet.publishedAt) ?? null,
      title: data?.snippet.title ?? null,
      description: data?.snippet.description ?? null,
      duration: null,
      url: `https://www.youtube.com/watch?v=${data?.snippet.resourceId.videoId ?? null}`,
      chanId,
      thumbnails: data?.snippet.thumbnails,
      sequence: data?.snippet.position ?? null,
      playlistid: data?.snippet.playlistId ?? null,
      playlistTitle
  }

  return result;
}

export function chunkArray(arr, size) {
  if (!Array.isArray(arr)) throw new TypeError('chunkArray: arr must be an array');
  if (!Number.isInteger(size) || size <= 0) throw new TypeError('chunkArray: size must be a positive integer');

  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function toTime (iso) {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : -Infinity;
};