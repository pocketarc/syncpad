import Image from "next/image";
import Link from "next/link";
import { useDarkMode } from "@/hooks/useDarkMode";
import type React from "react";

interface HeaderProps {
    children?: React.ReactNode;
    buttons?: React.ReactNode;
}

export function Header({ children, buttons }: HeaderProps) {
    const { isDark, toggleDarkMode } = useDarkMode();

    return (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <Link href="/">
                    <Image src="/logo.png" alt="SyncPad Logo" width={48} height={48} className="drop-shadow-sm" />
                </Link>
                <div>
                    <Link href="/">
                        <h1 className="text-3xl font-bold text-orange-800 dark:text-orange-300">SyncPad</h1>
                    </Link>
                    {children}
                </div>
            </div>
            <div className="flex items-center gap-2">
                {buttons}
                <button
                    type="button"
                    onClick={toggleDarkMode}
                    className="p-2 text-sm rounded-lg bg-white dark:bg-stone-800 border border-orange-200 dark:border-stone-600 hover:bg-orange-50 dark:hover:bg-stone-700 transition-colors duration-200 cursor-pointer"
                    aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                >
                    {isDark ? "☀️" : "🌙"}
                </button>
            </div>
        </div>
    );
}
