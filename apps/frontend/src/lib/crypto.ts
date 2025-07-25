const IV_LENGTH = 12; // AES-GCM standard non-secret IV length
const SALT_PREFIX = "syncpad-salt-"; // A constant prefix to ensure the derived salt is unique to this application

/**
 * Derives a deterministic salt from the room secret. This ensures that each room
 * gets a unique salt for key derivation, preventing cross-room rainbow table attacks,
 * while still allowing all users in the same room to derive the same key.
 * @param secret The room's secret passphrase.
 * @returns A promise that resolves to a Uint8Array salt.
 */
async function getSalt(secret: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${SALT_PREFIX}${secret}`);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    return new Uint8Array(hashBuffer);
}

/**
 * Derives a cryptographic key from a secret passphrase.
 * @param secret The input secret (e.g., the room ID).
 * @returns A promise that resolves to a CryptoKey.
 */
export async function deriveKey(secret: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey("raw", encoder.encode(secret), { name: "PBKDF2" }, false, [
        "deriveKey",
    ]);
    const salt = await getSalt(secret);

    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations: 100000, // A standard number of iterations for PBKDF2
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"],
    );
}

/**
 * Encrypts a plaintext string using the derived key.
 * @param key The CryptoKey to use for encryption.
 * @param plaintext The string to encrypt.
 * @returns A promise that resolves to a Base64 encoded ciphertext string.
 */
export async function encrypt(key: CryptoKey, plaintext: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    // A unique IV must be generated for every encryption operation.
    const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const ciphertext = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);

    // Prepend the IV to the ciphertext. It's not a secret and is required for decryption.
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Return as a Base64 string for easy transport
    return window.btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a Base64 encoded ciphertext string using the derived key.
 * @param key The CryptoKey to use for decryption.
 * @param ciphertextB64 The Base64 encoded string to decrypt.
 * @returns A promise that resolves to the original plaintext string.
 */
export async function decrypt(key: CryptoKey, ciphertextB64: string): Promise<string> {
    const combined = Uint8Array.from(window.atob(ciphertextB64), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}
