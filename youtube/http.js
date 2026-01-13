import axios from "axios";

export function createYouTubeClient({ apiBase, apiKey, timeoutMs = 20000 } = {}) {
  if (!apiBase) throw new Error("createYouTubeClient: apiBase is required");
  if (!apiKey) throw new Error("createYouTubeClient: apiKey is required");

  const client = axios.create({
    baseURL: apiBase,
    timeout: timeoutMs,
  });

  // Always attach the API key + normalize params
  client.interceptors.request.use((config) => {
    config.params = config.params ?? {};
    config.params.key = apiKey;

    // Optional: small safeguard so params isn't accidentally a string
    if (typeof config.params === "string") {
      throw new TypeError("Axios config.params must be an object, not a string");
    }

    return config;
  });

  // Normalize Google/YouTube error reporting
  client.interceptors.response.use(
    (res) => res,
    (err) => {
      const status = err?.response?.status ?? null;
      const payload = err?.response?.data ?? null;
      const message =
        payload?.error?.message ??
        err?.message ??
        "Unknown YouTube API error";

      const e = new Error(message);
      e.status = status;
      e.payload = payload;
      throw e;
    }
  );

  return client;
}
