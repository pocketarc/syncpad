import { useCallback, useEffect, useMemo, useState } from "react";
import { decrypt, deriveKey, encrypt } from "@/lib/crypto";

/**
 * A React hook to manage E2EE crypto operations based on a room secret.
 *
 * This hook is responsible for deriving and managing the cryptographic key
 * for the current room session.
 *
 * @param secret The shared secret (from the URL fragment) used to derive the key.
 * @returns An object with `encrypt` and `decrypt` functions, and a `ready` state.
 */
export function useCrypto(secret: string | null) {
    const [key, setKey] = useState<CryptoKey | null>(null);

    // Memoize the derived key. The key derivation function is computationally
    // expensive, and this ensures it only runs when the room secret changes.
    const memoizedDeriveKey = useMemo(() => {
        if (secret) {
            return () => deriveKey(secret);
        }
        return null;
    }, [secret]);

    useEffect(() => {
        if (memoizedDeriveKey) {
            memoizedDeriveKey()
                .then(setKey)
                .catch((err) => {
                    // Use a generic error message to avoid leaking crypto details.
                    console.error("Key derivation failed.", err);
                    setKey(null);
                });
        }
    }, [memoizedDeriveKey]);

    const encryptCallback = useCallback(
        (plaintext: string) => {
            if (!key) {
                throw new Error("Crypto key is not available.");
            }
            return encrypt(key, plaintext);
        },
        [key],
    );

    const decryptCallback = useCallback(
        (ciphertext: string) => {
            if (!key) {
                throw new Error("Crypto key is not available.");
            }
            return decrypt(key, ciphertext);
        },
        [key],
    );

    return {
        isReady: !!key,
        encrypt: encryptCallback,
        decrypt: decryptCallback,
    };
}
