import * as fs from "fs";

// Standard install location for a drag-and-drop VLC.app on macOS.
export const DEFAULT_MACOS_VLC_PATH = "/Applications/VLC.app/Contents/MacOS/VLC";

type FsCheck = Pick<typeof fs, "statSync" | "accessSync">;

export function isExecutableFile(filePath: string, fsModule: FsCheck = fs): boolean {
  try {
    if (!fsModule.statSync(filePath).isFile()) return false;
    fsModule.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

// Returns the absolute path to VLC's executable inside the standard macOS
// app bundle, or null if it isn't present/executable there.
export function resolveMacOSVlcExecutable(vlcPath: string = DEFAULT_MACOS_VLC_PATH, fsModule: FsCheck = fs): string | null {
  return isExecutableFile(vlcPath, fsModule) ? vlcPath : null;
}
