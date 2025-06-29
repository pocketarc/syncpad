import type React from "react";

interface ScratchpadInputProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    disabled?: boolean;
}

export function ScratchpadInput({ value, onChange, disabled = false }: ScratchpadInputProps) {
    const handleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
        e.stopPropagation();
    };

    return (
        <textarea
            value={value}
            onChange={onChange}
            onClick={handleClick}
            disabled={disabled}
            className={`w-full h-80 p-4 border rounded-lg focus:outline-none focus:ring-2 font-mono transition-colors duration-200 ${
                disabled
                    ? "bg-orange-50 dark:bg-stone-800 text-orange-400 dark:text-stone-500 cursor-not-allowed border-orange-200 dark:border-stone-600"
                    : "bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 border-orange-200 dark:border-stone-600 focus:ring-orange-400 dark:focus:ring-orange-500 focus:border-orange-400 dark:focus:border-orange-500"
            }`}
            placeholder={
                disabled
                    ? "Connecting to server..."
                    : "Start typing here... Everything syncs instantly across your devices ∞"
            }
        />
    );
}
