/**
 * Pure, framework-agnostic classification logic for the VLC HTTP port probe.
 *
 * This module is plain JavaScript (not TypeScript) so it can be executed
 * directly by Node's built-in test runner on a standard, unmodified Node
 * installation — no loader, compiler step, or experimental TypeScript
 * stripping required. TypeScript source (`src/vlcHelper.ts`) imports it via
 * `allowJs`, using the JSDoc annotations below for type information.
 */

/**
 * @typedef {"closed" | "authenticated" | "unauthorized" | "occupied"} VlcProbeClassification
 */

/**
 * @typedef {object} VlcPlaylistLike
 * @property {string} type
 * @property {unknown[]} children
 */

/**
 * A 200 response alone doesn't mean the listener is VLC — any HTTP server on
 * the port would satisfy that. VLC's /requests/playlist.json always returns a
 * root node with a `type` string and a `children` array, so require that
 * shape before treating the endpoint as a compatible VLC instance.
 *
 * @param {unknown} json
 * @returns {json is VlcPlaylistLike}
 */
export function isVlcPlaylistResponse(json) {
  return !!json && typeof json === "object" && typeof json.type === "string" && Array.isArray(json.children);
}

/**
 * @typedef {object} VlcProbeInput
 * @property {boolean} tcpReachable Whether a TCP connection to the configured host/port succeeded.
 * @property {boolean} requestFailed Whether the HTTP request itself failed (network error, timeout, etc).
 * @property {number} [status] HTTP status code, when the request completed.
 * @property {unknown} [json] Parsed JSON body, when the request completed.
 */

/**
 * Classifies what is listening on the configured port:
 * - "closed": nothing is listening, safe to launch VLC.
 * - "authenticated": a compatible VLC instance accepted the configured
 *   credentials and can be reused as-is.
 * - "unauthorized": something that looks like VLC's HTTP interface rejected
 *   the configured password.
 * - "occupied": the port is in use by something that isn't a compatible VLC
 *   HTTP interface.
 *
 * @param {VlcProbeInput} input
 * @returns {VlcProbeClassification}
 */
export function classifyVlcProbe(input) {
  const { tcpReachable, requestFailed, status, json } = input;
  if (!tcpReachable) {
    return "closed";
  }
  if (requestFailed) {
    return "occupied";
  }
  if (status === 401 || status === 403) {
    return "unauthorized";
  }
  if (status === 200 && isVlcPlaylistResponse(json)) {
    return "authenticated";
  }
  return "occupied";
}
