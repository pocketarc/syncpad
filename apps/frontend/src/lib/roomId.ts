import * as niceware from "niceware";

/**
 * Generates a random memorable room ID in the format: word-word-word-word
 *
 * This uses the niceware-ts library to generate a passphrase with 8 bytes (64 bits) of entropy,
 * which results in a 4-word phrase. This is secure enough to prevent brute-force
 * dictionary attacks and provides a good user experience.
 *
 * Example: "depressingly-unreasoning-pummel-profound"
 */
export function generateRoomId(): string {
    // 4 words * 2 bytes/word = 8 bytes of entropy
    const passphrase = niceware.generatePassphrase(8);
    return passphrase.join("-");
}
