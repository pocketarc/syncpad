# SyncPad: Engineering Onboarding & Technical Overview

## 1. Project Overview

### 1.1. Purpose

SyncPad is a zero-friction, browser-based scratchpad for instant text and file synchronization across devices. It supports real-time, multi-user collaborative editing, solving the common problem of needing to quickly share and edit information (code snippets, notes, URLs) and transfer temporary files between machines without the overhead of dedicated apps, cloud storage, or messaging yourself.

Each SyncPad session is isolated in its own **room** with a unique, shareable URL. When you visit the root URL, you're automatically redirected to a new room with a memorable ID (e.g., `brave-coral-eagle-castle`). You can share this room URL with others to collaborate in real-time.

### 1.2. Guiding Philosophy

The project is built on three core principles:

1.  **Simplicity:** The user experience should be immediate and intuitive. No accounts, no configuration, no installs. Open a tab and it just works.
2.  **Performance:** The synchronization should feel instantaneous. We use a lightweight, high-performance stack (Bun, WebSockets, Yjs) to minimize latency.
3.  **Privacy:** Data is ephemeral and **end-to-end encrypted**. It is streamed directly between connected clients via the server and is **never stored at rest**. The server acts as a simple, zero-knowledge message broker that cannot read the content of the messages being exchanged.

## 2. System Architecture

SyncPad employs a simple client-server architecture composed of two primary services within a monorepo.

```
+--------------------------------+      +--------------------------------+
|       User (Browser Tab)       |      |   Another User (Browser Tab)   |
|  [ Frontend - Next.js App ]    |      |  [ Frontend - Next.js App ]    |
| (E2E Encryption/Decryption)    |      | (E2E Encryption/Decryption)    |
+--------------------------------+      +--------------------------------+
           ^      | (WebSocket with         ^      | (WebSocket with
           |      v  Encrypted Data)        |      v  Encrypted Data)
+----------------------------------------------------------------------+
|                         Sync Broker (Server)                         |
|                     [ Backend - Bun WS Server ]                      |
|                 (Zero-Knowledge Message Forwarding)                  |
+----------------------------------------------------------------------+
```

-   **Backend (`apps/backend`):** A minimalist WebSocket server built with Bun. It is a **zero-knowledge broker** that manages WebSocket connections and broadcasts opaque, encrypted messages to clients subscribed to a given room. It has no ability to decrypt the data it is forwarding.
-   **Frontend (`apps/frontend`):** A Next.js client application that provides the user interface. It manages all cryptography, deriving a key from the URL fragment, encrypting outgoing messages, and decrypting incoming ones. It establishes a persistent WebSocket connection to the backend using a public, non-reversible room ID.

## 3. Technology Stack

-   **Runtime & Package Manager:** **Bun** is used across the entire monorepo.
-   **Backend:** **Bun's native WebSocket API**, which is built on uWebSockets for high performance.
-   **Frontend:** **Next.js 15** (with Turbopack) and **React 19**.
-   **Collaborative Editing:** **Yjs** for high-performance, conflict-free text synchronization using CRDTs.
-   **Styling:** **Tailwind CSS 4**.
-   **Web Server:** **Nginx** serves the frontend in containerized environments.
-   **Monorepo Management:** **Turbo** for orchestrating build, development, and linting tasks.
-   **Containerization**: **Docker** with Docker Compose for local development and CI.
-   **End-to-End Testing:** **Playwright** for comprehensive, multi-browser testing of the application's core synchronization features.

## 4. Project Structure

The codebase is organized into a monorepo under the `apps/` directory.

### 4.1. `apps/backend`

This contains the Bun WebSocket server.
-   `src/index.ts`: The entry point and complete source code for the server. It initializes environment variables and starts the `Bun.serve` instance with WebSocket handlers.

### 4.2. `apps/frontend`

This contains the Next.js client application.

-   `nginx.conf`: Nginx configuration for serving the static frontend build.
-   `src/app/`: The core application code following the Next.js App Router paradigm.
    -   `layout.tsx`: The root layout, setting up fonts and global styles.
    -   `page.tsx`: The root page that automatically redirects to a new room with a generated room ID.
    -   `room/page.tsx`: The main room page component that handles the SyncPad interface for a specific room.
    -   `about/page.tsx`: A static page providing information about the project.
