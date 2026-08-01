/**
 * Pure helpers for turning canonical transcript formatting into clipboard text,
 * kept free of Obsidian/DOM dependencies so they can be unit tested directly.
 *
 * formatSubText wraps each physical line of a multiline subtitle entry in
 * `<span>...</span>` so MarkdownRenderer keeps the lines separate instead of
 * merging them into one paragraph. That wrapper is baked into the same
 * `formattedStr`/`simpleFormattedStr` that every clipboard path reads, so the
 * literal tags leak into copied text unless stripped here first.
 */

const RENDER_ONLY_SPAN_TAG = /<\/?span>/g;

/** Strips the rendering-only `<span>`/`</span>` wrapper, preserving the real
 * line breaks (and everything else, including user text containing `<`/`>`). */
export const toClipboardText = (formattedStr: string | null | undefined): string => (formattedStr ? formattedStr.replaceAll(RENDER_ONLY_SPAN_TAG, "") : "");

/** Cleans and joins multiple dialog entries for clipboard output. A blank line
 * separates entries, kept distinct from the single line breaks within an
 * entry's own multiline text; empty/missing entries are dropped. */
export const joinDialogsForClipboard = (formattedStrs: (string | null | undefined)[]): string =>
  formattedStrs
    .map(toClipboardText)
    .filter((entry) => entry.length > 0)
    .join("\n\n");
