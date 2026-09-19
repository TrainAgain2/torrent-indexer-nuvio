import test from "node:test";
import assert from "node:assert/strict";
import handler, { externalStreamIds, manifest, toOnlineStream, toStream } from "../server.js";

test("manifest declares Nuvio movie and series streams", () => {
  assert.equal(typeof handler, "function");
  assert.equal(manifest.id, "org.trainagain2.torrent-indexer-nuvio");
  assert.equal(manifest.name, "Torrent Indexer");
  assert.equal(manifest.version, "1.4.5");
  assert.equal(
    manifest.logo,
    "https://torrent-indexer-nuvio.vercel.app/assets/torrent-indexer-logo.png?v=1.4.5",
  );
  assert.equal(manifest.behaviorHints.p2p, true);
  assert.deepEqual(manifest.types, ["movie", "series"]);
  assert.deepEqual(manifest.resources, [{ name: "stream", types: ["movie", "series"], idPrefixes: ["tt"] }]);
});

test("torrent result becomes a valid info-hash stream", () => {
  const stream = toStream({
    title: "Example.Movie.2026.1080p.mkv",
    info_hash: "0123456789abcdef0123456789abcdef01234567",
    size: "2 GB",
    seed_count: 7,
    audio: ["Português"],
    trackers: ["udp://tracker.example.org:1337/announce"],
  });
  assert.equal(stream.infoHash, "0123456789abcdef0123456789abcdef01234567");
  assert.equal(stream.sources[0], "tracker:udp://tracker.example.org:1337/announce");
  assert.match(stream.title, /2 GB/);
});

test("invalid torrent result is ignored", () => {
  assert.equal(toStream({ title: "No hash" }), null);
});
test("external source uses IMDb and TMDb together for movies", () => {
  assert.deepEqual(
    externalStreamIds("movie", { imdbId: "tt29512655" }, 1323244),
    ["tt29512655:1323244", "tt29512655"],
  );
  assert.deepEqual(externalStreamIds("movie", { imdbId: "tt29512655" }, null), ["tt29512655"]);
});
test("external source keeps native episode IDs for series", () => {
  assert.deepEqual(
    externalStreamIds("series", { imdbId: "tt0944947", season: "1", episode: "1" }, 1399),
    ["tt0944947:1:1"],
  );
});
test("online result uses a neutral presentation without an origin label", () => {
  const stream = toOnlineStream({
    name: "BestCine\n4K HDR",
    title: "🎬 BestCine Example Movie\n⚡ Servidor Online",
    url: "https://example.org/play/stream",
    behaviorHints: { notWebReady: true, bingeGroup: "bestcine-example" },
  });
  assert.equal(stream.name, "🧲 Torrent Indexer\n4K HDR");
  assert.doesNotMatch(stream.name, /bestcine/i);
  assert.doesNotMatch(stream.title, /bestcine/i);
  assert.match(stream.behaviorHints.bingeGroup, /^trainagain-online-/);
  assert.equal(stream.behaviorHints.notWebReady, true);
});

test("opaque direct MP4 links provide a response MIME hint", () => {
  const stream = toOnlineStream({
    name: "Online\n1080p",
    title: "Example Movie",
    url: "http://bestcine.duckdns.org:8080/?t=opaque-token",
  });
  assert.equal(stream.behaviorHints.proxyHeaders.response["Content-Type"], "video/mp4");
});

test("online result without an HTTP URL is ignored", () => {
  assert.equal(toOnlineStream({ name: "Online", url: "magnet:?xt=urn:btih:abc" }), null);
});