-   `src/components/`: Reusable, "dumb" React components focused on presentation.
    -   `Header.tsx`: The main header component, including the logo, title, and dark mode toggle.
    -   `Footer.tsx`: The main footer component with links to about page and social media.
    -   `FileDropZone.tsx`: A wrapper component that handles both drag-and-drop events and click-to-upload functionality.
    -   `ScratchpadInput.tsx`: The main `<textarea>` for text entry.
    -   `StatusBar.tsx`: A simple component to display the WebSocket connection status, including a `data-testid="status-bar"` for testing.
-   `src/hooks/`: Reusable logic encapsulated in custom React hooks.
    -   `useCrypto.ts`: **The core of the E2EE implementation.** This hook derives a key from the room secret (URL fragment), and exposes `encrypt` and `decrypt` functions using the Web Crypto API.
    -   `useHostname.ts`: A client-side hook to safely get the `window.location.hostname` for constructing the WebSocket URL. This is critical for making the app work on any network without hardcoding `localhost`.
    -   `useScratchpadSocket.ts`: **The most important frontend hook.** It manages the entire WebSocket lifecycle: connection, event listeners (`onopen`, `onmessage`, etc.), state management (`status`, `lastMessage`), and provides a `sendMessage` function.
    -   `useYjs.ts`: **The core of the collaborative editing implementation.** This hook encapsulates all Yjs-related logic, including `Y.Doc` management, state synchronization via awareness and update messages, and cursor position handling.
    -   `useDarkMode.ts`: Manages the dark mode state and persists the user's preference in `localStorage`.
-   `src/lib/`: Shared utilities and type definitions.
    -   `downloadFile.ts`: A utility function that takes a file payload and triggers a browser download, which is the mechanism for receiving files.
    -   `roomId.ts`: A utility for generating high-entropy, memorable room IDs using the `niceware` library. This is the source of the client-side secret.
-   `tests/`: Contains all Playwright end-to-end tests.
    -   `crdt-sync.spec.ts`: Validates real-time collaborative text editing and ensures new clients correctly sync the full document state.
    -   `text-sync.spec.ts`: Validates real-time text synchronization between multiple clients.
    -   `file-upload.spec.ts`: Tests file upload functionality via both click/select and drag-and-drop.
    -   `multi-client-sync.spec.ts`: The most critical test suite, ensuring that actions in one client (text or file updates) are correctly reflected in other connected clients.
    -   `mobile-upload.spec.ts`: Tests behavior on mobile viewports.
    -   `disabled-input.spec.ts`: Ensures the input is disabled when not connected to the WebSocket server.
    -   `room-functionality.spec.ts`: Tests room isolation, sharing, and routing functionality.
    -   `auto-reconnection.spec.ts`: Tests the client's ability to automatically reconnect if the WebSocket connection is lost.
    -   `dark-mode.spec.ts`: Tests the dark mode toggle functionality.
    -   `no-self-download.spec.ts`: Ensures a user who uploads a file does not receive a download prompt for their own file.
    -   `share-room-feedback.spec.ts`: Verifies the "Copy" button provides user feedback on success or failure.
-   `playwright.config.ts`: The main Playwright configuration, which defines projects for different browsers and includes the crucial `webServer` option to automatically launch the dev environment for testing.

### 4.3. `packages/shared`

This directory contains code shared between the `frontend` and `backend` workspaces.
-   `src/types.ts`: Defines the TypeScript types for the WebSocket message protocol. **This is the contract between the frontend and backend.** It defines the over-the-wire `Message` format as well as the unencrypted client-side types.

### 4.4. `apps/playwright`
-   `Dockerfile`: A dedicated Dockerfile for running Playwright tests in a containerized CI environment.

### 4.5. Root Configuration
-   `docker-compose.yml`: Defines the services for local development.
-   `docker-compose.ci.yml`: Defines the services for running in a CI environment.

## 5. Core Concepts & Data Flow

### 5.1. End-to-End Encryption (E2EE) Model

SyncPad's privacy model is built on strong, client-side, end-to-end encryption. The server is a **zero-knowledge broker**; it forwards opaque data blobs and has no ability to decrypt the information being shared.

