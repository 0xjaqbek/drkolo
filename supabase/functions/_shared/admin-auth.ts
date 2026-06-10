export async function verifyAdminPassword(
  supplied: string | null | undefined,
  configured: string | null | undefined,
): Promise<boolean> {
  if (!supplied || !configured) {
    return false;
  }

  const encoder = new TextEncoder();
  const [suppliedDigest, configuredDigest] = await Promise.all([
    globalThis.crypto.subtle.digest(
      "SHA-256",
      encoder.encode(supplied),
    ),
    globalThis.crypto.subtle.digest(
      "SHA-256",
      encoder.encode(configured),
    ),
  ]);
  const suppliedBytes = new Uint8Array(suppliedDigest);
  const configuredBytes = new Uint8Array(configuredDigest);
  let difference = 0;

  for (let index = 0; index < suppliedBytes.length; index += 1) {
    difference |= suppliedBytes[index] ^ configuredBytes[index];
  }

  return difference === 0;
}
