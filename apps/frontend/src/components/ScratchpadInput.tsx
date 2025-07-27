import type { ChangeEvent } from "react";
import { forwardRef } from "react";

interface ScratchpadInputProps {
    value: string;
    onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
    disabled?: boolean;
}

export const ScratchpadInput = forwardRef<HTMLTextAreaElement, ScratchpadInputProps>(function ScratchpadInput(
    { value, onChange, disabled = false },
    ref,
) {
    return (
        <textarea
            ref={ref}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={`w-full h-80 p-4 border rounded-lg focus:outline-none focus:ring-2 font-mono transition-colors duration-200 ${
                disabled
                    ? "bg-orange-50 dark:bg-stone-800 text-orange-400 dark:text-stone-500 cursor-not-allowed border-orange-200 dark:border-stone-600"
                    : "bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 border-orange-200 dark:border-stone-600 focus:ring-orange-400 dark:focus:ring-orange-500 focus:border-orange-400 dark:focus:border-orange-500"
            }`}
            placeholder={disabled ? "Connecting to server..." : "Type here. It appears there. Magic."}
        />
    );
});
