import test from "node:test";
import assert from "node:assert/strict";

import { toClipboardText, joinDialogsForClipboard } from "../src/clipboardFormat.ts";

// Fixture matching the reported failure shape: formatSubText wraps each physical
// line of a multiline subtitle entry in <span>...</span> so MarkdownRenderer keeps
// them on separate lines, but that markup ends up baked into formattedStr itself.
const multilineFormattedStr = "1. [00:00:01] >> [00:00:02]\n<span>line one</span>\n<span>line two</span>";

test("toClipboardText: strips <span> wrapper while preserving the line break within an entry", () => {
  const result = toClipboardText(multilineFormattedStr);
  assert.equal(result, "1. [00:00:01] >> [00:00:02]\nline one\nline two");
});

test("toClipboardText: no literal <span> markup survives in the output", () => {
  const result = toClipboardText(multilineFormattedStr);
  assert.equal(result.includes("<span>"), false);
  assert.equal(result.includes("</span>"), false);
});

test("toClipboardText: single-line entries are unchanged aside from the wrapper", () => {
  const singleLine = "1. [00:00:01] >> [00:00:02]\n<span>hello there</span>";
  assert.equal(toClipboardText(singleLine), "1. [00:00:01] >> [00:00:02]\nhello there");
});

test("toClipboardText: plain text with no span markup passes through untouched", () => {
  const plain = "1. [00:00:01] >> [00:00:02]\nhello there";
  assert.equal(toClipboardText(plain), plain);
});

test("toClipboardText: legitimate text containing < or > is not deleted", () => {
  const withAngleBrackets = "1. [00:00:01] >> [00:00:02]\n<span>5 < 10 and 10 > 5</span>";
  assert.equal(toClipboardText(withAngleBrackets), "1. [00:00:01] >> [00:00:02]\n5 < 10 and 10 > 5");
});

test("toClipboardText: snapshot placeholders are left for the existing expansion flow", () => {
  const withSnapshot = "1. [00:00:01] >> [00:00:02]\n<span>line one</span>\n{{snapshot}}";
  assert.equal(toClipboardText(withSnapshot), "1. [00:00:01] >> [00:00:02]\nline one\n{{snapshot}}");
});

test("toClipboardText: handles missing/empty content safely", () => {
  assert.equal(toClipboardText(""), "");
  assert.equal(toClipboardText(null), "");
  assert.equal(toClipboardText(undefined), "");
});

test("joinDialogsForClipboard: preserves transcript order across multiple entries", () => {
  const entries = ["1. entryA\n<span>a</span>", "2. entryB\n<span>b</span>", "3. entryC\n<span>c</span>"];
  const result = joinDialogsForClipboard(entries);
  assert.ok(result.indexOf("entryA") < result.indexOf("entryB"));
  assert.ok(result.indexOf("entryB") < result.indexOf("entryC"));
});

test("joinDialogsForClipboard: separator between entries is distinct from line breaks within an entry", () => {
  const entries = ["1. a\n<span>line one</span>\n<span>line two</span>", "2. b\n<span>only line</span>"];
  const result = joinDialogsForClipboard(entries);
  assert.equal(result, "1. a\nline one\nline two\n\n2. b\nonly line");
  // within-entry breaks stay single "\n"; the entry separator is a blank line "\n\n".
  assert.equal(result.includes("\n\n\n"), false);
});

test("joinDialogsForClipboard: never leaves literal span markup in a multi-entry copy", () => {
  const entries = ["1. a\n<span>line one</span>\n<span>line two</span>", "2. b\n<span>only line</span>"];
  const result = joinDialogsForClipboard(entries);
  assert.equal(result.includes("<span>"), false);
  assert.equal(result.includes("</span>"), false);
});

test("joinDialogsForClipboard: drops empty or missing optional entries safely", () => {
  const entries = ["1. a\n<span>a</span>", "", null, undefined, "2. b\n<span>b</span>"];
  const result = joinDialogsForClipboard(entries);
  assert.equal(result, "1. a\na\n\n2. b\nb");
});

test("joinDialogsForClipboard: is independent of any checkbox/selection state (Copy all semantics)", () => {
  // Mirrors TranscriptView's "Copy all", which maps dialogsView directly and never
  // reads checkbox.checked, so clean output must not depend on selection at all.
  const dialogs = [
    { checkbox: { checked: true }, formattedStr: "1. a\n<span>a</span>" },
    { checkbox: { checked: false }, formattedStr: "2. b\n<span>b</span>" },
  ];
  const result = joinDialogsForClipboard(dialogs.map((d) => d.formattedStr));
  assert.equal(result, "1. a\na\n\n2. b\nb");
});
