import 'dotenv/config';
import axios from 'axios';
const APIKEY = process.env.API_KEY2;

export async function videoData(id) {
  let results
  const url = `https://youtube.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${id}&key=${APIKEY}`
  try {
    results = await axios.get(url)
  } catch (err) {
    console.log(err)
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
    console.log(err)
  } finally {
    return results.data
  }
}

export async function playlistItems(id) {
  let results
  const url = `https://youtube.googleapis.com/youtube/v3/playlistItems?maxResults=50&part=snippet,contentDetails,status&playlistId=${id}&key=${APIKEY}`
  try {
    results = await axios.get(url)
  } catch (err) {
    console.log(err)
  } finally {
    return results.data
  } 
}