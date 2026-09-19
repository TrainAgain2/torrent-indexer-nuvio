import test from "node:test";
import assert from "node:assert/strict";
import handler, { externalStreamId, manifest } from "../server.js";

test("manifest declares Nuvio movie and series streams", () => {
  assert.equal(typeof handler, "function");
  assert.equal(manifest.id, "org.trainagain2.torrent-indexer-nuvio");
  assert.equal(manifest.name, "Torrent Indexer");
  assert.equal(manifest.version, "1.4.7");
  assert.equal(
    manifest.logo,
    "https://torrent-indexer-nuvio.vercel.app/assets/torrent-indexer-logo.png?v=1.4.7",
  );
  assert.equal(manifest.behaviorHints.p2p, true);
  assert.deepEqual(manifest.types, ["movie", "series"]);
  assert.deepEqual(manifest.resources, [{ name: "stream", types: ["movie", "series"], idPrefixes: ["tt"] }]);
});

test("movies use IMDb and TMDb identifiers on the client-side stream request", () => {
  assert.equal(
    externalStreamId("movie", { imdbId: "tt29512655" }, 1323244),
    "tt29512655:1323244",
  );
  assert.equal(externalStreamId("movie", { imdbId: "tt29512655" }, null), "tt29512655");
});

test("series preserve the native IMDb season and episode format", () => {
  assert.equal(
    externalStreamId("series", { imdbId: "tt0944947", season: "1", episode: "1" }),
    "tt0944947:1:1",
  );
});

test("invalid media produces no external stream identifier", () => {
  assert.equal(externalStreamId("movie", null, 1323244), null);
});
