import test from "node:test";
import assert from "node:assert/strict";

import { findActiveTranscriptEntryIndex } from "../src/transcriptPlayback.ts";

test("findActiveTranscriptEntryIndex: empty entries returns null", () => {
  assert.equal(findActiveTranscriptEntryIndex([], 1000), null);
});

test("findActiveTranscriptEntryIndex: before the first entry's start returns null", () => {
  const entries = [{ from: 1000 }, { from: 2000 }];
  assert.equal(findActiveTranscriptEntryIndex(entries, 500), null);
});

test("findActiveTranscriptEntryIndex: exactly at the first entry's start activates it", () => {
  const entries = [{ from: 1000 }, { from: 2000 }];
  assert.equal(findActiveTranscriptEntryIndex(entries, 1000), 0);
});

test("findActiveTranscriptEntryIndex: between two entry starts keeps the earlier entry active", () => {
  const entries = [{ from: 1000 }, { from: 2000 }];
  assert.equal(findActiveTranscriptEntryIndex(entries, 1500), 0);
});

test("findActiveTranscriptEntryIndex: exactly at the next entry's start activates the next entry", () => {
  const entries = [{ from: 1000 }, { from: 2000 }];
  assert.equal(findActiveTranscriptEntryIndex(entries, 2000), 1);
});

test("findActiveTranscriptEntryIndex: after the final entry's start keeps the final entry active", () => {
  const entries = [{ from: 1000 }, { from: 2000 }];
  assert.equal(findActiveTranscriptEntryIndex(entries, 999999), 1);
});

test("findActiveTranscriptEntryIndex: forward seeking lands on the correct index", () => {
  const entries = [{ from: 0 }, { from: 1000 }, { from: 2500 }, { from: 4000 }];
  assert.equal(findActiveTranscriptEntryIndex(entries, 3999), 2);
});

test("findActiveTranscriptEntryIndex: backward seeking lands on the correct index", () => {
  const entries = [{ from: 0 }, { from: 1000 }, { from: 2500 }, { from: 4000 }];
  // Simulate playback that had advanced forward, then the user seeks back.
  assert.equal(findActiveTranscriptEntryIndex(entries, 4500), 3);
  assert.equal(findActiveTranscriptEntryIndex(entries, 1200), 1);
});

test("findActiveTranscriptEntryIndex: a realistic transcript timestamp sequence", () => {
  const entries = [
    { from: 4635172 },
    { from: 4638634 },
    { from: 4640761 },
    { from: 4643180 },
    { from: 4647059 },
  ];

  assert.equal(findActiveTranscriptEntryIndex(entries, 4600000), null);
  assert.equal(findActiveTranscriptEntryIndex(entries, 4635172), 0);
  assert.equal(findActiveTranscriptEntryIndex(entries, 4637000), 0);
  assert.equal(findActiveTranscriptEntryIndex(entries, 4640761), 2);
  assert.equal(findActiveTranscriptEntryIndex(entries, 4646000), 3);
  assert.equal(findActiveTranscriptEntryIndex(entries, 5000000), 4);
});
