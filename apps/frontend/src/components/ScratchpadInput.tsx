import type React from "react";

interface ScratchpadInputProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    disabled?: boolean;
}

export function ScratchpadInput({ value, onChange, disabled = false }: ScratchpadInputProps) {
    return (
        <textarea
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={`w-full h-80 p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono ${
                disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
            }`}
            placeholder={disabled ? "Connecting to server..." : "Paste stuff here or drop files in the box..."}
        />
    );
}
