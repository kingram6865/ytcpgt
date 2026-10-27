import 'dotenv/config';
import axios from 'axios';
const API = "https://youtube.googleapis.com/youtube/v3/";
const APIKEY = process.env.API_KEY2;

export async function videoData(id) {
  let idList, results;

  if (Array.isArray(id)) {
    idList = id.join(',');
  } else {
    idList = id
  }

  const url = `${API}videos?part=snippet,contentDetails,statistics&id=${idList}&key=${APIKEY}`

  try {
    results = await axios.get(url)
    return results.data;
  } catch (err) {
    console.error('Failed to fetch videoData:', err.message, err.response?.data);
    throw err;;
  }
}

export async function channelData(id) {
  let results
  const url = `https://youtube.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&id=${id}&key=${APIKEY}`
  try {
    results = await axios.get(url)
    return results.data
  } catch (err) {
    console.error('Failed to fetch ChannelData:', err.message, err.response?.data);
    throw err;
  }
}

export async function playlistItems(id, onProgress = null) {
  let results
  let i = 1;
  let videoList = []

  const params = new URLSearchParams({
    maxResults: 50,
    part: 'id,snippet,contentDetails,status',
    playlistId: id,
    key: APIKEY
  });

  const url = `${API}playlistItems?${params}`

  onProgress?.(`Fetching playlist items for ${id}...`);

  try {
    results = await axios.get(url)

    // Return ALL playlist items.
    // Move filtering/reporting decisions to index.js.
    videoList.push(...results.data.items);
    onProgress?.(`Playlist ${id}: fetched ${videoList.length} items so far (page ${i}).`);

    let nextpage = results.data.nextPageToken
    const seenPageTokens = new Set();
    while (nextpage) {
      if (seenPageTokens.has(nextpage)) {
        const warning = `YouTube repeated a playlist page token for ${id}; stopping pagination after ${videoList.length} items and continuing with the items fetched so far.`; // CHANGED: keep the already-fetched playlist items available for archiving.
        if (onProgress) onProgress(`Warning: ${warning}`); // ADDED: report the pagination issue through the CLI progress output.
        else console.warn(warning); // ADDED: report the issue when no progress callback was supplied.
        break; // CHANGED: stop the repeated-token loop without discarding fetched playlist items.
      }
      seenPageTokens.add(nextpage);
      i = i + 1
      let newParams = new URLSearchParams({
        maxResults: 50,
        part: 'id,snippet,contentDetails,status',
        playlistId: id,
        key: APIKEY,
        pageToken: nextpage
      })

      let nextPageUrl = `${API}playlistItems?${newParams.toString()}`
      let newResults = await axios.get(nextPageUrl)

      const pageItems = newResults.data.items ?? [];
      videoList.push(...newResults.data.items);
      onProgress?.(`Playlist ${id}: fetched ${videoList.length} items total (${pageItems.length} on (page ${i}).`);
      nextpage = newResults.data.nextPageToken ?? null;
    }
  } catch (err) {
    console.error('Failed to fetch playlist items: \n', err.message, JSON.stringify(err.response?.data, null, 2));
    throw err;
  }

  return videoList;
}

export async function channelSections(id) {
  let results;
  const params = new URLSearchParams({
    part: "snippet,contentDetails,id",
    channelId: id,
    key: APIKEY
  })

  const url = `${API}channelSections?${params.toString()}`;

  try {
    results = await axios.get(url)
    return results.data.items;
  } catch(err) {
    console.error('Failed to fetch channelSections items:', err.message, err.response?.data);
    throw err;
  }
}

export async function channelPlaylists(id, onProgress = null) {
  // console.log(id.replace("UC", "UU"))
  // let playlists = [id.replace("UC", "UU")];
  let playlists = [];
  let pageToken = null;
  let i = 0;

  do {
    const params = new URLSearchParams({
      part: 'snippet,contentDetails,id,status',
      maxResults: 50,
      key: APIKEY,
      channelId: id,
      ...(pageToken && {pageToken})
    });

    const url = `${API}playlists?${params.toString()}`;

    const results = await axios.get(url)
    playlists = [ ...playlists, ...results.data.items]
    pageToken = results.data.nextPageToken ?? null;
    i++;
    onProgress?.(`Channel playlists: fetched ${playlists.length} so far (page ${i}).`);

  } while (pageToken);

  return playlists;
}

export async function getChannelId(handle) {
  const params = new URLSearchParams({
    part: "id",
    forHandle: handle.replace(/^.*@/, ""),
    key: APIKEY
  }).toString();

  const url = `${API}channels?${params}`
  const { data } = await axios.get(url)

  if (!data.items?.length) {
    throw new Error(`Channel not found for handle: ${handle}`);
  }

  return data.items[0].id;
}

export async function getChannelUploads(channel, onProgress = null) {
  const channelInfo = await channelData(channel);
  const playlistId = channelInfo?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!playlistId) {
    throw new Error(`Uploads playlist not found for channel: ${channel}`); // fail clearly if the channel response has no uploads playlist.
  }

  const playlistItems = [];
  let pageToken = null;
  let page = 0;

  do {
    const params = new URLSearchParams({
      part: 'snippet,contentDetails,status',
      playlistId,
      maxResults: 50,
      key: APIKEY,
      channelId: channel,
      ...(pageToken && {pageToken})
    });

    const url = `${API}playlistItems?${params.toString()}`;
    const results = await axios.get(url);

    playlistItems.push(...(results.data.items ?? []));

    pageToken = results.data.nextPageToken ?? null;
    page++;
    onProgress?.(`Uploads playlist ${playlistId}: fetched ${playlistItems.length} items so far (page ${page}).`); // report successful completion of each uploads page.
    pageToken = results.data.nextPageToken ?? null;
  } while (pageToken);

  // return playlists;
  return playlistItems;
}

/**
 * Fetch video details from YouTube API
 * @param {Array<string>} videoIds - Array of video IDs (max 50)
 * @returns {Promise<Object>} - Object mapping videoId to details
 */
export async function fetchVideoDetails(videoIds) {
  const idsParam = videoIds.join(',');
  const url = `${API}videos?part=snippet,contentDetails&id=${idsParam}&key=${APIKEY}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const result = {};

  if (data.items && Array.isArray(data.items)) {
    data.items.forEach(item => {
      result[item.id] = {
        tags: item.snippet?.tags?.join(",") || [],
        duration: item.contentDetails?.duration ?? null
      };
    });
  }

  return result;
}

export async function playlistData(id) {
  const params = new URLSearchParams({
    part: 'snippet,contentDetails,status',
    id,
    key: APIKEY
  });

  const url = `${API}playlists?${params.toString()}`;

  try {
    const results = await axios.get(url);
    return results.data;
  } catch (err) {
    console.error('Failed to fetch playlistData:', err.message, err.response?.data);
    throw err;
  }
}
