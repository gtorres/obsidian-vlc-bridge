import test from "node:test";
import assert from "node:assert/strict";

import { getVlcExtraIntfArg } from "../src/vlcExtraIntf.mjs";

test("getVlcExtraIntfArg: macOS uses --extraintf=http", () => {
  assert.equal(getVlcExtraIntfArg({ isMacOS: true }), "--extraintf=http");
});

test("getVlcExtraIntfArg: macOS does not use --extraintf=luaintf:http", () => {
  assert.notEqual(getVlcExtraIntfArg({ isMacOS: true }), "--extraintf=luaintf:http");
});

test("getVlcExtraIntfArg: non-macOS (Windows/Linux) keeps --extraintf=luaintf:http", () => {
  assert.equal(getVlcExtraIntfArg({ isMacOS: false }), "--extraintf=luaintf:http");
});
