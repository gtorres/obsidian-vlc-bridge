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
}

/**
 * Orchestrates the "select a file to open with VLC Player" auto subtitle
 * step: list the video's directory, find an exact-basename match, and load
 * it through the same `addSubtitle` the manual "Add subtitles" command uses
 * — no duplicated subtitle-loading logic, and no command invoking another
 * command.
 *
 * A missing match is not an error (`loaded: false`, no error callback). A
 * failure while listing the directory or loading a found match is reported
 * via `onError` but never rejects — the already-opened video must stay open
 * regardless of subtitle-loading outcome.
 */
export async function autoLoadMatchingSubtitle(params: {
  mediaPath: string;
  readDir: (dir: string) => Promise<string[]>;
  addSubtitle: (subtitlePath: string) => Promise<void>;
  onError?: (error: unknown) => void;
  pathModule?: typeof nodePath;
}): Promise<IAutoLoadSubtitleResult> {
  const pathModule = params.pathModule ?? nodePath;

  let filenamesInDir: string[];
  try {
    filenamesInDir = await params.readDir(pathModule.dirname(params.mediaPath));
  } catch (error) {
    params.onError?.(error);
    return { matchedPath: null, loaded: false };
  }

  const matchedPath = findMatchingSubtitleFile(params.mediaPath, filenamesInDir, pathModule);
  if (!matchedPath) {
    return { matchedPath: null, loaded: false };
  }

  try {
    await params.addSubtitle(matchedPath);
    return { matchedPath, loaded: true };
  } catch (error) {
    params.onError?.(error);
    return { matchedPath, loaded: false };
  }
}
