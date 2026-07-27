import * as fs from "fs";

// Standard install location for a drag-and-drop VLC.app on macOS.
const DEFAULT_MACOS_VLC_PATH = "/Applications/VLC.app/Contents/MacOS/VLC";

function isExecutableFile(filePath: string): boolean {
  try {
    if (!fs.statSync(filePath).isFile()) return false;
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

// Returns the absolute path to VLC's executable inside the standard macOS
// app bundle, or null if it isn't present/executable there.
export function resolveMacOSVlcExecutable(vlcPath: string = DEFAULT_MACOS_VLC_PATH): string | null {
  return isExecutableFile(vlcPath) ? vlcPath : null;
}
