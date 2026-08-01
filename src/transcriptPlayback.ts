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

/**
 * A VLC status position of `0` is a valid playback position (the very start
 * of the video) and must not be treated as "no position" — a truthy check
 * (`status?.position && ...`) would incorrectly reject it. Only `null`/`undefined`
 * mean no position is available.
 */
export const isValidPlaybackPosition = (position: number | null | undefined): position is number => {
  return position != null;
};

export interface IActiveRowSyncResult {
  changed: boolean;
  previousIndex: number | null;
  activeIndex: number | null;
}

/**
 * Framework-agnostic state machine behind the transcript view's active-row
 * sync. Owns the currently active index plus a generation counter so a
 * single poller can be driven without duplicating boundary logic, without
 * overlapping in-flight requests, and without letting a stale response
 * (from before a seek/close/media-switch) clobber newer state.
 *
 * Usage: `beginRequest()` before issuing a status request, `resolve()` once
 * it settles. `invalidate()` on view close/replace bumps the generation so
 * any request already in flight resolves to `null` (a no-op) instead of
 * applying stale data.
 */
export class ActiveTranscriptRowTracker {
  private activeIndex: number | null = null;
  private generation = 0;
  private pending = false;

  getActiveIndex(): number | null {
    return this.activeIndex;
  }

  /** Returns a request token, or null if a previous request is still pending (caller should skip this tick). */
  beginRequest(): number | null {
    if (this.pending) return null;
    this.pending = true;
    return this.generation;
  }

  /** Bumps the generation and clears active/pending state. Any request token issued before this call resolves to null. */
  invalidate(): void {
    this.generation += 1;
    this.pending = false;
    this.activeIndex = null;
  }

  /**
   * Resolves a request started with `beginRequest()`. `positionMs` should be
   * null when playback is unavailable or the transcript's media isn't the
   * one currently playing. Returns null if the token is stale (superseded
   * by `invalidate()` while the request was in flight).
   */
  resolve(token: number, entries: ITranscriptTimedEntry[], positionMs: number | null): IActiveRowSyncResult | null {
    this.pending = false;
    if (token !== this.generation) return null;

    const activeIndex = positionMs === null ? null : findActiveTranscriptEntryIndex(entries, positionMs);
    const previousIndex = this.activeIndex;
    const changed = activeIndex !== previousIndex;
    this.activeIndex = activeIndex;

    return { changed, previousIndex, activeIndex };
  }
}
