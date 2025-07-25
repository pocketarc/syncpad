import { useEffect, useState } from "react";

// A static salt can be used here. While unique salts are generally best practice,
// in our specific case, the primary secret (the room ID) has very high entropy.
// A static salt is acceptable and simplifies the implementation, as we don't need
// to communicate a unique salt between clients. The salt is sourced from the
// official Web Crypto API examples.
const SALT = new Uint8Array([16, 38, 23, 97, 4, 1, 8, 59, 11, 5, 2, 9, 4, 0, 8, 1]);
const IV_LENGTH = 12; // AES-GCM standard non-secret IV length

/**
 * Derives a cryptographic key from a secret passphrase.
 * @param secret The input secret (e.g., the room ID).
 * @returns A promise that resolves to a CryptoKey.
 */
async function deriveKey(secret: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey("raw", encoder.encode(secret), { name: "PBKDF2" }, false, [
        "deriveKey",
    ]);

    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: SALT,
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
async function encrypt(key: CryptoKey, plaintext: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
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
async function decrypt(key: CryptoKey, ciphertextB64: string): Promise<string> {
    const combined = Uint8Array.from(window.atob(ciphertextB64), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);

    const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}

/**
 * A React hook to manage E2EE crypto operations based on a room secret.
 *
 * @param secret The shared secret (from the URL fragment) used to derive the key.
 * @returns An object with `encrypt` and `decrypt` functions, and a `ready` state.
 */
export function useCrypto(secret: string | null) {
    const [key, setKey] = useState<CryptoKey | null>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (secret && !key) {
            deriveKey(secret).then(setKey).catch(console.error);
        }
    }, [secret, key]);

    useEffect(() => {
        if (key) {
            setIsReady(true);
        }
    }, [key]);

    return {
        isReady,
        encrypt: (plaintext: string) => {
            if (!key) {
                throw new Error("Crypto key not yet derived.");
            }
            return encrypt(key, plaintext);
        },
        decrypt: (ciphertext: string) => {
            if (!key) {
                throw new Error("Crypto key not yet derived.");
            }
            return decrypt(key, ciphertext);
        },
    };
}
