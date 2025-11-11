/**
 * Credential Encryption Utility
 * 
 * Provides secure encryption/decryption for integration credentials
 * Uses AES-256-GCM for authenticated encryption
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

/**
 * Get encryption key from environment variable
 * Key must be 32 bytes (64 hex characters) for AES-256
 */
function getEncryptionKey(): Buffer {
  const key = process.env.INTEGRATION_ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error(
      'INTEGRATION_ENCRYPTION_KEY environment variable is not set. ' +
      'Generate a key using: openssl rand -hex 32'
    );
  }
  
  // Validate key length (64 hex chars = 32 bytes)
  if (key.length !== 64) {
    throw new Error(
      `INTEGRATION_ENCRYPTION_KEY must be 64 hex characters (32 bytes). ` +
      `Current length: ${key.length}. Generate with: openssl rand -hex 32`
    );
  }
  
  return Buffer.from(key, 'hex');
}

/**
 * Encrypt a plaintext string
 * Returns format: "iv:authTag:encryptedData" (all hex encoded)
 */
export function encryptCredential(plaintext: string): string {
  if (!plaintext) {
    return '';
  }
  
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Return format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error(`Failed to encrypt credential: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt an encrypted string
 * Expects format: "iv:authTag:encryptedData" (all hex encoded)
 */
export function decryptCredential(encryptedText: string): string {
  if (!encryptedText) {
    return '';
  }
  
  // Check if already decrypted (plaintext)
  if (!encryptedText.includes(':')) {
    // Legacy: might be plaintext, return as-is (should be migrated)
    console.warn('Decrypting plaintext credential (should be encrypted)');
    return encryptedText;
  }
  
  try {
    const parts = encryptedText.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format. Expected: iv:authTag:encryptedData');
    }
    
    const [ivHex, authTagHex, encrypted] = parts;
    
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error(`Failed to decrypt credential: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Encrypt all sensitive fields in a ConnectionConfig object
 */
export function encryptConnectionConfig(config: Record<string, unknown>): Record<string, unknown> {
  const encrypted = { ...config };
  
  // Fields that should be encrypted
  const sensitiveFields = [
    'apiToken',
    'apiKey',
    'apiSecret',
    'accessToken',
    'refreshToken',
    'applicationPassword',
    'password',
  ];
  
  for (const field of sensitiveFields) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = encryptCredential(encrypted[field] as string);
    }
  }
  
  return encrypted;
}

/**
 * Decrypt all sensitive fields in a ConnectionConfig object
 */
export function decryptConnectionConfig(config: Record<string, unknown>): Record<string, unknown> {
  const decrypted = { ...config };
  
  // Fields that should be decrypted
  const sensitiveFields = [
    'apiToken',
    'apiKey',
    'apiSecret',
    'accessToken',
    'refreshToken',
    'applicationPassword',
    'password',
  ];
  
  for (const field of sensitiveFields) {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      try {
        decrypted[field] = decryptCredential(decrypted[field] as string);
      } catch (error) {
        // If decryption fails, might be plaintext (legacy data)
        console.warn(`Failed to decrypt ${field}, assuming plaintext:`, error);
        // Keep as-is
      }
    }
  }
  
  return decrypted;
}

/**
 * Mask a credential for display (e.g., "wf_****key123")
 */
export function maskCredential(credential: string, visibleChars: number = 4): string {
  if (!credential || credential.length <= visibleChars) {
    return '****';
  }
  
  const prefix = credential.substring(0, visibleChars);
  const suffix = credential.substring(credential.length - visibleChars);
  const masked = '*'.repeat(Math.max(4, credential.length - (visibleChars * 2)));
  
  return `${prefix}${masked}${suffix}`;
}

/**
 * Check if a string appears to be encrypted (has the iv:authTag:data format)
 */
export function isEncrypted(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  
  const parts = value.split(':');
  return parts.length === 3 && 
         parts[0].length === IV_LENGTH * 2 && // IV hex length
         parts[1].length === AUTH_TAG_LENGTH * 2; // Auth tag hex length
}

