import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const ADDON_ID = "org.trainagain2.torrent-indexer-nuvio";
const ADDON_NAME = "Torrent Indexer";
const ADDON_VERSION = "1.3.1";
const INDEXER_URL = "https://torrent-indexer.darklyn.org";
const CINEMETA_URL = "https://v3-cinemeta.strem.io";
const EXTERNAL_RESULTS_URL = "https://bestcine.dpdns.org";
const LOGO_PATH = fileURLToPath(new URL("./assets/torrent-indexer-logo.png", import.meta.url));
const LOGO_URL = "https://torrent-indexer-nuvio.vercel.app/assets/torrent-indexer-logo.png?v=1.3.1";
const MAX_RESULTS = 25;
const MAX_EXTERNAL_RESULTS = 60;
const REQUEST_TIMEOUT_MS = 15_000;

export const manifest = {
  id: ADDON_ID,
  version: ADDON_VERSION,
  name: ADDON_NAME,
  description: "Resultados de streaming online e BitTorrent para Nuvio.",
  logo: LOGO_URL,
  resources: [{ name: "stream", types: ["movie", "series"], idPrefixes: ["tt"] }],
  types: ["movie", "series"],
  catalogs: [],
  behaviorHints: { p2p: true },
};

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "Content-Type",
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

async function sendLogo(response) {
  try {
    const image = await readFile(LOGO_PATH);
    response.writeHead(200, {
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=31536000, immutable",
      "content-type": "image/png",
    });
    response.end(image);
  } catch {
    sendJson(response, 404, { error: "Logo not found" });
  }
}

function sendHtml(response, request) {
  const host = request.headers.host || "localhost:3000";
  const protocol = request.headers["x-forwarded-proto"] || "https";
  const manifestUrl = `${protocol}://${host}/manifest.json`;
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(`<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Torrent Indexer Nuvio</title></head><body style="margin:0;background:#0b0b0d;color:#f4f4f5;font:16px system-ui,sans-serif"><main style="max-width:720px;margin:auto;padding:64px 24px"><p style="color:#fb7185;letter-spacing:.12em;font-weight:700">TRAINAGAIN · NUVIO ADDON</p><h1 style="font-size:42px">Torrent Indexer</h1><p style="color:#bbb;line-height:1.6">Importe este URL no Nuvio em Perfil → Addons:</p><code style="display:block;overflow-wrap:anywhere;border:1px solid #333;border-radius:12px;padding:16px;background:#151519">${manifestUrl}</code><p style="color:#888;margin-top:32px">Use apenas conteúdo para o qual tem direitos de acesso.</p></main></body></html>`);
}

function normalizeId(rawId) {
  const match = decodeURIComponent(rawId).trim().match(/^(tt\d{5,12})(?::(\d+):(\d+))?$/i);
  if (!match) return null;
  return { imdbId: match[1].toLowerCase(), season: match[2], episode: match[3] };
}

function asTrackerSource(value) {
  const tracker = String(value || "").trim();
  return /^(https?|udp):\/\//i.test(tracker) ? `tracker:${tracker}` : null;
}

function sourceMetadata(result) {
  return [
    result.size ? `💾 ${result.size}` : null,
    Number.isFinite(result.seed_count) ? `👥 ${result.seed_count} seeds` : null,
    Array.isArray(result.audio) && result.audio.length ? `🌐 ${result.audio.join(", ")}` : null,
  ].filter(Boolean).join("  •  ");
}

export function toStream(result) {
  const infoHash = String(result.info_hash || "").trim().toLowerCase();
  const title = String(result.title || "").trim();
  if (!/^[a-f0-9]{40}$/.test(infoHash) || !title) return null;

  const sources = (Array.isArray(result.trackers) ? result.trackers : [])
    .map(asTrackerSource)
    .filter(Boolean)
    .slice(0, 20);
  const metadata = sourceMetadata(result);
  const stream = {
    name: "🧲 Torrent Indexer",
    title: metadata ? `${title}\n${metadata}` : title,
    infoHash,
    behaviorHints: { bingeGroup: `trainagain-${infoHash}` },
  };
  if (sources.length) stream.sources = sources;
  return stream;
}

