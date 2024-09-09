import 'dotenv/config';
import axios from 'axios';
const APIKEY = process.env.API_KEY1;

export async function videoData(id) {
  let results
  const url = `https://youtube.googleapis.com/youtube/v3/videos?part=snippet%2CcontentDetails%2Cstatistics&id=${id}&key=${APIKEY}`
  try {
    results = await axios.get(url)
  } catch (err) {
    console.log(err)
  } finally {
    return results.data
  }  
}

export async function channelData(id) {
  let results
  const url = `https://youtube.googleapis.com/youtube/v3/channels?part=snippet%2CcontentDetails%2Cstatistics&id=${id}&key=${APIKEY}`
  try {
    results = await axios.get(url)
  } catch (err) {
    console.log(err)
  } finally {
    return results.data
  }
}