import 'dotenv/config';
import axios from 'axios';
const API = "https://youtube.googleapis.com/youtube/v3/";
const APIKEY = process.env.API_KEY2;

export async function videoData(id) {
  let results
  const url = `https://youtube.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${id}&key=${APIKEY}`
  try {
    results = await axios.get(url)
  } catch (err) {
    console.error('Failed to fetch videoData:', err.message, err.response?.data);
  } finally {
    return results.data.items
  }  
}

export async function channelData(id) {
  let results
  const url = `https://youtube.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&id=${id}&key=${APIKEY}`
  try {
    results = await axios.get(url)
  } catch (err) {
    console.error('Failed to fetch ChannelData:', err.message, err.response?.data);
  } finally {
    return results.data
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
    console.log(`Retrieving page ${i}`)
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
      console.log(`Retrieving page ${i}`)
      let newResults = await axios.get(nextPageUrl)
      videoList.push(...newResults.data.items)
      nextpage = newResults.data.nextPageToken
    }
  } catch (err) {
    console.error('Failed to fetch playlist items:', err.message, err.response?.data);
  }

  videoList.sort((a,b) => (a.snippet.publishedAt > b.snippet.publishedAt) ? 1 : (a.snippet.publishedAt < b.snippet.publishedAt) ? -1 : 0)
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

async function nextPage(token) {

}