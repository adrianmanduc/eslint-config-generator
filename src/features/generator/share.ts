import { parseStoredState } from "./state";

import type { GeneratorState } from "./types";

/**
 * Shareable links. The whole state travels in the URL hash
 * (`#config=<deflated JSON, base64url>`): the hash never reaches a server, so
 * nothing is stored or logged anywhere.
 *
 * Bump SHARE_VERSION when an old link could no longer be read correctly.
 */
const SHARE_VERSION = 1;
const HASH_KEY = "config";
// Far above any real config (a full preset is well under 2 KB). The decoded
// limit stops a crafted link from inflating into a huge payload.
const MAX_ENCODED_LENGTH = 32_000;
const MAX_DECODED_LENGTH = 512_000;

/** Pipes bytes through a (de)compression stream, giving up past `maxLength`. */
async function transform(
  bytes: Uint8Array<ArrayBuffer>,
  stream: CompressionStream | DecompressionStream,
  maxLength = Number.POSITIVE_INFINITY,
) {
  const source = new ReadableStream<BufferSource>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  const reader = source.pipeThrough(stream).getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;

  for (let result = await reader.read(); !result.done; result = await reader.read()) {
    length += result.value.length;

    if (length > maxLength) {
      await reader.cancel();

      return null;
    }

    chunks.push(result.value);
  }

  const output = new Uint8Array(length);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const binary = atob(value.replaceAll("-", "+").replaceAll("_", "/"));

  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function encodeSharedState(state: GeneratorState): Promise<string> {
  const json = JSON.stringify({ v: SHARE_VERSION, s: state });
  const compressed = await transform(new TextEncoder().encode(json), new CompressionStream("deflate-raw"));

  return toBase64Url(compressed ?? new Uint8Array());
}

/**
 * Reads a shared state. Returns null for anything that is not a valid link;
 * plugins, configs and rules that no longer exist are dropped, exactly as for a
 * state restored from localStorage.
 */
export async function decodeSharedState(value: string): Promise<GeneratorState | null> {
  if (!value || value.length > MAX_ENCODED_LENGTH || !/^[\w-]+$/.test(value)) {
    return null;
  }

  try {
    const bytes = await transform(fromBase64Url(value), new DecompressionStream("deflate-raw"), MAX_DECODED_LENGTH);

    if (!bytes) {
      return null;
    }

    const payload: unknown = JSON.parse(new TextDecoder().decode(bytes));

    if (typeof payload !== "object" || payload === null || !("v" in payload) || payload.v !== SHARE_VERSION || !("s" in payload)) {
      return null;
    }

    return parseStoredState(payload.s);
  } catch {
    return null;
  }
}

export async function getShareUrl(state: GeneratorState): Promise<string> {
  const { origin, pathname } = window.location;

  return `${origin}${pathname}#${HASH_KEY}=${await encodeSharedState(state)}`;
}

/** The shared config in the current URL, if any. */
export function readShareHash(): string | null {
  return new URLSearchParams(window.location.hash.slice(1)).get(HASH_KEY);
}

/** Removes the shared config from the URL without adding a history entry. */
export function clearShareHash() {
  const { pathname, search } = window.location;

  window.history.replaceState(window.history.state, "", `${pathname}${search}`);
}
