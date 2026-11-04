import { describe, test, expect } from "vitest"
import { decryptAdminMessage } from "./e2ee"

describe("E2EE decryptAdminMessage utility", () => {
  test("returns non-E2EE messages directly as-is", async () => {
    const res = await decryptAdminMessage("me", "other_key", "Hello, this is a plain message")
    expect(res.decrypted).toBe(false)
    expect(res.text).toBe("Hello, this is a plain message")
  })

  test("returns error message when receiver public key is missing", async () => {
    const res = await decryptAdminMessage("me", null, "E2EE:v1:nonce:mac:cipher")
    expect(res.decrypted).toBe(false)
    expect(res.text).toBe("(Encrypted - Receiver key missing)")
  })

  test("returns error message when E2EE format is invalid", async () => {
    const res = await decryptAdminMessage("me", "receiver_key", "E2EE:v1:invalid_parts")
    expect(res.decrypted).toBe(false)
    expect(res.text).toBe("(Encrypted - Invalid format)")
  })

  test("returns error message when decryption fails (invalid signature/key/cipher)", async () => {
    // Valid 32-byte base64 encoded key
    const res = await decryptAdminMessage("me", "MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI=", "E2EE:v1:bm9uY2U=:bWFj:Y2lwaGVy")
    expect(res.decrypted).toBe(false)
    expect(res.text).toBe("(Decryption Failed)")
  })
})
