import test from "node:test";
import assert from "node:assert/strict";
import handler, { manifest, toStream } from "../server.js";

test("manifest declares Nuvio movie and series streams", () => {
  assert.equal(typeof handler, "function");
  assert.equal(manifest.id, "org.trainagain2.torrent-indexer-nuvio");
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
