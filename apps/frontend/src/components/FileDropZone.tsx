import type React from "react";
import { type ReactNode, useCallback } from "react";

interface FileDropZoneProps {
    onFileDrop: (files: File[]) => void;
    children: ReactNode;
}

export function FileDropZone({ onFileDrop, children }: FileDropZoneProps) {
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

    return (
        <section
            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            aria-label="File drop zone"
        >
            {children}
            <div className="text-center text-gray-400 mt-2">Or drag and drop files here to sync them.</div>
        </section>
    );
}
