import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const IV_LENGTH = 16

// Default key for development only (32 bytes hex = 64 characters)
const DEV_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

// Lazy getter to avoid build-time evaluation
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY
  if (key) return key

  if (process.env.NODE_ENV === "production") {
    throw new Error("ENCRYPTION_KEY must be set in production")
  }

  return DEV_ENCRYPTION_KEY
}

export function encrypt(text: string): string {
  const iv = randomBytes(IV_LENGTH)
  const keyBuffer = Buffer.from(getEncryptionKey(), "hex")
  const cipher = createCipheriv("aes-256-gcm", keyBuffer, iv)

  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`
}

export function decrypt(text: string): string {
  const parts = text.split(":")
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted text format")
  }

  const [ivHex, authTagHex, encryptedHex] = parts
  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")
  const encryptedText = Buffer.from(encryptedHex, "hex")
  const keyBuffer = Buffer.from(getEncryptionKey(), "hex")

  const decipher = createDecipheriv("aes-256-gcm", keyBuffer, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encryptedText)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted.toString("utf8")
}
