import test from "node:test";
import assert from "node:assert/strict";

import { buildTimestampLink, msToTimestamp } from "../src/linkFormat.ts";

test("buildTimestampLink: renders a working obsidian:// vlcBridge link, not a literal placeholder", () => {
  const link = buildTimestampLink({
    fromMs: 4635172,
    posFromPercent: 12.5,
    mediaPath: "/movies/example.mkv",
    subPath: "/movies/example.srt",
    subDelay: null,
    filename: "example.mkv",
    timestampLinktext: "{{timestamp}}",
    usePercentagePosition: false,
  });

  assert.equal(link.includes("{{timestamplink}}"), false);
  assert.equal(link.includes("{{timestamp}}"), false);
  assert.match(link, /^\[.+\]\(obsidian:\/\/vlcBridge\?.+\)$/);
});

test("buildTimestampLink: default/seconds mode generates a numeric seconds timestamp without %", () => {
  const link = buildTimestampLink({
    fromMs: 4635172,
    posFromPercent: 12.5,
    mediaPath: "/movies/example.mkv",
    subPath: "/movies/example.srt",
    subDelay: null,
    timestampLinktext: "{{timestamp}}",
    usePercentagePosition: false,
  });

  assert.match(link, /timestamp=4635\.172/);
  assert.equal(/timestamp=[^&)]*%/.test(link), false);
});

test("buildTimestampLink: percentage mode generates a percent timestamp", () => {
  const link = buildTimestampLink({
    fromMs: 4635172,
    posFromPercent: 12.5,
    mediaPath: "/movies/example.mkv",
    subPath: "/movies/example.srt",
    subDelay: null,
    timestampLinktext: "{{timestamp}}",
    usePercentagePosition: true,
  });

  assert.match(link, /timestamp=12\.5%25/);
});

test("buildTimestampLink: uses the entry's own time, not a shared/current player time (seconds mode)", () => {
  const earlyEntry = buildTimestampLink({
    fromMs: 1000,
    posFromPercent: 1,
    mediaPath: "/movies/example.mkv",
    subPath: "/movies/example.srt",
    subDelay: null,
    timestampLinktext: "{{timestamp}}",
    usePercentagePosition: false,
  });
  const laterEntry = buildTimestampLink({
    fromMs: 90000,
    posFromPercent: 90,
    mediaPath: "/movies/example.mkv",
    subPath: "/movies/example.srt",
    subDelay: null,
    timestampLinktext: "{{timestamp}}",
    usePercentagePosition: false,
  });

  assert.notEqual(earlyEntry, laterEntry);
  assert.match(earlyEntry, /00:01/);
  assert.match(laterEntry, /01:30/);
  assert.match(earlyEntry, /timestamp=1(?!\d)/);
  assert.match(laterEntry, /timestamp=90(?!\d)/);
});

test("buildTimestampLink: uses the entry's own time, not a shared/current player time (percentage mode)", () => {
  const earlyEntry = buildTimestampLink({
    fromMs: 1000,
    posFromPercent: 1,
    mediaPath: "/movies/example.mkv",
    subPath: "/movies/example.srt",
    subDelay: null,
    timestampLinktext: "{{timestamp}}",
    usePercentagePosition: true,
  });
  const laterEntry = buildTimestampLink({
    fromMs: 90000,
    posFromPercent: 90,
    mediaPath: "/movies/example.mkv",
    subPath: "/movies/example.srt",
    subDelay: null,
    timestampLinktext: "{{timestamp}}",
    usePercentagePosition: true,
  });

  assert.notEqual(earlyEntry, laterEntry);
  assert.match(earlyEntry, /timestamp=1%25/);
  assert.match(laterEntry, /timestamp=90%25/);
});

test("buildTimestampLink: substitutes {{filename}} and {{timestamp}} in the link text and escapes wikilink brackets", () => {
  const link = buildTimestampLink({
    fromMs: 65000,
    posFromPercent: 50,
    mediaPath: "/movies/example.mkv",
    subPath: "/movies/example.srt",
    subDelay: null,
    filename: "Show [2024].mkv",
    timestampLinktext: "{{filename}} @ {{timestamp}}",
    usePercentagePosition: false,
  });

  assert.match(link, /^\[Show ［2024］\.mkv @ 01:05\]/);
});

test("buildTimestampLink: includes subDelay param only when non-zero", () => {
  const withDelay = buildTimestampLink({
    fromMs: 1000,
    posFromPercent: 1,
    mediaPath: "/a.mkv",
    subPath: "/a.srt",
    subDelay: 500,
    timestampLinktext: "{{timestamp}}",
    usePercentagePosition: false,
  });
  const withoutDelay = buildTimestampLink({
    fromMs: 1000,
    posFromPercent: 1,
    mediaPath: "/a.mkv",
    subPath: "/a.srt",
    subDelay: 0,
    timestampLinktext: "{{timestamp}}",
    usePercentagePosition: false,
  });

  assert.match(withDelay, /subDelay=500/);
  assert.equal(withoutDelay.includes("subDelay"), false);
});

test("msToTimestamp: formats milliseconds into hh:mm:ss.mmm parts", () => {
  const result = msToTimestamp(65000);
  assert.equal(result.simplifiedWithoutMs, "01:05");
});
