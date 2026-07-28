/**
 * Pure, framework-agnostic classification logic for the VLC HTTP port probe.
 * Kept free of Obsidian/network APIs so it can run under Node's built-in test
 * runner without pulling in the Obsidian plugin environment.
 */

export type VlcProbeClassification = "closed" | "authenticated" | "unauthorized" | "occupied";

export interface VlcPlaylistLike {
  type: string;
  children: unknown[];
}

/**
 * A 200 response alone doesn't mean the listener is VLC — any HTTP server on
 * the port would satisfy that. VLC's /requests/playlist.json always returns a
 * root node with a `type` string and a `children` array, so require that
 * shape before treating the endpoint as a compatible VLC instance.
 */
export function isVlcPlaylistResponse(json: unknown): json is VlcPlaylistLike {
  return !!json && typeof json === "object" && typeof (json as VlcPlaylistLike).type === "string" && Array.isArray((json as VlcPlaylistLike).children);
}

export interface VlcProbeInput {
  /** Whether a TCP connection to the configured host/port succeeded. */
  tcpReachable: boolean;
  /** Whether the HTTP request itself failed (network error, timeout, etc). */
  requestFailed: boolean;
  /** HTTP status code, when the request completed. */
  status?: number;
  /** Parsed JSON body, when the request completed. */
  json?: unknown;
}

/**
 * Classifies what is listening on the configured port:
 * - "closed": nothing is listening, safe to launch VLC.
 * - "authenticated": a compatible VLC instance accepted the configured
 *   credentials and can be reused as-is.
 * - "unauthorized": something that looks like VLC's HTTP interface rejected
 *   the configured password.
 * - "occupied": the port is in use by something that isn't a compatible VLC
 *   HTTP interface.
 */
export function classifyVlcProbe(input: VlcProbeInput): VlcProbeClassification {
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
