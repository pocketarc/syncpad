import type React from "react";
import { type ReactNode, useCallback, useRef } from "react";

interface FileDropZoneProps {
    onFileDrop: (files: File[]) => void;
    children: ReactNode;
}

export function FileDropZone({ onFileDrop, children }: FileDropZoneProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrop = useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                onFileDrop(Array.from(e.dataTransfer.files));
                e.dataTransfer.clearData();
            }
        },
        [onFileDrop],
    );

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); // Necessary to allow dropping.
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileDrop(Array.from(e.target.files));
            // Reset the input so the same file can be selected again
            e.target.value = "";
        }
    };

    return (
        <section
            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white cursor-pointer hover:border-gray-400 transition-colors"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={handleClick}
            aria-label="File drop zone"
        >
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInputChange} />
            {children}
            <div className="text-center text-gray-400 mt-2">
                Tap here to select files, or drag and drop files here to sync them.
            </div>
        </section>
    );
}
