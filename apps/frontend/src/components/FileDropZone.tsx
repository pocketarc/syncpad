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
        (e: React.DragEvent<HTMLElement>) => {
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

    const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
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
            e.target.value = "";
        }
    };

    const baseClasses = "relative w-full border-2 border-dashed rounded-lg p-4 transition-colors duration-200";
    const disabledClasses = "border-orange-200 dark:border-stone-600 bg-orange-50 dark:bg-stone-800";
    const enabledClasses =
        "border-orange-300 dark:border-stone-600 bg-white dark:bg-stone-900 hover:border-orange-400 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-stone-800";
    const containerClassName = `${baseClasses} ${disabled ? disabledClasses : enabledClasses}`;

    const textBaseClasses = "text-center mt-2 transition-colors duration-200";
    const textDisabledClasses = "text-orange-300 dark:text-stone-500";
    const textEnabledClasses = "text-orange-500 dark:text-orange-400";
    const textClassName = `${textBaseClasses} ${disabled ? textDisabledClasses : textEnabledClasses}`;

    return (
        <section
            data-testid="file-drop-zone-container"
            aria-label="File Drop Zone Container"
            className={containerClassName}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            <button
                type="button"
                onClick={handleClick}
                disabled={disabled}
                className="absolute inset-0 z-10 cursor-pointer disabled:cursor-not-allowed"
                aria-label="File drop zone"
            />

            <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileInputChange}
                disabled={disabled}
                tabIndex={-1}
            />
            <div className="relative z-20">{children}</div>
            <div className={textClassName}>
                {disabled
                    ? "File uploads disabled while connecting..."
                    : "📁 Tap to select files or drag & drop to sync instantly"}
            </div>
        </section>
    );
}
