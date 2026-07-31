// Pure helpers for building VLC Bridge link markdown, kept free of Obsidian
// imports so they can be unit tested with a plain Node.js test runner.

// https://stackoverflow.com/a/25279399
export const msToTimestamp = (milliseconds: number) => {
  milliseconds = Math.round(milliseconds);
  const seconds = (milliseconds / 1000).toString().split(".")[0];
  const ms = Math.round(((milliseconds / 1000) % 1) * 1000)
    .toString()
    ?.slice(0, 3);
  const date = new Date(0);
  date.setSeconds(Number(seconds), Number(ms || 0)); // specify value for SECONDS here
  const timeString = date.toISOString().substring(11, 23);
  const simplifiedStr = timeString.substring(milliseconds < 60 * 60 * 1000 ? 3 : 0);
  const result = {
    fullString: timeString,
    simplified: simplifiedStr,
    simplifiedWithoutMs: simplifiedStr.replace(/\.\d*$/, ""),
    hh: timeString.split(":")[0],
    mm: timeString.split(":")[1],
    ss: timeString.split(":")[2].replace(/\.\d*$/, ""),
    ms: timeString.split(".")[1],
  };

  return result;
};

export interface IDialogSeekEntry {
  from: number;
  to: number;
}

/**
 * Resolves the seek target (ms and percentage-of-length) for a subtitle
 * entry, honoring `jumpMiddleOfDialog`. Shared by the rendered transcript
 * timestamp link and the transcript row's own click/keyboard seek handlers
 * so both always agree on where an entry seeks to.
 */
export const computeDialogSeekTarget = (entry: IDialogSeekEntry, lengthMs: number, jumpMiddleOfDialog: boolean): { ms: number; percent: number } => {
  const ms = jumpMiddleOfDialog ? Math.round((entry.from + entry.to) / 2) : entry.from;
  const percent = (ms / lengthMs) * 100;
  return { ms, percent };
};

export const buildTimestampLink = (params: {
  fromMs: number;
  posFromPercent: number;
  mediaPath: string;
  subPath: string;
  subDelay: number | null;
  filename?: string;
  timestampLinktext: string;
  usePercentagePosition: boolean;
}) => {
  const { fromMs, posFromPercent, mediaPath, subPath, subDelay, filename, timestampLinktext, usePercentagePosition } = params;

  const uriParams: { mediaPath: string; subPath: string; subDelay?: string; timestamp: string } = {
    mediaPath: encodeURIComponent(mediaPath),
    subPath: encodeURIComponent(subPath),
    timestamp: usePercentagePosition ? `${posFromPercent}%` : `${fromMs / 1000}`,
  };
  if (subDelay && subDelay !== 0) {
    uriParams.subDelay = subDelay.toString();
  }

  const linkFilename = (filename || "").replaceAll("[", "［").replaceAll("]", "］");
  const linkText = timestampLinktext.replaceAll("{{timestamp}}", msToTimestamp(fromMs).simplifiedWithoutMs).replaceAll("{{filename}}", linkFilename);

  const paramStr = new URLSearchParams(uriParams).toString();
  return `[${linkText}](obsidian://vlcBridge?${paramStr})`;
};
