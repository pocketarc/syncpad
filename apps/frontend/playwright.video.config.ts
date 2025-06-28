import { defineConfig, devices } from "@playwright/test";

// biome-ignore lint/style/noDefaultExport: We need a default export for Playwright config.
export default defineConfig({
    testDir: "./tests",
    fullyParallel: false, // Sequential for better video quality(?)
    forbidOnly: !!process.env["CI"],
    retries: 0,
    workers: 1,
    reporter: [["html"], ["list"]],
    outputDir: "test-results/",
    use: {
        baseURL: "http://localhost:3050",
        trace: "on",
        screenshot: "on",
        video: "on",
        actionTimeout: 10000,
        navigationTimeout: 30000,
    },

    projects: [
        {
            name: "chromium-video",
            use: {
                ...devices["Desktop Chrome"],
                viewport: { width: 1280, height: 720 },
            },
        },
    ],

    webServer: [
        {
            command: "cd ../backend && bun run dev",
            port: 8080,
            reuseExistingServer: !process.env["CI"],
        },
        {
            command: "bun run dev",
            port: 3050,
            reuseExistingServer: !process.env["CI"],
        },
    ],
});
