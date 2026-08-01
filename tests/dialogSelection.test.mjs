import test from "node:test";
import assert from "node:assert/strict";

import { filterSelectedDialogs, hasNoSelection } from "../src/dialogSelection.ts";

const makeDialog = (checked, label) => ({ checkbox: { checked }, label });

test("filterSelectedDialogs: defaults to excluding unselected dialogs", () => {
  const dialogs = [makeDialog(false, "a"), makeDialog(false, "b")];
  assert.deepEqual(filterSelectedDialogs(dialogs), []);
});

test("filterSelectedDialogs: includes a single selected dialog", () => {
  const dialogs = [makeDialog(false, "a"), makeDialog(true, "b"), makeDialog(false, "c")];
  assert.deepEqual(
    filterSelectedDialogs(dialogs).map((d) => d.label),
    ["b"]
  );
});

test("filterSelectedDialogs: excludes a dialog after it is deselected", () => {
  const dialogs = [makeDialog(true, "a"), makeDialog(false, "b")];
  dialogs[0].checkbox.checked = false;
  assert.deepEqual(filterSelectedDialogs(dialogs), []);
});

test("filterSelectedDialogs: preserves transcript order regardless of selection/click order", () => {
  const dialogs = [makeDialog(false, "a"), makeDialog(true, "b"), makeDialog(true, "c"), makeDialog(false, "d")];
  // simulate clicking "c" before "b"
  dialogs[2].checkbox.checked = true;
  dialogs[1].checkbox.checked = true;
  assert.deepEqual(
    filterSelectedDialogs(dialogs).map((d) => d.label),
    ["b", "c"]
  );
});

test("hasNoSelection: true when zero rows are selected", () => {
  const dialogs = [makeDialog(false, "a"), makeDialog(false, "b")];
  assert.equal(hasNoSelection(dialogs), true);
});

test("hasNoSelection: false when at least one row is selected", () => {
  const dialogs = [makeDialog(false, "a"), makeDialog(true, "b")];
  assert.equal(hasNoSelection(dialogs), false);
});

test("hasNoSelection: true for an empty transcript", () => {
  assert.equal(hasNoSelection([]), true);
});

// TranscriptView.setTranscriptEl rebuilds `dialogsView` with a brand-new array of
// freshly-created (unchecked) checkboxes on every call, so selection can never carry
// over from a prior build without any explicit reset logic.
test("rebuilding the transcript view yields fresh, unselected checkboxes with no carryover", () => {
  const before = [makeDialog(true, "a"), makeDialog(true, "b")];
  assert.equal(hasNoSelection(before), false);

  const rebuilt = [makeDialog(false, "a"), makeDialog(false, "b")];
  assert.equal(hasNoSelection(rebuilt), true);
});

// "Copy all" maps the full dialogsView directly and never reads `checkbox.checked`,
// so it must stay unaffected by selection state.
test("copy all is independent of checkbox state", () => {
  const dialogs = [makeDialog(true, "a"), makeDialog(false, "b"), makeDialog(true, "c")];
  const copyAllLabels = dialogs.map((d) => d.label);
  assert.deepEqual(copyAllLabels, ["a", "b", "c"]);
});
