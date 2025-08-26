// === SIMPLE USER-SPECIFIC ENCRYPTION MODULE ===
// Uses UserID to derive encryption keys - no password needed

// === USER-SPECIFIC SALT GENERATION ===
async function generateUserSalt(userId) {
  // Create a consistent salt from userId using SHA-256
  const userIdBuffer = new TextEncoder().encode(userId);
  const hashBuffer = await crypto.subtle.digest('SHA-256', userIdBuffer);
  return new Uint8Array(hashBuffer.slice(0, 16)); // Use first 16 bytes as salt
}

// === USER-SPECIFIC KEY DERIVATION ===
async function deriveKeyFromUserId(userId) {
  try {
    // Create user-specific salt from userId
    const salt = await generateUserSalt(userId);
    
    // Use userId as the key material (consistent for each user)
    const userIdBuffer = new TextEncoder().encode(userId);

    // Import userId as key material
    const userIdKey = await crypto.subtle.importKey(
      'raw',
      userIdBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    // Derive encryption key using PBKDF2
    const encryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 25000,
        hash: 'SHA-256'
      },
      userIdKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    return encryptionKey;
  } catch (error) {
    console.error('Error deriving key from userId:', error);
    throw new Error('Failed to derive encryption key');
  }
}

// === ENCRYPTION FUNCTION ===
async function encryptText(text, userId) {
  try {
    if (!userId) {
      throw new Error('User ID is required for encryption');
    }

    const key = await deriveKeyFromUserId(userId);
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 12-byte IV for AES-GCM

    const encoded = new TextEncoder().encode(text);
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encoded
    );

    // Combine IV and encrypted data, then base64 encode
    const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
    combined.set(new Uint8Array(iv), 0);
    combined.set(new Uint8Array(encrypted), iv.byteLength);

    return btoa(String.fromCharCode.apply(null, combined));
  } catch (error) {
    console.error('Error encrypting text:', error);
    throw new Error('Failed to encrypt text');
  }
}

// === DECRYPTION FUNCTION ===
async function decryptText(encryptedText, userId) {
  try {
    if (!userId) {
      throw new Error('User ID is required for decryption');
    }
    if (!isEncrypted(encryptedText)) {
      // If it's not in the expected encrypted format, return as is (might be plaintext)
      console.warn('Attempted to decrypt non-encrypted text. Returning original.');
      return encryptedText;
    }

    const decoded = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));

    // Extract IV (first 12 bytes) and encrypted data
    const iv = decoded.slice(0, 12);
    const encryptedData = decoded.slice(12);

    const key = await deriveKeyFromUserId(userId);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encryptedData
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Error decrypting text:', error);
    throw new Error('Failed to decrypt text');
  }
}

// === HELPER FUNCTIONS ===
function isEncrypted(text) {
  // Check if the text is base64 encoded and has the expected length for IV + some data
  try {
    const decoded = Uint8Array.from(atob(text), c => c.charCodeAt(0));
    // Minimum length: 12 (IV) + 1 (min encrypted byte)
    return decoded.byteLength >= 13;
  } catch (e) {
    return false;
  }
}

export {
  deriveKeyFromUserId,
  encryptText,
  decryptText,
  isEncrypted,
  generateUserSalt
};
