/**
 * Pure helpers for deciding whether a click/keydown on a transcript row
 * should trigger a whole-row seek, kept free of Obsidian/DOM dependencies so
 * they can be unit tested with a plain Node.js test runner.
 */

/** Minimal shape of the DOM nodes these helpers walk over. */
export interface IRowInteractionNode {
  matches?: (selector: string) => boolean;
  parentElement?: IRowInteractionNode | null;
}

/**
 * Selector for elements nested inside a transcript row that must handle
 * their own click/keyboard activation instead of triggering the row seek
 * (links such as the timestamp, buttons, toggles, inputs, etc.).
 */
export const ROW_SEEK_IGNORE_SELECTOR = "a, button, input, select, textarea, img, [contenteditable], [role='button'], [role='checkbox'], [data-vlc-bridge-row-ignore]";

/**
 * True when `target` is `rowEl` itself, or is nested inside it without the
 * path between them passing through a control matched by
 * `interactiveSelector` (an anchor, button, form control, etc.). Used to
 * guard the row seek handler against clicks/keydowns on nested interactive
 * controls, and against the row seek re-firing for the bubbled click of the
 * existing timestamp link.
 */
export const isRowSeekTarget = (target: IRowInteractionNode | null, rowEl: IRowInteractionNode, interactiveSelector: string = ROW_SEEK_IGNORE_SELECTOR): boolean => {
  let node: IRowInteractionNode | null | undefined = target;
  while (node && node !== rowEl) {
    if (typeof node.matches === "function" && node.matches(interactiveSelector)) {
      return false;
    }
    node = node.parentElement;
  }
  return node === rowEl;
};

/** True for the keyboard keys that should activate a focused row: Enter and Space. */
export const isRowActivationKey = (key: string): boolean => key === "Enter" || key === " " || key === "Spacebar";
