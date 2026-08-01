import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const transcriptViewSrc = readFileSync(path.join(__dirname, "../src/transcriptView.ts"), "utf8");
const enLocaleSrc = readFileSync(path.join(__dirname, "../src/language/locale/en.ts"), "utf8");
const trLocaleSrc = readFileSync(path.join(__dirname, "../src/language/locale/tr.ts"), "utf8");

// The range-selection feature ("Set as start of range" / "Set as end of range")
// and the "Toggle dialogs in range" action lived entirely inline in
// TranscriptView with no DOM test harness in this repo, so these are static
// source assertions rather than a rendered-DOM check (see tests/rowInteraction.test.mjs
// and tests/transcriptPlayback.test.mjs for the extracted-helper pattern used elsewhere).

test("range-selection controls are no longer exposed in the Transcript View menus", () => {
  for (const label of ["Set as start of range", "Set as end of range", "Adjust range", "Toggle dialogs in range", "Select in range", "Deselect in range", "Copy dialogs in range"]) {
    assert.equal(transcriptViewSrc.includes(label), false, `expected "${label}" to be removed from transcriptView.ts`);
  }
});

test("range-only state and helpers are gone from TranscriptView", () => {
  for (const symbol of ["rangeMarker", "setRangeBtn", "updateRange", "addSelectLinesAction"]) {
    assert.equal(transcriptViewSrc.includes(symbol), false, `expected "${symbol}" to be removed from transcriptView.ts`);
  }
});

test("range-selection translation keys are removed from en/tr locales", () => {
  for (const key of ['"Adjust range"', '"Set as start of range"', '"Set as end of range"', '"Copy dialogs in range"', '"Toggle dialogs in range"', '"Select in range"', '"Deselect in range"']) {
    assert.equal(enLocaleSrc.includes(key), false, `expected ${key} to be removed from en.ts`);
    assert.equal(trLocaleSrc.includes(key), false, `expected ${key} to be removed from tr.ts`);
  }
});

test("unrelated copy, search, and follow controls remain wired", () => {
  for (const preserved of ["Copy selected dialogs", "Copy all", "Show current dialog", "Follow current dialog", "addFollowCurrentLineAction", "addSearchAction", "addRefreshAction"]) {
    assert.equal(transcriptViewSrc.includes(preserved), true, `expected "${preserved}" to remain in transcriptView.ts`);
  }
});

test("Transcript View can still render without the deleted range state (setTranscriptEl builds dialogsView without rangeMarker/setRangeBtn)", () => {
  const buildMatch = transcriptViewSrc.match(/setTranscriptEl\(\)\s*\{[\s\S]*?this\.dialogsView = dialogsView;/);
  assert.ok(buildMatch, "expected setTranscriptEl to still build this.dialogsView");
  assert.equal(buildMatch[0].includes("rangeMarker"), false);
  assert.equal(buildMatch[0].includes("setRangeBtn"), false);
});
