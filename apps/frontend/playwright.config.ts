import type { PlaywrightTestConfig } from "@playwright/test";
import { defineConfig, devices } from "@playwright/test";

const extraConfig: Partial<PlaywrightTestConfig> = {};

if (!process.env["CI"]) {
    extraConfig.webServer = [
        {
            command: "cd ../backend && bun run dev",
            port: 8080,
            reuseExistingServer: true,
        },
        {
            command: "bun run dev",
            port: 3050,
            reuseExistingServer: true,
        },
    ];
}

// biome-ignore lint/style/noDefaultExport: We need a default export for Playwright config.
export default defineConfig({
    testDir: "./tests",
    fullyParallel: true,
    forbidOnly: !!process.env["CI"],
    retries: 2,
    maxFailures: 3,
    reporter: [[process.env["CI"] ? "github" : "list"], ["html", { open: "never" }]],
    reportSlowTests: {
        max: 5,
        threshold: 2000,
    },
    outputDir: "test-results/",
    use: {
        baseURL: process.env["PLAYWRIGHT_BASE_URL"] ?? "http://localhost:3050",
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
    },

    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
        {
            name: "Mobile Safari",
            use: {
                ...devices["iPhone 12"],
                hasTouch: true,
            },
        },
    ],
    ...extraConfig,
});
