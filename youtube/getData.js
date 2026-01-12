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
  
  const url = `https://youtube.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${idList}&key=${APIKEY}`

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

// export async function playlistItems(id) {
//   let results
//   let i = 1;
//   let videoList = []
  
//   const params = new URLSearchParams({
//     maxResults: 50,
//     part: 'id,snippet,contentDetails,status',
//     playlistId: id,
//     key: APIKEY
//   });

//   const url = `${API}playlistItems?${params}`

//   // const url = `https://youtube.googleapis.com/youtube/v3/playlistItems?maxResults=50&part=snippet,contentDetails,status&playlistId=${id}&key=${APIKEY}`
//   try {
//     console.log(`Retrieving playlist ${id} page ${i}`)
//     results = await axios.get(url)
//     videoList = [...videoList, ...results.data.items]
//     let nextpage = results.data.nextPageToken
//     while (nextpage) {
//       i = i + 1
//       let newParams = new URLSearchParams({
//         maxResults: 50,
//         part: 'id,snippet,contentDetails,status',
//         playlistId: id,
//         key: APIKEY,
//         pageToken: nextpage
//       })
//       let nextPageUrl = `${API}playlistItems?${newParams.toString()}`
//       console.log(`Retrieving playlist ${id} page ${i}`)
//       let newResults = await axios.get(nextPageUrl)
//       videoList.push(...newResults.data.items)
//       nextpage = newResults.data.nextPageToken
//     }
//   } catch (err) {
//     console.error('Failed to fetch playlist items:', err.message, err.response?.data);
//   }

//   videoList.sort((a,b) => (a.snippet.publishedAt > b.snippet.publishedAt) ? 1 : (a.snippet.publishedAt < b.snippet.publishedAt) ? -1 : 0)
//   return videoList;
// }

export async function playlistItems(id) {
  let results;
  let page = 1;

  // Accumulator
  const videoList = [];

  // Dedupe + filters
  const seenVideoIds = new Set();
  const BLOCKED_TITLES = new Set(['Private video', 'Deleted video']);
  let dupes = 0;
  let blocked = 0;

  const pushPage = (items = []) => {
    for (const item of items) {
     const title = item?.snippet?.title;

     // filter blocked titles early
      if (BLOCKED_TITLES.has(title)) {
        blocked++;
        continue;
      } 

      const videoId = item?.snippet?.resourceId?.videoId;
      if (!videoId) continue;

      // dedupe early
      if (seenVideoIds.has(videoId)) {
        dupes++;
        continue;
      }

      seenVideoIds.add(videoId);
      videoList.push(item);
    }
  }

  const baseParams = {
    maxResults: 50,
    part: 'id,snippet,contentDetails,status',
    playlistId: id,
    key: APIKEY
  };

  try {
    console.log(`Retrieving playlist ${id} page ${page}`);
    const url = `${API}playlistItems?${new URLSearchParams(baseParams)}`;
    results = await axios.get(url);

    pushPage(results.data.items);
    let nextpage = results.data.nextPageToken;

    while (nextpage) {
      page += 1;
      console.log(`Retrieving playlist ${id} page ${page}`);
      const nextUrl = `${API}playlistItems?${new URLSearchParams({
        ...baseParams,
        pageToken: nextpage
      }).toString()}`;

      const nextResults = await axios.get(nextUrl);
      pushPage(nextResults.data.items);
      nextpage = nextResults.data.nextPageToken;
    }

  } catch(err) {
    console.error('Failed to fetch playlist items:', err.message, err.response?.data);
  }

  if (blocked || dupes) {
    console.log(`Playlist ${id}: filtered=${blocked}, dupes_skipped=${dupes}, kept=${videoList.length}`);
  }

  videoList.sort((a, b) =>
    (a.snippet.publishedAt > b.snippet.publishedAt) ? 1 :
    (a.snippet.publishedAt < b.snippet.publishedAt) ? -1 : 0
  );

  return videoList
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
