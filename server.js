import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const ADDON_ID = "org.trainagain2.torrent-indexer-nuvio";
const ADDON_NAME = "Torrent Indexer";
const ADDON_VERSION = "1.4.7";
const CINEMETA_URL = "https://v3-cinemeta.strem.io";
const EXTERNAL_RESULTS_URL = "https://bestcine.dpdns.org";
const LOGO_PATH = fileURLToPath(new URL("./assets/torrent-indexer-logo.png", import.meta.url));
const LOGO_URL = "https://torrent-indexer-nuvio.vercel.app/assets/torrent-indexer-logo.png?v=1.4.7";
const REQUEST_TIMEOUT_MS = 15_000;

export const manifest = {
  id: ADDON_ID,
  version: ADDON_VERSION,
  name: ADDON_NAME,
  description: "Resultados diretos e BitTorrent para Nuvio.",
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

function sendRedirect(response, destination) {
  response.writeHead(302, {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-expose-headers": "Location",
    "cache-control": "no-store",
    location: destination,
  });
  response.end();
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

function validTmdbId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? String(id) : null;
}

/** Build the externally supported ID without making a request to the media host. */
export function externalStreamId(type, media, tmdbId) {
  if (!media?.imdbId) return null;
  if (type === "movie") {
    const tmdb = validTmdbId(tmdbId);
    return tmdb ? `${media.imdbId}:${tmdb}` : media.imdbId;
  }
  if (type === "series" && media.season && media.episode) {
    return `${media.imdbId}:${media.season}:${media.episode}`;
  }
  return media.imdbId;
}

async function getJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json", "user-agent": "TrainAgain-Nuvio-Addon/1.1" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Upstream status ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The direct-stream host binds playback tokens to the requester IP. Redirecting
 * lets the Cinebox device request the stream list itself, so the returned token
 * remains valid when the player opens it. The Vercel app only retrieves TMDb
 * metadata for movie ID compatibility and never requests media tokens.
 */
async function directStreamListUrl(type, rawId) {
  if (type !== "movie" && type !== "series") return null;
  const media = normalizeId(rawId);
  if (!media) return null;

  let tmdbId = null;
  if (type === "movie") {
    const metadata = await getJson(`${CINEMETA_URL}/meta/movie/${media.imdbId}.json`);
    tmdbId = metadata?.meta?.moviedb_id;
  }
  const externalId = externalStreamId(type, media, tmdbId);
  return externalId
    ? `${EXTERNAL_RESULTS_URL}/stream/${type}/${encodeURIComponent(externalId)}.json`
    : null;
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
      const target = await directStreamListUrl(streamRoute[1], streamRoute[2]);
      if (!target) return sendJson(response, 200, { streams: [] });
      return sendRedirect(response, target);
    } catch (error) {
      console.error("Stream redirect failed:", error instanceof Error ? error.message : error);
      return sendJson(response, 200, { streams: [] });
    }
  }
  if (url.pathname === "/") return sendHtml(response, request);
  return sendJson(response, 404, { error: "Not found" });
});

/** Vercel invokes the default export as a Node.js serverless function. */
export default function handler(request, response) {
  server.emit("request", request, response);
}

if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  server.listen(Number(process.env.PORT || 3000));
}
