import test from "node:test";
import assert from "node:assert/strict";
import { extractMegaEmbedSources, getMegaEmbedStreams, toMegaEmbedStream } from "../providers/megaembed.js";

const fixture = `<!doctype html><script>
var sources = [
  {"file":"https://cdn.example.org/movie.mp4","type":"mp4","label":"Opção 1"},
  {"file":"https://media.example.org/main.m3u8","type":"hls","label":"Opção 2"},
  {"file":"https://cdn.example.org/movie.mp4","type":"mp4","label":"Duplicada"},
  {"file":"http://unsafe.example.org/movie.mp4","type":"mp4","label":"HTTP"},
  {"file":"https://127.0.0.1/private.mp4","type":"mp4","label":"Privado"}
];
</script>`;

test("extractMegaEmbedSources reads the embedded JSON array", () => {
  const sources = extractMegaEmbedSources(fixture);
  assert.equal(sources.length, 5);
  assert.equal(sources[1].type, "hls");
});

test("toMegaEmbedStream creates neutral Nuvio stream records", () => {
  const stream = toMegaEmbedStream(
    { file: "https://cdn.example.org/movie.mp4", type: "mp4", label: "Opção 1" },
    "movie",
    634649,
  );
  assert.equal(stream.name, "🧭 Torrent Indexer\nOnline");
  assert.equal(stream.title, "Filme · Opção 1");
  assert.equal(stream.type, undefined);
  assert.match(stream.behaviorHints.bingeGroup, /^trainagain-embed-movie-634649-/);
});

test("toMegaEmbedStream rejects non-HTTPS and private destinations", () => {
  assert.equal(toMegaEmbedStream({ file: "http://cdn.example.org/a.mp4" }, "movie", 1), null);
  assert.equal(toMegaEmbedStream({ file: "https://127.0.0.1/a.mp4" }, "movie", 1), null);
  assert.equal(toMegaEmbedStream({ file: "https://localhost/a.mp4" }, "movie", 1), null);
});

test("getMegaEmbedStreams fetches only the fixed provider page and filters results", async () => {
  const requests = [];
  const fetchImpl = async (url, init) => {
    requests.push({ url, redirect: init.redirect });
    return new Response(fixture, { status: 200, headers: { "content-type": "text/html" } });
  };
  const streams = await getMegaEmbedStreams({ tmdbId: 634649, type: "movie", fetchImpl });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "https://megaembed.com/embed/634649");
  assert.equal(requests[0].redirect, "error");
  assert.equal(streams.length, 2);
  assert.equal(streams[1].type, "hls");
});

test("getMegaEmbedStreams requires season and episode for series", async () => {
  const streams = await getMegaEmbedStreams({ tmdbId: 1399, type: "series", season: null, episode: 1 });
  assert.deepEqual(streams, []);
});
