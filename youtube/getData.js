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
    return [];
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
    return { items: []}
  }
}

export async function playlistItems(id) {
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

  // const url = `https://youtube.googleapis.com/youtube/v3/playlistItems?maxResults=50&part=snippet,contentDetails,status&playlistId=${id}&key=${APIKEY}`
  try {
    // console.log(`Retrieving playlist ${id} page ${i}`)
    results = await axios.get(url)
    videoList = [...videoList, ...results.data.items]
    let nextpage = results.data.nextPageToken
    while (nextpage) {
      i = i + 1
      let newParams = new URLSearchParams({
        maxResults: 50,
        part: 'id,snippet,contentDetails,status',
        playlistId: id,
        key: APIKEY,
        pageToken: nextpage
      })
      let nextPageUrl = `${API}playlistItems?${newParams.toString()}`
      // console.log(`Retrieving playlist ${id} page ${i}`)
      let newResults = await axios.get(nextPageUrl)
      videoList.push(...newResults.data.items)
      nextpage = newResults.data.nextPageToken
    }
  } catch (err) {
    console.error('Failed to fetch playlist items: \n', err.message, JSON.stringify(err.response?.data, null, 2));
  }

  // videoList.sort((a,b) => (a.snippet.publishedAt > b.snippet.publishedAt) ? 1 : (a.snippet.publishedAt < b.snippet.publishedAt) ? -1 : 0)
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
  }
}

export async function channelPlaylists(id) {
  let playlists = [];
  let pageToken = null;
  let i = 0;

  do {
    const params = new URLSearchParams({
      part: 'snippet,contentDetails,id',
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
    // console.log(i, results.data.items.length)
  } while (pageToken);

  // console.log(playlists)
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