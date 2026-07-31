import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { findMatchingSubtitleFile, autoLoadMatchingSubtitle, subtitleExtensionPriority } from "../src/subtitleMatch.ts";

test("subtitleExtensionPriority matches the plugin parser's supported formats, in priority order .srt > .vtt > .ass", () => {
  assert.deepEqual(subtitleExtensionPriority, [".srt", ".vtt", ".ass"]);
});

test("findMatchingSubtitleFile: exact match is found (posix)", () => {
  const result = findMatchingSubtitleFile("/movies/video-name.mkv", ["video-name.srt", "other.mp4"], path.posix);
  assert.equal(result, "/movies/video-name.srt");
});

test("findMatchingSubtitleFile: no subtitle found returns null", () => {
  const result = findMatchingSubtitleFile("/movies/video-name.mkv", ["other.srt", "video-name.mp3"], path.posix);
  assert.equal(result, null);
});

test("findMatchingSubtitleFile: unsupported subtitle extensions are ignored", () => {
  const result = findMatchingSubtitleFile("/movies/video-name.mkv", ["video-name.sub", "video-name.txt", "video-name.ssa"], path.posix);
  assert.equal(result, null);
});

test("findMatchingSubtitleFile: deterministic priority when multiple supported matches exist (.srt wins over .vtt and .ass)", () => {
  const result = findMatchingSubtitleFile("/movies/video-name.mkv", ["video-name.ass", "video-name.vtt", "video-name.srt"], path.posix);
  assert.equal(result, "/movies/video-name.srt");
});

test("findMatchingSubtitleFile: .vtt wins over .ass when .srt is absent", () => {
  const result = findMatchingSubtitleFile("/movies/video-name.mkv", ["video-name.ass", "video-name.vtt"], path.posix);
  assert.equal(result, "/movies/video-name.vtt");
});

test("findMatchingSubtitleFile: priority is not affected by filesystem enumeration order", () => {
  const forward = findMatchingSubtitleFile("/movies/video-name.mkv", ["video-name.ass", "video-name.vtt", "video-name.srt"], path.posix);
  const reversed = findMatchingSubtitleFile("/movies/video-name.mkv", ["video-name.srt", "video-name.vtt", "video-name.ass"], path.posix);
  assert.equal(forward, reversed);
});

test("findMatchingSubtitleFile: language-suffixed near-matches are ignored", () => {
  const result = findMatchingSubtitleFile("/movies/video-name.mkv", ["video-name.en.srt", "video-name.fr.srt"], path.posix);
  assert.equal(result, null);
});

test("findMatchingSubtitleFile: handles filenames with spaces and unicode characters", () => {
  const result = findMatchingSubtitleFile("/movies/Le Film Étrange 映画.mkv", ["Le Film Étrange 映画.srt"], path.posix);
  assert.equal(result, "/movies/Le Film Étrange 映画.srt");
});

test("findMatchingSubtitleFile: Windows-style paths are handled via path.win32", () => {
  const result = findMatchingSubtitleFile("C:\\Movies\\video-name.mkv", ["video-name.srt", "video-name.mp4"], path.win32);
  assert.equal(result, "C:\\Movies\\video-name.srt");
});

test("findMatchingSubtitleFile: POSIX-style paths are handled via path.posix", () => {
  const result = findMatchingSubtitleFile("/home/user/Movies/video-name.mkv", ["video-name.srt"], path.posix);
  assert.equal(result, "/home/user/Movies/video-name.srt");
});

test("autoLoadMatchingSubtitle: loads the matched subtitle through the shared addSubtitle function", async () => {
  let addSubtitleCalledWith = null;
  const result = await autoLoadMatchingSubtitle({
    mediaPath: "/movies/video-name.mkv",
    readDir: async () => ["video-name.srt", "video-name.mp4"],
    addSubtitle: async (subtitlePath) => {
      addSubtitleCalledWith = subtitlePath;
    },
    pathModule: path.posix,
  });

  assert.equal(addSubtitleCalledWith, "/movies/video-name.srt");
  assert.deepEqual(result, { matchedPath: "/movies/video-name.srt", loaded: true, skippedNotReady: false });
});

test("autoLoadMatchingSubtitle: no matching subtitle does not call addSubtitle or report an error", async () => {
  let addSubtitleCalled = false;
  let errorReported = false;
  const result = await autoLoadMatchingSubtitle({
    mediaPath: "/movies/video-name.mkv",
    readDir: async () => ["other.srt"],
    addSubtitle: async () => {
      addSubtitleCalled = true;
    },
    onError: () => {
      errorReported = true;
    },
    pathModule: path.posix,
  });

  assert.equal(addSubtitleCalled, false);
  assert.equal(errorReported, false);
  assert.deepEqual(result, { matchedPath: null, loaded: false, skippedNotReady: false });
});

