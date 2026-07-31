import test from "node:test";
import assert from "node:assert/strict";

import { isRowSeekTarget, isRowActivationKey, ROW_SEEK_IGNORE_SELECTOR } from "../src/rowInteraction.ts";

// Minimal fake DOM node: `tag` is checked against selectors via a naive
// substring match, good enough to exercise the tree-walking logic without
// pulling in jsdom.
const makeNode = (tag, parent = null) => ({
  tag,
  parentElement: parent,
  matches(selector) {
    return selector.split(",").some((part) => part.trim().replace(/\[.*\]/, "") === this.tag);
  },
});

test("isRowSeekTarget: the row element itself is a seek target", () => {
  const row = makeNode("div");
  assert.equal(isRowSeekTarget(row, row), true);
});

test("isRowSeekTarget: plain text/background nested inside the row is a seek target", () => {
  const row = makeNode("div");
  const span = makeNode("span", row);
  assert.equal(isRowSeekTarget(span, row), true);
});

test("isRowSeekTarget: a link (timestamp) nested in the row is not a seek target", () => {
  const row = makeNode("div");
  const text = makeNode("div", row);
  const link = makeNode("a", text);
  assert.equal(isRowSeekTarget(link, row), false);
});

test("isRowSeekTarget: a child of a nested button is not a seek target", () => {
  const row = makeNode("div");
  const button = makeNode("button", row);
  const icon = makeNode("svg", button);
  assert.equal(isRowSeekTarget(icon, row), false);
});

test("isRowSeekTarget: an interactive ancestor outside the row does not block the seek", () => {
  const outerButton = makeNode("button");
  const row = makeNode("div", outerButton);
  const span = makeNode("span", row);
  assert.equal(isRowSeekTarget(span, row), true);
});

test("isRowSeekTarget: null target is never a seek target", () => {
  const row = makeNode("div");
  assert.equal(isRowSeekTarget(null, row), false);
});

test("isRowSeekTarget: respects a custom interactive selector", () => {
  const row = makeNode("div");
  const custom = makeNode("checkbox-widget", row);
  assert.equal(isRowSeekTarget(custom, row, "checkbox-widget"), false);
  assert.equal(isRowSeekTarget(custom, row, ROW_SEEK_IGNORE_SELECTOR), true);
});

test("isRowActivationKey: Enter and Space activate", () => {
  assert.equal(isRowActivationKey("Enter"), true);
  assert.equal(isRowActivationKey(" "), true);
  assert.equal(isRowActivationKey("Spacebar"), true);
});

test("isRowActivationKey: other keys do not activate", () => {
  assert.equal(isRowActivationKey("Tab"), false);
  assert.equal(isRowActivationKey("a"), false);
  assert.equal(isRowActivationKey("Escape"), false);
});
