export type AdminPasswordDigest = (
  value: string,
) => Promise<Uint8Array>;

export async function digestAdminPassword(
  value: string,
): Promise<Uint8Array> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return new Uint8Array(digest);
}

export async function verifyAdminPassword(
  supplied: string | null | undefined,
  configured: string | null | undefined,
  digest: AdminPasswordDigest = digestAdminPassword,
): Promise<boolean> {
  const suppliedValue = supplied ?? "";
  const configuredValue = configured ?? "";
  const [suppliedBytes, configuredBytes] = await Promise.all([
    digest(suppliedValue),
    digest(configuredValue),
  ]);
  const comparisonLength = Math.max(
    suppliedBytes.length,
    configuredBytes.length,
  );
  let difference = suppliedBytes.length ^ configuredBytes.length;

  for (let index = 0; index < comparisonLength; index += 1) {
    difference |=
      (suppliedBytes[index] ?? 0) ^ (configuredBytes[index] ?? 0);
  }

  return difference === 0 &&
    suppliedValue.length > 0 &&
    configuredValue.length > 0;
}
