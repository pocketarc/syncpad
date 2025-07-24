"use client";

import { redirect } from "next/navigation";
import { useEffect } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { generateRoomId } from "@/lib/roomId";

// biome-ignore lint/style/noDefaultExport: Next.js requires a default export for pages.
export default function HomePage() {
    useEffect(() => {
        const roomId = generateRoomId();
        redirect(`/room?id=${roomId}`);
    }, []);

    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-stone-900 dark:to-stone-800 transition-colors duration-200">
            <main className="flex flex-col items-center p-4 flex-1">
                <div className="w-full flex flex-col flex-1 max-w-4xl">
                    <Header>
                        <p className="text-sm text-orange-600 dark:text-orange-400">
                            The zero-friction cross-device clipboard.
                        </p>
                    </Header>
                    <section className="flex flex-col items-center justify-center p-4 flex-1">
                        <div className="text-orange-600 dark:text-orange-400 text-lg">Creating a new room...</div>
                    </section>
                </div>
            </main>

            <Footer />
        </div>
    );
}
