import * as nodePath from "path";

/**
 * Deterministic priority used when more than one exact-basename subtitle
 * match exists in the same directory as the video (e.g. `movie.srt` and
 * `movie.vtt` both present). Earlier entries win — never filesystem
 * enumeration order.
 *
 * This must stay in sync with `supportedSubtitleFormats` in
 * subtitleParser.ts — those are the only formats the plugin's transcript
 * parser can read, so matching is intentionally restricted to them (not the
 * much wider subtitle extension list used by the "Add subtitles" file picker
 * dialog). Kept as an independent literal rather than importing
 * subtitleParser.ts because that module (transitively) imports "obsidian",
 * which has no runtime implementation outside Obsidian and cannot be
 * resolved by Node's plain test runner used for this module's tests.
 *
 * Priority order: .srt > .vtt > .ass
 */
export const subtitleExtensionPriority: string[] = [".srt", ".vtt", ".ass"];

/**
 * Finds a subtitle file that exactly matches a video's base filename (the
 * filename without its extension) among a list of filenames from the same
 * directory. "Exact" means `video-name.srt`, not language-suffixed variants
 * like `video-name.en.srt` — those are intentionally not matched.
 *
 * When multiple supported extensions match, the result is chosen by
 * `subtitleExtensionPriority`, never by the order filenames were passed in.
 *
 * @param mediaPath Full path (any OS) to the video file.
 * @param filenamesInDir Filenames (not full paths) present in the video's directory.
 * @param pathModule Path module to use for parsing — defaults to the native
 *   `path` module. Tests can pass `path.win32` / `path.posix` explicitly to
 *   exercise a specific path style regardless of the host OS.
 * @returns The full path (in the same directory as mediaPath) of the matched
 *   subtitle file, or null if none of the supported extensions match exactly.
 */
export function findMatchingSubtitleFile(mediaPath: string, filenamesInDir: string[], pathModule: typeof nodePath = nodePath): string | null {
  const dir = pathModule.dirname(mediaPath);
  const videoBaseName = pathModule.basename(mediaPath, pathModule.extname(mediaPath));

  const matchesByExt = new Map<string, string>();
  for (const filename of filenamesInDir) {
    const ext = pathModule.extname(filename);
    const normalizedExt = ext.toLowerCase();
    if (!subtitleExtensionPriority.includes(normalizedExt)) {
      continue;
    }
    const baseName = pathModule.basename(filename, ext);
    if (baseName === videoBaseName) {
      matchesByExt.set(normalizedExt, filename);
    }
  }

  for (const ext of subtitleExtensionPriority) {
    const match = matchesByExt.get(ext);
    if (match) {
      return pathModule.join(dir, match);
    }
  }

  return null;
}

export interface IAutoLoadSubtitleResult {
  matchedPath: string | null;
  loaded: boolean;
  /** True when `waitForReady` was provided and resolved false (bounded polling timed out) — subtitle loading never ran. */
  skippedNotReady: boolean;
}

/**
 * Orchestrates the "select a file to open with VLC Player" auto subtitle
 * step: wait for VLC HTTP readiness via bounded polling, list the video's
 * directory, find an exact-basename match, and load it through the same
 * `addSubtitle` the manual "Add subtitles" command uses — no duplicated
 * subtitle-loading logic, and no command invoking another command.
 *
 * `waitForReady` is expected to be the plugin's existing bounded-polling
 * readiness wait (e.g. `checkPort(timeout)` — retry at its existing cadence,
 * resolve true as soon as an authenticated check succeeds, resolve false the
 * moment its timeout elapses) rather than a new fixed-delay sleep, an
 * unbounded loop, or a second independent polling implementation. A cold VLC
 * launch is not instantly ready, so a single one-shot probe is not
 * sufficient here — bounded retrying is what lets auto-load survive that
 * startup window without polling indefinitely or polling twice (this
 * function calls `waitForReady` exactly once and, on success, calls
 * `addSubtitle` at most once).
 *
 * A missing match is not an error (`loaded: false`, no error callback). A
 * readiness timeout, a directory-listing failure, or a failure while loading
 * a found match are each reported via `onError` (at most once per call) but
 * never reject — the already-opened video must stay open regardless of
 * subtitle-loading outcome.
 */
export async function autoLoadMatchingSubtitle(params: {
  mediaPath: string;
  readDir: (dir: string) => Promise<string[]>;
  addSubtitle: (subtitlePath: string) => Promise<void>;
  waitForReady?: () => Promise<boolean>;
  onError?: (error: unknown) => void;
  pathModule?: typeof nodePath;
}): Promise<IAutoLoadSubtitleResult> {
  const pathModule = params.pathModule ?? nodePath;

  if (params.waitForReady) {
    let ready = false;
    try {
      ready = await params.waitForReady();
    } catch (error) {
      params.onError?.(error);
      return { matchedPath: null, loaded: false, skippedNotReady: true };
    }
    if (!ready) {
      params.onError?.(new Error("VLC HTTP interface was not ready for automatic subtitle loading"));
      return { matchedPath: null, loaded: false, skippedNotReady: true };
    }
  }

  let filenamesInDir: string[];
  try {
    filenamesInDir = await params.readDir(pathModule.dirname(params.mediaPath));
  } catch (error) {
    params.onError?.(error);
    return { matchedPath: null, loaded: false, skippedNotReady: false };
  }

  const matchedPath = findMatchingSubtitleFile(params.mediaPath, filenamesInDir, pathModule);
  if (!matchedPath) {
    return { matchedPath: null, loaded: false, skippedNotReady: false };
  }

  try {
    await params.addSubtitle(matchedPath);
    return { matchedPath, loaded: true, skippedNotReady: false };
  } catch (error) {
    params.onError?.(error);
    return { matchedPath, loaded: false, skippedNotReady: false };
  }
}