function cleanPresentationText(value) {
  return String(value || "")
    .replace(/bestcine/gi, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function groupFragment(value) {
  return cleanPresentationText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "stream";
}

/** Convert an authorized external result into a neutral Nuvio stream label. */
export function toOnlineStream(result) {
  const url = String(result?.url || "").trim();
  if (!/^https?:\/\//i.test(url)) return null;

  const nameLines = cleanPresentationText(result?.name)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  const quality = nameLines.slice(1).join(" · ")
    || nameLines.find(line => !/bestcine/i.test(line))
    || "Online";
  const title = cleanPresentationText(result?.title) || "Stream online";

  return {
    name: `🧲 Torrent Indexer\n${quality}`,
    title,
    url,
    behaviorHints: {
      notWebReady: Boolean(result?.behaviorHints?.notWebReady),
      bingeGroup: `trainagain-online-${groupFragment(`${title}-${quality}`)}`,
    },
  };
}

async function getJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "TrainAgain-Nuvio-Addon/1.1",
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Upstream status ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function getStreams(type, rawId) {
  if (type !== "movie" && type !== "series") return [];
  const media = normalizeId(rawId);
  if (!media) return [];

  const meta = await getJson(`${CINEMETA_URL}/meta/${type}/${media.imdbId}.json`);
  const title = String(meta?.meta?.name || "").trim();
  if (!title) return [];

  const query = media.season && media.episode
    ? `${title} S${media.season.padStart(2, "0")}E${media.episode.padStart(2, "0")}`
    : title;
  const url = new URL("/search", INDEXER_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(MAX_RESULTS));

  const search = await getJson(url);
  const seen = new Set();
  return (Array.isArray(search?.results) ? search.results : [])
    .map(toStream)
    .filter(stream => stream && !seen.has(stream.infoHash) && seen.add(stream.infoHash));
}

async function getOnlineStreams(type, rawId) {
  if (type !== "movie" && type !== "series") return [];
  const media = normalizeId(rawId);
  if (!media) return [];

  const externalId = [media.imdbId, media.season, media.episode].filter(Boolean).join(":");
  const payload = await getJson(`${EXTERNAL_RESULTS_URL}/stream/${type}/${externalId}.json`);
  return (Array.isArray(payload?.streams) ? payload.streams : [])
    .map(toOnlineStream)
    .filter(Boolean)
    .slice(0, MAX_EXTERNAL_RESULTS);
}

async function getAllStreams(type, rawId) {
  const [onlineResult, torrentResult] = await Promise.allSettled([
    getOnlineStreams(type, rawId),
    getStreams(type, rawId),
  ]);
  const candidates = [
    ...(onlineResult.status === "fulfilled" ? onlineResult.value : []),
    ...(torrentResult.status === "fulfilled" ? torrentResult.value : []),
  ];
  const seen = new Set();
  return candidates.filter(stream => {
    const key = stream.url || stream.infoHash;
    return key && !seen.has(key) && seen.add(key);
  });
}

export const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "Content-Type",
    });
    response.end();
    return;
  }

  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (request.method !== "GET") return sendJson(response, 405, { error: "Method not allowed" });
  if (url.pathname === "/manifest.json") return sendJson(response, 200, manifest);
  if (url.pathname === "/assets/torrent-indexer-logo.png") return await sendLogo(response);
  if (url.pathname === "/healthz") return sendJson(response, 200, { status: "ok", addon: ADDON_ID, version: ADDON_VERSION });

  const streamRoute = url.pathname.match(/^\/stream\/(movie|series)\/(.+)\.json$/);
  if (streamRoute) {
    try {
      const streams = await getAllStreams(streamRoute[1], streamRoute[2]);
      return sendJson(response, 200, { streams });
    } catch (error) {
      console.error("Stream lookup failed:", error instanceof Error ? error.message : error);
      return sendJson(response, 200, { streams: [] });
    }
  }
  if (url.pathname === "/") return sendHtml(response, request);
  return sendJson(response, 404, { error: "Not found" });
});

/**
 * Vercel invokes the default export as a Node.js serverless function. The
 * same request listener is also used by the standalone local HTTP server.
 */
export default function handler(request, response) {
  server.emit("request", request, response);
}

if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  server.listen(Number(process.env.PORT || 3000));
}
