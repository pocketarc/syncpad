import { useEffect, useMemo, useState } from "react";
import { decrypt, deriveKey, encrypt } from "@/lib/crypto";

/**
 * A React hook to manage E2EE crypto operations based on a room secret.
 *
 * This hook is responsible for deriving and managing the cryptographic key
 * for the current room session. In non-HTTPS contexts, the key will be null
 * and operations will use plaintext mode.
 *
 * @param secret The shared secret (from the URL fragment) used to derive the key.
 * @returns An object with `encrypt` and `decrypt` functions, and a `ready` state.
 */
export function useCrypto(secret: string | null) {
    const [key, setKey] = useState<CryptoKey | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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
            setIsLoading(true);
            memoizedDeriveKey()
                .then((derivedKey) => {
                    setKey(derivedKey);
                    setIsLoading(false);
                })
                .catch((err) => {
                    // Use a generic error message to avoid leaking crypto details.
                    console.error("Key derivation failed.", err);
                    setKey(null);
                    setIsLoading(false);
                });
        }
    }, [memoizedDeriveKey]);

    return {
        isReady: !isLoading,
        encrypt: (plaintext: string) => {
            return encrypt(key, plaintext);
        },
        decrypt: (ciphertext: string) => {
            return decrypt(key, ciphertext);
        },
    };
}
