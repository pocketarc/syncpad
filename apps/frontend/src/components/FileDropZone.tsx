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
        (e: React.DragEvent<HTMLDivElement>) => {
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

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
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

    return (
        <section
            className={`w-full border-2 border-dashed rounded-lg p-4 transition-colors ${
                disabled
                    ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                    : "border-gray-300 bg-white cursor-pointer hover:border-gray-400"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={handleClick}
            aria-label="File drop zone"
        >
            <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileInputChange}
                disabled={disabled}
            />
            {children}
            <div className={`text-center mt-2 ${disabled ? "text-gray-300" : "text-gray-400"}`}>
                {disabled
                    ? "File uploads disabled while connecting..."
                    : "Tap here to select files, or drag and drop files here to sync them."}
            </div>
        </section>
    );
}
