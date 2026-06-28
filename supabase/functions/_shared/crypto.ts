const BASE64URL_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function encodeBase64Url(bytes: Uint8Array): string {
  let encoded = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];

    encoded += BASE64URL_ALPHABET[first >> 2];
    encoded += BASE64URL_ALPHABET[((first & 0x03) << 4) | ((second ?? 0) >> 4)];

    if (second !== undefined) {
      encoded +=
        BASE64URL_ALPHABET[((second & 0x0f) << 2) | ((third ?? 0) >> 6)];
    }

    if (third !== undefined) {
      encoded += BASE64URL_ALPHABET[third & 0x3f];
    }
  }

  return encoded;
}

export function generateLookupToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));

  return encodeBase64Url(bytes);
}

export async function hashLookupToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