1.  **Secret Generation:** When a user creates a new room, the client generates a high-entropy, memorable passphrase (e.g., `vatting-precognition-garage-replicative`) using the `niceware` library. This passphrase is the **room's secret**.
2.  **Secret in URL Fragment:** This secret is stored exclusively in the **URL fragment** (`#`). For example: `https://syncpad.app/room#vatting-precognition-garage-replicative`. The fragment is a client-side-only part of the URL and is **never sent to the server**.
3.  **Public Channel ID:** To allow the server to route messages for a room without knowing the secret, the client computes a **public channel ID** by creating a one-way SHA-256 hash of the secret.
4.  **WebSocket Connection:** The client connects to the WebSocket server using this public, non-reversible channel ID in the URL path (e.g., `wss://syncpad.app/a1b2c3d4...`).
5.  **Key Derivation:** The client uses the Web Crypto API to derive a strong AES-256 encryption key from the secret passphrase in the URL fragment. This is done using PBKDF2 with 100,000 iterations.

### 5.2. WebSocket Message Protocol

All communication between the client and server uses a simple JSON-based message protocol defined in `packages/shared/src/types.ts`. The key feature is that the `payload` for all message types is always an **encrypted Base64 string**.

-   **Over-the-wire Message:**
    ```json
    {
      "type": "crdt", // or "file", "sync-request", etc.
      "payload": "BASE64_ENCRYPTED_STRING_WITH_IV...",
      "messageId": "client-generated-unique-id"
    }
    ```
-   The server sees only this structure. It cannot inspect the original content of the payload. The `type` field helps route different kinds of messages if needed in the future, but for now, all are broadcast to the room.

### 5.3. Data Flow: Collaborative Text Sync (CRDT)

Text synchronization is handled using a robust, conflict-free implementation with the Yjs CRDT library, which allows for true real-time collaborative editing. The end-to-end encryption model is fully preserved; all Yjs updates are encrypted before being sent over the network.

1.  **Initialization:**
    a.  Each client in a room initializes a Yjs document (`Y.Doc`) and a shared text type (`Y.Text`). This is managed by the `useYjs` hook.
    b.  When a client connects, it sends a `sync-request` message containing its current document state vector. This allows other clients to know what information the new client is missing.

2.  **User Action:** A user types in the `<ScratchpadInput>`.

3.  **Local CRDT Update:**
    a.  The `onChange` event is handled by `useYjs`.
    b.  Instead of updating React state directly, the change is applied to the local `Y.Doc`. Yjs calculates a highly efficient, incremental update that describes the change (e.g., "insert 'a' at position 4").

4.  **Encrypt and Broadcast Update:**
    a.  The `Y.Doc` emits an `update` event containing the incremental change as a `Uint8Array`.
    b.  This binary update is encoded into a Base64 string.
    c.  This string becomes the payload for a `crdt` message.
    d.  The `sendMessage` wrapper encrypts the payload using the shared room key.
    e.  The encrypted message is sent to the WebSocket server and broadcast to all other clients in the room.

5.  **Remote Client Reception:**
    a.  Other clients receive the encrypted `crdt` message.
    b.  The `onmessage` handler decrypts the payload to get the Base64-encoded Yjs update.
    c.  The Base64 string is decoded back into a `Uint8Array`.
    d.  The update is applied to the remote client's `Y.Doc` using `Y.applyUpdate`. Yjs automatically merges the change, guaranteeing eventual consistency across all clients without conflicts.

6.  **UI Update:**
    a.  The `Y.Text` object in each client emits a `change` event.
    b.  An observer function updates the React state (`text`), which re-renders the `<ScratchpadInput>` with the new, merged content.

7.  **New Client Sync:**
    a.  When a new client joins, it sends a `sync-request` with its empty state vector.
    b.  Existing clients receive this and respond with a `sync-response` containing the updates needed to bring the new client up to date. This ensures new participants get the full document history.

### 5.4. Data Flow: File Sync (with E2EE)

The file sync flow is separate from the CRDT text sync but follows a similar encryption and broadcast pattern.

1.  **User Action:** A user drops a file.
2.  **File Reading:** The `onFileDrop` event reads the file into a Base64 data URL.
3.  **Create Client Message:** It creates a `ClientFileMessage` object where the payload is an object containing the file's name, MIME type, and Base64 data.
4.  **Encrypt and Send:** The `sendMessage` wrapper `JSON.stringify`s the file payload object and encrypts the resulting string.
5.  **Broadcast:** The server broadcasts the encrypted message.
6.  **Receive and Decrypt:** Other clients receive the message and decrypt the payload string.
7.  **Trigger Download:** The decrypted string is `JSON.parse`d back into a file payload object, which is then passed to the `downloadFile` utility to trigger a browser download.

