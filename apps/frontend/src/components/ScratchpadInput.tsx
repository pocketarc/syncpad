import type React from "react";

interface ScratchpadInputProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export function ScratchpadInput({ value, onChange }: ScratchpadInputProps) {
    return (
        <textarea
            value={value}
            onChange={onChange}
            className="w-full h-80 p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            placeholder="Paste stuff here or drop files in the box..."
        />
    );
}
