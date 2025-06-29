import Link from "next/link";

export function Footer() {
    return (
        <footer className="w-full bg-orange-100 dark:bg-stone-800 p-4">
            <div className="text-orange-800 dark:text-orange-300 text-center text-xs sm:text-sm">
                Built <span>with 🧡</span> by{" "}
                <a className="underline underline-offset-4" href="https://pocketarc.com">
                    PocketArC
                </a>{" "}
                ·{" "}
                <Link className="underline underline-offset-4" href="/about">
                    About
                </Link>{" "}
                ·{" "}
                <a className="underline underline-offset-4" href="https://twitter.com/pocketarc">
                    Twitter
                </a>
            </div>
        </footer>
    );
}
