"use client";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

// biome-ignore lint/style/noDefaultExport: Next.js requires a default export for pages.
export default function AboutPage() {
    return (
        <div className="flex min-h-screen flex-col">
            <main className="flex flex-col items-center p-4 flex-1">
                <div className="w-full max-w-4xl">
                    <Header>
                        <p className="text-sm text-orange-600 dark:text-orange-400">
                            The zero-friction cross-device clipboard.
                        </p>
                    </Header>
                    <div className="prose prose-stone my-14 mx-auto dark:prose-invert prose-a:text-orange-600 dark:prose-a:text-orange-400">
                        <h2>About</h2>

                        <p>
                            SyncPad is a zero-friction, browser-based scratchpad for instant text and file
                            synchronization across devices. It solves the common problem of needing to quickly transfer
                            small pieces of information (code snippets, URLs, temporary files) between machines without
                            the overhead of dedicated apps, cloud storage, or messaging yourself.
                        </p>

                        <p>
                            Each SyncPad session is isolated in its own room with a unique, shareable URL. When you
                            visit the root URL, you&apos;re automatically redirected to a new room with a memorable ID.
                            You can share this room URL with others to collaborate in real-time.
                        </p>

                        <p>Built with three core goals:</p>

                        <ul>
                            <li>
                                <strong>Simplicity:</strong> No accounts, no configuration, no installs.
                            </li>
                            <li>
                                <strong>Performance:</strong> Lightweight, high-performance stack for minimal latency.
                            </li>
                            <li>
                                <strong>Privacy:</strong> Data is ephemeral and never stored at rest.
                            </li>
                        </ul>

                        <p>
                            If you have any questions, comments, or feedback, please{" "}
                            <a href="https://twitter.com/pocketarc">tweet at me</a> or{" "}
                            <a href="mailto:hello@pocketarc.com">send me an email</a>.
                        </p>

                        <h2>Technical Details</h2>

                        <p>
                            SyncPad is open source and available on{" "}
                            <a href="https://github.com/pocketarc/syncpad">GitHub</a>. It&apos;s built with{" "}
                            <a href="https://nextjs.org/">Next.js</a>, <a href="https://bun.sh/">Bun</a>, and{" "}
                            <a href="https://tailwindcss.com/">Tailwind CSS</a>.
                        </p>

                        <p>
                            The architecture is simple: a WebSocket server acts as a real-time message broker, streaming
                            data directly between connected clients. Each room uses isolated pub/sub topics to ensure
                            complete privacy between sessions. No data is stored on the server - it&apos;s purely
                            ephemeral synchronization.
                        </p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
