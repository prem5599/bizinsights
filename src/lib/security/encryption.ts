// src/lib/security/encryption.ts
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const SECRET_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')

/**
 * Encryption utilities for sensitive data
 */
export const encryption = {
  encrypt: (text: string): string => {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipher(ALGORITHM, SECRET_KEY)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
  },

  decrypt: (encryptedData: string): string => {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':')
    
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    
    const decipher = crypto.createDecipher(ALGORITHM, SECRET_KEY)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  },

  hash: (text: string): string => {
    return crypto.createHash('sha256').update(text).digest('hex')
  }
}