test("autoLoadMatchingSubtitle: a subtitle-loading failure is reported via onError but does not throw (video stays open)", async () => {
  let reportedError = null;
  const result = await autoLoadMatchingSubtitle({
    mediaPath: "/movies/video-name.mkv",
    readDir: async () => ["video-name.srt"],
    addSubtitle: async () => {
      throw new Error("VLC connection refused");
    },
    onError: (error) => {
      reportedError = error;
    },
    pathModule: path.posix,
  });

  assert.equal(reportedError.message, "VLC connection refused");
  assert.deepEqual(result, { matchedPath: "/movies/video-name.srt", loaded: false, skippedNotReady: false });
});

test("autoLoadMatchingSubtitle: a directory-listing failure is reported via onError but does not throw", async () => {
  let reportedError = null;
  const result = await autoLoadMatchingSubtitle({
    mediaPath: "/movies/video-name.mkv",
    readDir: async () => {
      throw new Error("ENOENT: no such directory");
    },
    addSubtitle: async () => {},
    onError: (error) => {
      reportedError = error;
    },
    pathModule: path.posix,
  });

  assert.equal(reportedError.message, "ENOENT: no such directory");
  assert.deepEqual(result, { matchedPath: null, loaded: false, skippedNotReady: false });
});

test("autoLoadMatchingSubtitle: waits for readiness before reading the directory or loading a subtitle", async () => {
  const callOrder = [];
  const result = await autoLoadMatchingSubtitle({
    mediaPath: "/movies/video-name.mkv",
    waitForReady: async () => {
      callOrder.push("waitForReady");
      return true;
    },
    readDir: async () => {
      callOrder.push("readDir");
      return ["video-name.srt"];
    },
    addSubtitle: async () => {
      callOrder.push("addSubtitle");
    },
    pathModule: path.posix,
  });

  assert.deepEqual(callOrder, ["waitForReady", "readDir", "addSubtitle"]);
  assert.deepEqual(result, { matchedPath: "/movies/video-name.srt", loaded: true, skippedNotReady: false });
});

test("autoLoadMatchingSubtitle: readiness success triggers subtitle loading exactly once", async () => {
  let readyCalls = 0;
  let addSubtitleCalls = 0;
  await autoLoadMatchingSubtitle({
    mediaPath: "/movies/video-name.mkv",
    waitForReady: async () => {
      readyCalls++;
      return true;
    },
    readDir: async () => ["video-name.srt"],
    addSubtitle: async () => {
      addSubtitleCalls++;
    },
    pathModule: path.posix,
  });

  assert.equal(readyCalls, 1);
  assert.equal(addSubtitleCalls, 1);
});

test("autoLoadMatchingSubtitle: readiness failure does not read the directory or load a subtitle, and reports one error", async () => {
  let readDirCalled = false;
  let addSubtitleCalled = false;
  let errorCount = 0;
  const result = await autoLoadMatchingSubtitle({
    mediaPath: "/movies/video-name.mkv",
    waitForReady: async () => false,
    readDir: async () => {
      readDirCalled = true;
      return ["video-name.srt"];
    },
    addSubtitle: async () => {
      addSubtitleCalled = true;
    },
    onError: () => {
      errorCount++;
    },
    pathModule: path.posix,
  });

  assert.equal(readDirCalled, false);
  assert.equal(addSubtitleCalled, false);
  assert.equal(errorCount, 1);
  assert.deepEqual(result, { matchedPath: null, loaded: false, skippedNotReady: true });
});

test("autoLoadMatchingSubtitle: readiness failure does not reject and resolves normally (already-opened video is unaffected)", async () => {
  await assert.doesNotReject(
    autoLoadMatchingSubtitle({
      mediaPath: "/movies/video-name.mkv",
      waitForReady: async () => false,
      readDir: async () => ["video-name.srt"],
      addSubtitle: async () => {},
      pathModule: path.posix,
    })
  );
});

test("autoLoadMatchingSubtitle: a waitForReady rejection is reported via onError but does not throw", async () => {
  let reportedError = null;
  const result = await autoLoadMatchingSubtitle({
    mediaPath: "/movies/video-name.mkv",
    waitForReady: async () => {
      throw new Error("probe failed");
    },
    readDir: async () => ["video-name.srt"],
    addSubtitle: async () => {},
    onError: (error) => {
      reportedError = error;
    },
    pathModule: path.posix,
  });

  assert.equal(reportedError.message, "probe failed");
  assert.deepEqual(result, { matchedPath: null, loaded: false, skippedNotReady: true });
});

test("autoLoadMatchingSubtitle: without a waitForReady dependency, behavior is unchanged (backward compatible)", async () => {
  const result = await autoLoadMatchingSubtitle({
    mediaPath: "/movies/video-name.mkv",
    readDir: async () => ["video-name.srt"],
    addSubtitle: async () => {},
    pathModule: path.posix,
  });

  assert.deepEqual(result, { matchedPath: "/movies/video-name.srt", loaded: true, skippedNotReady: false });
});

test("autoLoadMatchingSubtitle: successful load reports loaded:true so transcript-view state can be considered populated", async () => {
  const result = await autoLoadMatchingSubtitle({
    mediaPath: "/movies/video-name.mkv",
    readDir: async () => ["video-name.vtt"],
    addSubtitle: async () => {},
    pathModule: path.posix,
  });

  assert.equal(result.loaded, true);
  assert.equal(result.matchedPath, "/movies/video-name.vtt");
});
