import test from "node:test";
import assert from "node:assert/strict";

import { classifyVlcProbe, isVlcPlaylistResponse } from "../src/vlcProbe.ts";

test("isVlcPlaylistResponse accepts a VLC-shaped playlist body", () => {
  assert.equal(isVlcPlaylistResponse({ type: "node", children: [] }), true);
});

test("isVlcPlaylistResponse rejects bodies missing the VLC playlist shape", () => {
  assert.equal(isVlcPlaylistResponse({ ok: true }), false);
  assert.equal(isVlcPlaylistResponse({ type: "node" }), false);
  assert.equal(isVlcPlaylistResponse("<html>not vlc</html>"), false);
  assert.equal(isVlcPlaylistResponse(null), false);
  assert.equal(isVlcPlaylistResponse(undefined), false);
});

test("classifyVlcProbe: unused port is closed and safe to launch VLC on", () => {
  const result = classifyVlcProbe({ tcpReachable: false, requestFailed: false });
  assert.equal(result, "closed");
});

test("classifyVlcProbe: authenticated VLC endpoint is reused", () => {
  const result = classifyVlcProbe({
    tcpReachable: true,
    requestFailed: false,
    status: 200,
    json: { type: "node", children: [{ id: "1", children: [] }] },
  });
  assert.equal(result, "authenticated");
});

test("classifyVlcProbe: 401 from a VLC-like endpoint is unauthorized, not reused", () => {
  const result = classifyVlcProbe({ tcpReachable: true, requestFailed: false, status: 401 });
  assert.equal(result, "unauthorized");
});

test("classifyVlcProbe: 403 is also treated as unauthorized", () => {
  const result = classifyVlcProbe({ tcpReachable: true, requestFailed: false, status: 403 });
  assert.equal(result, "unauthorized");
});

test("classifyVlcProbe: occupied port serving unrelated HTTP 200 JSON is not reused", () => {
  const result = classifyVlcProbe({
    tcpReachable: true,
    requestFailed: false,
    status: 200,
    json: { message: "hello from some other service" },
  });
  assert.equal(result, "occupied");
});

test("classifyVlcProbe: occupied port returning malformed/non-JSON body is not reused", () => {
  const result = classifyVlcProbe({ tcpReachable: true, requestFailed: false, status: 200, json: "<html></html>" });
  assert.equal(result, "occupied");
});

test("classifyVlcProbe: request-level failure after a reachable TCP port is occupied, not closed", () => {
  const result = classifyVlcProbe({ tcpReachable: true, requestFailed: true });
  assert.equal(result, "occupied");
});

test("classifyVlcProbe: other non-VLC HTTP status codes are occupied", () => {
  const result = classifyVlcProbe({ tcpReachable: true, requestFailed: false, status: 500 });
  assert.equal(result, "occupied");
});
