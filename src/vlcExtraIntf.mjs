/**
 * Pure, framework-agnostic logic for selecting the VLC `--extraintf` argument.
 *
 * This module is plain JavaScript (not TypeScript) so it can be executed
 * directly by Node's built-in test runner on a standard, unmodified Node
 * installation — no loader, compiler step, or experimental TypeScript
 * stripping required. TypeScript source (`src/vlcHelper.ts`) imports it via
 * `allowJs`, using the JSDoc annotations below for type information.
 */

/**
 * On macOS (VLC 3.0.23 verified), `--extraintf=luaintf:http` loads the dummy
 * Lua interface instead of the HTTP one and never opens the configured TCP
 * listener, even though VLC logs an "http" interface line. `--extraintf=http`
 * is the argument that actually binds the HTTP interface on macOS.
 *
 * Windows and Linux behavior is left unchanged since it hasn't been verified
 * against this failure mode.
 *
 * @param {{ isMacOS: boolean }} platform
 * @returns {string} The `--extraintf=...` argument to pass to VLC.
 */
export function getVlcExtraIntfArg(platform) {
  return platform?.isMacOS ? "--extraintf=http" : "--extraintf=luaintf:http";
}
