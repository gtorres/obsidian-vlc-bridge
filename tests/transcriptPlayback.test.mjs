import test from "node:test";
import assert from "node:assert/strict";

import { findActiveTranscriptEntryIndex, ActiveTranscriptRowTracker } from "../src/transcriptPlayback.ts";

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

test("findActiveTranscriptEntryIndex: does not scan every entry (binary search, not a full-row iteration)", () => {
  const size = 100000;
  let fromReads = 0;
  // Each element's `from` is a getter so we can count exactly how many entries
  // the lookup touches — a full forEach/find scan would read O(n) of them.
  const entries = Array.from({ length: size }, (_, i) => ({
    get from() {
      fromReads++;
      return i * 10;
    },
  }));

  const index = findActiveTranscriptEntryIndex(entries, (size - 1) * 10 - 5);

  assert.equal(index, size - 2);
  assert.ok(fromReads < 25, `expected O(log n) reads for ${size} entries, got ${fromReads}`);
});

// ActiveTranscriptRowTracker — the framework-agnostic state machine behind the
// transcript view's active-row sync (see transcriptView.ts's pollPlaybackStatus).
// Modeling the request/resolve lifecycle here lets the sync behavior (including
// the pending-request guard and stale-response invalidation) be exercised
// without Obsidian or a DOM.

test("ActiveTranscriptRowTracker: active index changes from row A to row B", () => {
  const entries = [{ from: 0 }, { from: 1000 }, { from: 2000 }];
  const tracker = new ActiveTranscriptRowTracker();

  const tokenA = tracker.beginRequest();
  const resultA = tracker.resolve(tokenA, entries, 500);
  assert.equal(resultA.activeIndex, 0);
  assert.equal(resultA.changed, true);
  assert.equal(resultA.previousIndex, null);

  const tokenB = tracker.beginRequest();
  const resultB = tracker.resolve(tokenB, entries, 2500);
  assert.equal(resultB.activeIndex, 2);
  assert.equal(resultB.changed, true);
  assert.equal(resultB.previousIndex, 0);
  assert.equal(tracker.getActiveIndex(), 2);
});

test("ActiveTranscriptRowTracker: reports the previous and next index so callers touch only those two rows", () => {
  const entries = [{ from: 0 }, { from: 1000 }, { from: 2000 }];
  const tracker = new ActiveTranscriptRowTracker();

  tracker.resolve(tracker.beginRequest(), entries, 100);
  const result = tracker.resolve(tracker.beginRequest(), entries, 1500);

  assert.deepEqual(result, { changed: true, previousIndex: 0, activeIndex: 1 });
});

test("ActiveTranscriptRowTracker: unchanged active index reports changed:false (no DOM mutation should follow)", () => {
  const entries = [{ from: 0 }, { from: 1000 }, { from: 2000 }];
  const tracker = new ActiveTranscriptRowTracker();

  tracker.resolve(tracker.beginRequest(), entries, 500);
  const result = tracker.resolve(tracker.beginRequest(), entries, 900);

  assert.equal(result.changed, false);
  assert.equal(result.activeIndex, 0);
});

test("ActiveTranscriptRowTracker: playback before the first entry clears the active row", () => {
  const entries = [{ from: 1000 }, { from: 2000 }];
  const tracker = new ActiveTranscriptRowTracker();

  tracker.resolve(tracker.beginRequest(), entries, 1500);
  const result = tracker.resolve(tracker.beginRequest(), entries, 200);

  assert.equal(result.activeIndex, null);
  assert.equal(result.changed, true);
  assert.equal(result.previousIndex, 0);
});

test("ActiveTranscriptRowTracker: forward seek selects the correct later row", () => {
  const entries = [{ from: 0 }, { from: 1000 }, { from: 2500 }, { from: 4000 }];
  const tracker = new ActiveTranscriptRowTracker();

  tracker.resolve(tracker.beginRequest(), entries, 100);
  const result = tracker.resolve(tracker.beginRequest(), entries, 4200);

  assert.equal(result.activeIndex, 3);
  assert.equal(result.changed, true);
});

test("ActiveTranscriptRowTracker: backward seek selects the correct earlier row", () => {
  const entries = [{ from: 0 }, { from: 1000 }, { from: 2500 }, { from: 4000 }];
  const tracker = new ActiveTranscriptRowTracker();

  tracker.resolve(tracker.beginRequest(), entries, 4200);
  const result = tracker.resolve(tracker.beginRequest(), entries, 1200);

  assert.equal(result.activeIndex, 1);
  assert.equal(result.changed, true);
});

test("ActiveTranscriptRowTracker: paused playback still resolves the correct row from the current position", () => {
  const entries = [{ from: 0 }, { from: 1000 }, { from: 2000 }];
  const tracker = new ActiveTranscriptRowTracker();

  // Playback paused: position stays the same across repeated polling ticks.
  const first = tracker.resolve(tracker.beginRequest(), entries, 1200);
  const second = tracker.resolve(tracker.beginRequest(), entries, 1200);

  assert.equal(first.activeIndex, 1);
  assert.equal(second.activeIndex, 1);
  assert.equal(second.changed, false);
});

test("ActiveTranscriptRowTracker: wrong-media status (positionMs null) clears active state", () => {
  const entries = [{ from: 0 }, { from: 1000 }, { from: 2000 }];
  const tracker = new ActiveTranscriptRowTracker();

  tracker.resolve(tracker.beginRequest(), entries, 1500);
  const result = tracker.resolve(tracker.beginRequest(), entries, null);

  assert.equal(result.activeIndex, null);
  assert.equal(result.changed, true);
});

test("ActiveTranscriptRowTracker: a second request cannot begin while one is already pending (no overlapping requests)", () => {
  const tracker = new ActiveTranscriptRowTracker();

  const first = tracker.beginRequest();
  assert.notEqual(first, null);

  const second = tracker.beginRequest();
  assert.equal(second, null);
});

test("ActiveTranscriptRowTracker: resolving the pending request frees it up for the next tick", () => {
  const entries = [{ from: 0 }, { from: 1000 }];
  const tracker = new ActiveTranscriptRowTracker();

  const first = tracker.beginRequest();
  tracker.resolve(first, entries, 0);

  const second = tracker.beginRequest();
  assert.notEqual(second, null);
});

test("ActiveTranscriptRowTracker: invalidate() (view close/replace) prevents a later stale response from applying", () => {
  const entries = [{ from: 0 }, { from: 1000 }, { from: 2000 }];
  const tracker = new ActiveTranscriptRowTracker();

  tracker.resolve(tracker.beginRequest(), entries, 1500); // active row now index 1
  const staleToken = tracker.beginRequest(); // a request begins...

  tracker.invalidate(); // ...then the view closes/switches transcripts before it resolves

  const staleResult = tracker.resolve(staleToken, entries, 1999);
  assert.equal(staleResult, null); // stale response is ignored, not applied
  assert.equal(tracker.getActiveIndex(), null); // invalidate() reset state, the stale write did not resurrect it
});

test("ActiveTranscriptRowTracker: after invalidate(), a fresh request is accepted normally", () => {
  const entries = [{ from: 0 }, { from: 1000 }];
  const tracker = new ActiveTranscriptRowTracker();

  tracker.resolve(tracker.beginRequest(), entries, 500);
  tracker.invalidate();

  const token = tracker.beginRequest();
  const result = tracker.resolve(token, entries, 1200);
  assert.equal(result.activeIndex, 1);
  assert.equal(result.changed, true);
  assert.equal(result.previousIndex, null);
});
