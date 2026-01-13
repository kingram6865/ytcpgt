import "dotenv/config";
import { createYouTubeClient } from "./http.js";

const API = "https://youtube.googleapis.com/youtube/v3/";
const APIKEY = process.env.API_KEY2;

export const yt = createYouTubeClient({
  apiBase: API,
  apiKey: APIKEY,
});
