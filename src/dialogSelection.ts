/**
 * Pure helpers for the "Copy selected dialogs" checkbox selection, kept free
 * of Obsidian/DOM dependencies so they can be unit tested directly.
 */

export interface ISelectableDialog {
  checkbox: { checked: boolean };
}

/** Selected dialogs, preserving the original transcript order regardless of click order. */
export const filterSelectedDialogs = <T extends ISelectableDialog>(dialogs: T[]): T[] => dialogs.filter((dialog) => dialog.checkbox.checked);

/** True when no dialog is selected, used to gate the "Copy selected dialogs" clipboard write. */
export const hasNoSelection = <T extends ISelectableDialog>(dialogs: T[]): boolean => filterSelectedDialogs(dialogs).length === 0;
