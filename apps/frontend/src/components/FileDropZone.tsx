import type React from "react";
import { type ReactNode, useCallback, useRef } from "react";

interface FileDropZoneProps {
    onFileDrop: (files: File[]) => void;
    children: ReactNode;
    disabled?: boolean;
}

export function FileDropZone({ onFileDrop, children, disabled = false }: FileDropZoneProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLButtonElement>) => {
            e.preventDefault();
            if (disabled) {
                return;
            }
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                onFileDrop(Array.from(e.dataTransfer.files));
                e.dataTransfer.clearData();
            }
        },
        [onFileDrop, disabled],
    );

    const handleDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
        e.preventDefault(); // Necessary to allow dropping.
    };

    const handleClick = () => {
        if (disabled) {
            return;
        }
        fileInputRef.current?.click();
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled) {
            return;
        }
        if (e.target.files && e.target.files.length > 0) {
            onFileDrop(Array.from(e.target.files));
            // Reset the input so the same file can be selected again
            e.target.value = "";
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
        }
    };

    return (
        <button
            type="button"
            className={`w-full border-2 border-dashed rounded-lg p-4 transition-colors duration-200 ${
                disabled
                    ? "border-orange-200 dark:border-stone-600 bg-orange-50 dark:bg-stone-800 cursor-not-allowed"
                    : "border-orange-300 dark:border-stone-600 bg-white dark:bg-stone-900 cursor-pointer hover:border-orange-400 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-stone-800"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            aria-label="File drop zone"
            disabled={disabled}
        >
            <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileInputChange}
                disabled={disabled}
                aria-hidden="true"
                tabIndex={-1}
            />
            {children}
            <div
                className={`text-center mt-2 transition-colors duration-200 ${disabled ? "text-orange-300 dark:text-stone-500" : "text-orange-500 dark:text-orange-400"}`}
            >
                {disabled
                    ? "File uploads disabled while connecting..."
                    : "📁 Tap to select files or drag & drop to sync instantly"}
            </div>
        </button>
    );
}
