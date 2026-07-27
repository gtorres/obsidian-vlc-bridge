import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveMacOSVlcExecutable, isExecutableFile, DEFAULT_MACOS_VLC_PATH } from "../src/macVlcDetect.ts";

test("resolves the standard VLC.app executable when it exists and is executable", () => {
  const fsStub = {
    statSync: () => ({ isFile: () => true }),
    accessSync: () => undefined,
  };
  assert.equal(resolveMacOSVlcExecutable(DEFAULT_MACOS_VLC_PATH, fsStub as any), DEFAULT_MACOS_VLC_PATH);
});

test("returns null when the path does not exist", () => {
  const fsStub = {
    statSync: () => {
      throw new Error("ENOENT: no such file or directory");
    },
    accessSync: () => undefined,
  };
  assert.equal(resolveMacOSVlcExecutable(DEFAULT_MACOS_VLC_PATH, fsStub as any), null);
});

test("returns null when the path is not executable", () => {
  const fsStub = {
    statSync: () => ({ isFile: () => true }),
    accessSync: () => {
      throw new Error("EACCES: permission denied");
    },
  };
  assert.equal(resolveMacOSVlcExecutable(DEFAULT_MACOS_VLC_PATH, fsStub as any), null);
});

test("returns null when the path is not a regular file (e.g. a directory)", () => {
  const fsStub = {
    statSync: () => ({ isFile: () => false }),
    accessSync: () => undefined,
  };
  assert.equal(resolveMacOSVlcExecutable(DEFAULT_MACOS_VLC_PATH, fsStub as any), null);
});

test("isExecutableFile mirrors the same checks directly", () => {
  const fsStub = {
    statSync: () => ({ isFile: () => true }),
    accessSync: () => undefined,
  };
  assert.equal(isExecutableFile("/some/path", fsStub as any), true);
});
