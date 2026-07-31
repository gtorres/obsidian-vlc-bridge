/**
 * Pure playback-state helpers for the transcript view. No DOM, Obsidian, or
 * VLC dependencies — inputs/outputs only, so this can run on every playback
 * tick without side effects.
 */

export interface ITranscriptTimedEntry {
  /** Start time in milliseconds, matching the units used throughout subtitleParser.ts / transcriptView.ts. */
  from: number;
}

/**
 * Returns the index of the transcript entry active at `positionMs`, using a
 * binary search over `entries` (assumed sorted ascending by `from`, as
 * produced by parseSub/getSubEntries).
 *
 * An entry is active from its own start time up to (but not including) the
 * next entry's start time; the final entry stays active for any position at
 * or after its start. Returns null if `entries` is empty or `positionMs` is
 * before the first entry's start.
 */
export const findActiveTranscriptEntryIndex = (entries: ITranscriptTimedEntry[], positionMs: number): number | null => {
  if (entries.length === 0 || positionMs < entries[0].from) {
    return null;
  }

  let low = 0;
  let high = entries.length - 1;
  let result = 0;

  while (low <= high) {
    const mid = (low + high) >>> 1;
    if (entries[mid].from <= positionMs) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return result;
};