### 5.5. Room Usage

***For Users:**
- Visit the root URL (`/`) to automatically create a new, secure room.
- The URL in your address bar will be `.../room#some-four-words`. This is the URL you share.
- Use the "📋 Share Room" button to copy the correct room URL to your clipboard.
- Each room is completely isolated and end-to-end encrypted. Messages and files only sync within the same room.

**For Developers/Testing:**
- To connect multiple clients to the same room, ensure they all navigate to the exact same URL, including the fragment (e.g., `/room#test-room-secret`).
- The backend routing is handled automatically by hashing the secret. You do not need to manually manage public IDs.

## 6. Local Development & Testing

### 6.1. Testing

The Playwright test suite is configured to automatically launch the necessary `webServer` instances. You do not need to have `turbo dev` running to execute the tests.

-   **Run all tests headlessly (requires local Bun setup):**
    ```bash
    bun --cwd apps/frontend test
    ```

-   **Run all tests in a self-contained Docker environment (recommended for CI):**
    This command automatically rebuilds the Docker images if needed, ensuring tests always run against the latest code and dependencies.
    ```bash
    docker compose -f docker-compose.ci.yml up --build --remove-orphans --exit-code-from playwright --abort-on-container-exit
    ```

### 6.2. Test-Driven Development Guidelines

**IMPORTANT:** When implementing new features or fixing bugs, always follow this test-first approach:

1. **Write tests before implementation:** Create Playwright tests that describe the expected behavior before writing the actual code.
2. **Run tests to confirm they fail:** Ensure your new tests fail initially, proving they actually test the functionality.
3. **Implement the feature/fix:** Write the minimal code needed to make the tests pass.
4. **Run tests to confirm they pass:** Verify that your implementation works by running the tests and ensuring they all pass.
5. **Refactor if needed:** Clean up the code while keeping tests green.

This approach ensures:
- All new functionality is properly tested
- Tests actually validate the intended behavior
- Regressions are caught early
- Code quality remains high

Example workflow:
```bash
# 1. Write your test in tests/new-feature.spec.ts
# 2. Run the test to see it fail
bun --cwd apps/frontend test new-feature.spec.ts

# 3. Implement the feature
# 4. Run the test again to see it pass
bun --cwd apps/frontend test new-feature.spec.ts

# 5. Run all tests to ensure no regressions
bun --cwd apps/frontend test
```

### 6.3. Development Checklist

To consider a task complete, ensure the following:

-   [ ] **Code is written**: Implement the feature or fix.
-   [ ] **Tests are written**: Create Playwright tests that cover the new functionality.
-   [ ] **Tests pass**: Run the test suite to ensure all tests are passing.
-   [ ] **Code is linted**: Run `bun lint` to check for any linting issues.
-   [ ] **CLAUDE.md is updated**: Review this document and update it with any relevant changes or new concepts introduced.
-   [ ] **Write up a git commit message**: Clearly describe what was done, why, and any relevant context. No need to actually commit, just tell us what you would write.

### 6.4. Code Style Guidelines

- Never use `as` or `any` in TypeScript. Prefer type guards or type assertions.
- In tests, don't wait for specific amounts of time (e.g., `await page.waitForTimeout(1000)`). Instead, use Playwright's built-in waiting mechanisms like `page.waitForSelector()` or `page.waitForResponse()`.
- In tests, avoid brittle selectors. Use `data-testid` attributes for stable element selection.
- When things don't work as expected, use `console.log()` to debug and understand the state of your application. This is often more effective than trying to guess what might be wrong.

## 7. Configuration (Environment Variables)

| Variable                     | Workspace  | Purpose                                                                                                                           | Default             |
|:-----------------------------|:-----------|:----------------------------------------------------------------------------------------------------------------------------------|:--------------------|
| `WEBSOCKET_PORT`             | `backend`  | The port on which the Bun WebSocket server will listen.                                                                           | `8080`              |
| `NEXT_PUBLIC_WEBSOCKET_PORT` | `frontend` | The port the client should connect to when running in a local, non-Docker environment. Must match the backend's `WEBSOCKET_PORT`. | `8080`              |
| `NEXT_PUBLIC_WEBSOCKET_URI`  | `frontend` | The full WebSocket URI the client should connect to. This is used in the CI environment to connect to the `backend` service.      | `ws://backend:8080` |