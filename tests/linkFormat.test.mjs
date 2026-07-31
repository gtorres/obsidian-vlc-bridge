import test from "node:test";
import assert from "node:assert/strict";

import { buildTimestampLink, computeDialogSeekTarget, msToTimestamp } from "../src/linkFormat.ts";

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

test("computeDialogSeekTarget: jumpMiddleOfDialog disabled resolves to the entry start", () => {
  const entry = { from: 4000, to: 6000 };
  const result = computeDialogSeekTarget(entry, 100000, false);
  assert.equal(result.ms, 4000);
  assert.equal(result.percent, 4);
});

test("computeDialogSeekTarget: jumpMiddleOfDialog enabled resolves to the entry midpoint", () => {
  const entry = { from: 4000, to: 6000 };
  const result = computeDialogSeekTarget(entry, 100000, true);
  assert.equal(result.ms, 5000);
  assert.equal(result.percent, 5);
});

test("computeDialogSeekTarget: midpoint is rounded to the nearest millisecond", () => {
  const entry = { from: 1001, to: 1002 };
  const result = computeDialogSeekTarget(entry, 100000, true);
  assert.equal(result.ms, 1002); // Math.round(2003 / 2) = 1002
});

test("computeDialogSeekTarget: percentage mode stays consistent with the seek ms", () => {
  const entry = { from: 10000, to: 30000 };
  const lengthMs = 200000;
  const disabled = computeDialogSeekTarget(entry, lengthMs, false);
  const enabled = computeDialogSeekTarget(entry, lengthMs, true);

  assert.equal(disabled.percent, (disabled.ms / lengthMs) * 100);
  assert.equal(enabled.percent, (enabled.ms / lengthMs) * 100);
  assert.notEqual(disabled.ms, enabled.ms);
});

test("computeDialogSeekTarget: the rendered timestamp link and a row-seek call agree on the same target (seconds mode)", () => {
  const entry = { from: 4000, to: 8000 };
  const lengthMs = 100000;
  const jumpMiddleOfDialog = true;

  // What formatSubText/buildTimestampLink encodes into the {{timestamplink}} URI.
  const linkTarget = computeDialogSeekTarget(entry, lengthMs, jumpMiddleOfDialog);
  const link = buildTimestampLink({
    fromMs: linkTarget.ms,
    posFromPercent: linkTarget.percent,
    mediaPath: "/movies/example.mkv",
    subPath: "/movies/example.srt",
    subDelay: null,
    timestampLinktext: "{{timestamp}}",
    usePercentagePosition: false,
  });

  // What TranscriptView.seekToDialog computes for the same entry.
  const rowSeekTarget = computeDialogSeekTarget(entry, lengthMs, jumpMiddleOfDialog);

  assert.equal(rowSeekTarget.ms, linkTarget.ms);
  assert.match(link, new RegExp(`timestamp=${rowSeekTarget.ms / 1000}(?!\\d)`));
});

test("computeDialogSeekTarget: the rendered timestamp link and a row-seek call agree on the same target (percentage mode)", () => {
  const entry = { from: 4000, to: 8000 };
  const lengthMs = 100000;
  const jumpMiddleOfDialog = true;

  const linkTarget = computeDialogSeekTarget(entry, lengthMs, jumpMiddleOfDialog);
  const link = buildTimestampLink({
    fromMs: linkTarget.ms,
    posFromPercent: linkTarget.percent,
    mediaPath: "/movies/example.mkv",
    subPath: "/movies/example.srt",
    subDelay: null,
    timestampLinktext: "{{timestamp}}",
    usePercentagePosition: true,
  });

  const rowSeekTarget = computeDialogSeekTarget(entry, lengthMs, jumpMiddleOfDialog);

  assert.equal(rowSeekTarget.percent, linkTarget.percent);
  assert.match(link, new RegExp(`timestamp=${rowSeekTarget.percent}%25`));
});
