// Recognize all CSS files as module imports.
declare module "*.css" {}

/**
 * A module for converting cryptographic keys into human-readable phrases.
 * Based on the original niceware.js source.
 */
declare module "niceware" {
    /**
     * Converts a byte array into a passphrase.
     * @param bytes The bytes to convert. Must be a Buffer or Uint8Array with an even length.
     * @returns An array of words representing the passphrase.
     * @throws {Error} If the input is not a Buffer or Uint8Array, or if its length is odd.
     */
    export function bytesToPassphrase(bytes: Buffer | Uint8Array): string[];

    /**
     * Converts a phrase back into the original byte array.
     * @param words The array of words to convert.
     * @returns A Buffer containing the original bytes.
     * @throws {Error} If the input is not an array or contains invalid words.
     */
    export function passphraseToBytes(words: string[]): Buffer;

    /**
     * Generates a random passphrase with the specified number of bytes.
     * NOTE: `size` must be an even number between 0 and 1024.
     * @param size The number of random bytes to use.
     * @returns An array of words representing the passphrase.
     * @throws {Error} If the size is not a valid number.
     */
    export function generatePassphrase(size: number): string[];
}
