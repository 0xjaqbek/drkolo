// @vitest-environment node

import { describe, expect, it } from "vitest";

import { generateLookupToken, hashLookupToken } from "./crypto";

describe("lookup token cryptography", () => {
  it("generates a 32-byte base64url token without padding", () => {
    const token = generateLookupToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("generates distinct tokens", () => {
    expect(generateLookupToken()).not.toBe(generateLookupToken());
  });

  it("hashes deterministically as lowercase SHA-256 hex", async () => {
    const firstHash = await hashLookupToken("known-token");
    const secondHash = await hashLookupToken("known-token");

    expect(firstHash).toMatch(/^[a-f0-9]{64}$/);
    expect(firstHash).toBe(secondHash);
  });
});
