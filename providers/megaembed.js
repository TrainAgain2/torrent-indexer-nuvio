const MEGAEMBED_BASE_URL = "https://megaembed.com";
const MAX_RESPONSE_BYTES = 1_000_000;
const MAX_STREAMS = 8;

const requestHeaders = {
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "user-agent": "Mozilla/5.0 (compatible; TorrentIndexer/1.4)",
};

function isPublicHttpsUrl(value) {
  try {
    const url = new URL(String(value || ""));
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || !host || host === "localhost" || host.endsWith(".local")) return false;
    if (/^(?:0|10|127)\./.test(host) || /^169\.254\./.test(host) || /^192\.168\./.test(host)) return false;
    if (/^172\.(?:1[6-9]|2\d|3[0-1])\./.test(host) || host === "::1") return false;
    return true;
  } catch {
    return false;
  }
}

export function extractMegaEmbedSources(html) {
  const match = String(html || "").match(/var\s+sources\s*=\s*(\[[\s\S]*?\]);/i);
  if (!match) return [];
  try {
    const sources = JSON.parse(match[1]);
    return Array.isArray(sources) ? sources : [];
  } catch {
    return [];
  }
}

export function toMegaEmbedStream(source, type, tmdbId, season, episode) {
  const url = String(source?.file || "").trim();
  if (!isPublicHttpsUrl(url)) return null;

  const label = String(source?.label || "Opção").replace(/[\r\n]+/g, " ").trim().slice(0, 60) || "Opção";
  const format = String(source?.type || "online").toLowerCase();
  const mediaLabel = type === "series" ? `S${season} · E${episode}` : "Filme";

  return {
    name: "🧭 Torrent Indexer\nOnline",
    title: `${mediaLabel} · ${label}`,
    url,
    type: format === "hls" ? "hls" : undefined,
    behaviorHints: {
      bingeGroup: `trainagain-embed-${type}-${tmdbId}-${season || ""}-${episode || ""}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    },
  };
}

/**
 * Fetch only the fixed MegaEmbed page, parse its embedded JSON source list,
 * and return direct public HTTPS stream URLs. Returned stream URLs are never
 * fetched or followed by this server.
 */
export async function getMegaEmbedStreams({ tmdbId, type, season, episode, fetchImpl = fetch }) {
  if (!Number.isSafeInteger(Number(tmdbId)) || Number(tmdbId) <= 0) return [];
  if (type !== "movie" && type !== "series") return [];
  if (type === "series" && (!Number.isSafeInteger(Number(season)) || !Number.isSafeInteger(Number(episode)))) return [];

  const path = type === "movie"
    ? `/embed/${Number(tmdbId)}`
    : `/embed/${Number(tmdbId)}/${Number(season)}/${Number(episode)}`;
  const response = await fetchImpl(`${MEGAEMBED_BASE_URL}${path}`, {
    headers: requestHeaders,
    redirect: "error",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) return [];

  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_RESPONSE_BYTES) return [];
  const html = await response.text();
  if (html.length > MAX_RESPONSE_BYTES) return [];

  const seen = new Set();
  return extractMegaEmbedSources(html)
    .map(source => toMegaEmbedStream(source, type, Number(tmdbId), season, episode))
    .filter(stream => stream && !seen.has(stream.url) && seen.add(stream.url))
    .slice(0, MAX_STREAMS);
}
