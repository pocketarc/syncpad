import type { PlaywrightTestConfig } from "@playwright/test";
import { defineConfig, devices } from "@playwright/test";

const extraConfig: Partial<PlaywrightTestConfig> = {};

if (!process.env["CI"]) {
    extraConfig.webServer = [
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
    ];
}

// biome-ignore lint/style/noDefaultExport: We need a default export for Playwright config.
export default defineConfig({
    testDir: "./tests",
    fullyParallel: true,
    forbidOnly: !!process.env["CI"],
    retries: process.env["CI"] ? 2 : 0,
    reporter: "html",
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
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
        },
        {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
        },
        {
            name: "Mobile Chrome",
            use: {
                ...devices["Pixel 5"],
                hasTouch: true,
            },
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
