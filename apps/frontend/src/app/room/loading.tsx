"use client";

import { Footer } from "@/components/Footer.tsx";
import { Header } from "@/components/Header.tsx";

// biome-ignore lint/style/noDefaultExport: Next.js requires a default export for pages.
export default function Loading() {
    return (
        <div className="flex min-h-screen flex-col">
            <main className="flex flex-col items-center p-4 flex-1">
                <div className="w-full flex flex-col flex-1 max-w-4xl">
                    <Header>
                        <p className="text-sm text-orange-600 dark:text-orange-400">
                            The zero-friction cross-device clipboard.
                        </p>
                    </Header>
                    <section className="flex flex-col items-center justify-center p-4 flex-1">
                        <div className="text-orange-600 dark:text-orange-400 text-lg">Loading...</div>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
}
