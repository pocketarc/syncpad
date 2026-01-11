const IV_LENGTH = 12; // AES-GCM standard non-secret IV length
const SALT_PREFIX = "syncpad-salt-"; // A constant prefix to ensure the derived salt is unique to this application
const PLAINTEXT_PREFIX = "plaintext:"; // Prefix to mark plaintext messages in non-HTTPS contexts

/**
 * Checks if end-to-end encryption is available in the current context.
 * E2EE requires the Web Crypto API, which is only available in secure contexts (HTTPS or localhost).
 * @returns true if E2EE is available, false otherwise.
 */
export function isE2EE(): boolean {
    return typeof window !== "undefined" && window.crypto?.subtle !== undefined;
}

/**
 * Derives a deterministic salt from the room secret. This ensures that each room
 * gets a unique salt for key derivation, preventing cross-room rainbow table attacks,
 * while still allowing all users in the same room to derive the same key.
 * @param secret The room's secret passphrase.
 * @returns A promise that resolves to a Uint8Array salt.
 */
async function getSalt(secret: string): Promise<Uint8Array<ArrayBuffer>> {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${SALT_PREFIX}${secret}`);

    // Fallback for non-HTTPS contexts: return the encoded data directly
    if (!isE2EE()) {
        return new Uint8Array(data);
    }

    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    return new Uint8Array(hashBuffer);
}

/**
 * Derives a cryptographic key from a secret passphrase.
 * @param secret The input secret (e.g., the room ID).
 * @returns A promise that resolves to a CryptoKey, or null in non-HTTPS contexts.
 */
export async function deriveKey(secret: string): Promise<CryptoKey | null> {
    // Fallback for non-HTTPS contexts: return null (no encryption)
    if (!isE2EE()) {
        return null;
    }

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
 * @param key The CryptoKey to use for encryption, or null for plaintext mode.
 * @param plaintext The string to encrypt.
 * @returns A promise that resolves to a Base64 encoded ciphertext string (or plaintext with prefix).
 */
export async function encrypt(key: CryptoKey | null, plaintext: string): Promise<string> {
    // Fallback for non-HTTPS contexts: return plaintext with prefix marker
    if (key === null) {
        return PLAINTEXT_PREFIX + window.btoa(unescape(encodeURIComponent(plaintext)));
    }

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
 * @param key The CryptoKey to use for decryption, or null for plaintext mode.
 * @param ciphertextB64 The Base64 encoded string to decrypt (or plaintext with prefix).
 * @returns A promise that resolves to the original plaintext string.
 */
export async function decrypt(key: CryptoKey | null, ciphertextB64: string): Promise<string> {
    // Check if this is a plaintext message (has the prefix marker)
    if (ciphertextB64.startsWith(PLAINTEXT_PREFIX)) {
        const base64Data = ciphertextB64.slice(PLAINTEXT_PREFIX.length);
        return decodeURIComponent(escape(window.atob(base64Data)));
    }

    // If key is null but message is encrypted, we cannot decrypt
    if (key === null) {
        throw new Error("Cannot decrypt encrypted message without a key (non-HTTPS context)");
    }

    const combined = Uint8Array.from(window.atob(ciphertextB64), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}

/**
 * Calculates a public room ID from a secret using SHA-256.
 * This is a one-way process, so the secret cannot be derived from the public ID.
 * @param secret The secret string from the URL fragment.
 * @returns A promise that resolves to a hex-encoded SHA-256 hash, or the secret with a prefix in non-HTTPS contexts.
 */
export async function getPublicId(secret: string): Promise<string> {
    // Fallback for non-HTTPS contexts: return secret with prefix
    // This ensures encrypted and non-encrypted rooms remain separate even with the same secret
    if (!isE2EE()) {
        return `plaintext-${secret}`;
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(secret);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Counter for fallback ID generation
let idCounter = 0;

/**
 * Generates a unique identifier for messages.
 * Uses crypto.randomUUID() in secure contexts (HTTPS), or falls back to a timestamp-based ID.
 * @returns A unique identifier string.
 */
export function generateId(): string {
    // Use crypto.randomUUID() if available (secure contexts)
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    // Fallback for non-HTTPS contexts: timestamp + random + counter
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    const counterPart = (idCounter++).toString(36);
    return `${timestamp}-${randomPart}-${counterPart}`;
}
