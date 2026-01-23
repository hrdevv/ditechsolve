/**
 * Credential encryption utilities using Web Crypto API
 * Encrypts sensitive WooCommerce credentials before storing in localStorage
 */

import { WooCommerceCredentials } from "./types";

// Constants for encryption
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const ITERATIONS = 100000;

/**
 * Generates a cryptographic key from a passphrase using PBKDF2
 */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Gets or creates a device-specific passphrase
 * This provides a basic layer of encryption tied to the browser instance
 */
function getDevicePassphrase(): string {
  const PASSPHRASE_KEY = 'ditech_device_id';
  let passphrase = sessionStorage.getItem(PASSPHRASE_KEY);
  
  if (!passphrase) {
    // Generate a random passphrase for this session
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    passphrase = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem(PASSPHRASE_KEY, passphrase);
  }
  
  return passphrase;
}

/**
 * Encrypts credentials using AES-GCM
 */
export async function encryptCredentials(credentials: WooCommerceCredentials): Promise<string> {
  try {
    const passphrase = getDevicePassphrase();
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(credentials));

    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Derive key from passphrase
    const key = await deriveKey(passphrase, salt);

    // Encrypt the data
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );

    // Combine salt + iv + encrypted data
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const combined = new Uint8Array(SALT_LENGTH + IV_LENGTH + encryptedArray.length);
    combined.set(salt, 0);
    combined.set(iv, SALT_LENGTH);
    combined.set(encryptedArray, SALT_LENGTH + IV_LENGTH);

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt credentials');
  }
}

/**
 * Decrypts credentials using AES-GCM
 */
export async function decryptCredentials(encryptedData: string): Promise<WooCommerceCredentials | null> {
  try {
    const passphrase = getDevicePassphrase();
    
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    // Extract salt, iv, and encrypted data
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const encryptedArray = combined.slice(SALT_LENGTH + IV_LENGTH);

    // Derive key from passphrase
    const key = await deriveKey(passphrase, salt);

    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      encryptedArray
    );

    // Parse and return credentials
    const decoder = new TextDecoder();
    const decryptedText = decoder.decode(decryptedBuffer);
    return JSON.parse(decryptedText) as WooCommerceCredentials;
  } catch (error) {
    // Decryption failed - likely invalid session or corrupted data
    console.warn('Decryption failed - credentials may be from a different session');
    return null;
  }
}

/**
 * Checks if Web Crypto API is available
 */
export function isEncryptionSupported(): boolean {
  return typeof crypto !== 'undefined' && 
         typeof crypto.subtle !== 'undefined' &&
         typeof crypto.getRandomValues === 'function';
}
