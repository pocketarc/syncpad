# SyncPad: Engineering Onboarding & Technical Overview

## 1. Project Overview

### 1.1. Purpose

SyncPad is a zero-friction, browser-based scratchpad for instant text and file synchronization across devices. It solves the common problem of needing to quickly transfer small pieces of information (code snippets, URLs, temporary files) between machines (e.g., a work laptop and a personal laptop) without the overhead of dedicated apps, cloud storage, or messaging yourself.

### 1.2. Guiding Philosophy

The project is built on three core principles:

1.  **Simplicity:** The user experience should be immediate and intuitive. No accounts, no configuration, no installs. Open a tab and it just works.
2.  **Performance:** The synchronization should feel instantaneous. We use a lightweight, high-performance stack (Bun, WebSockets) to minimize latency.
3.  **Privacy:** Data is ephemeral. It is streamed directly between connected clients via the server and is **never stored at rest**. The server acts as a simple real-time message broker, not a data store.

## 2. System Architecture

SyncPad employs a simple client-server architecture composed of two primary services within a monorepo.

```
+--------------------------------+
|       User (Browser Tab)       |
|  [ Frontend - Next.js App ]    |
|       (localhost:3050)         |
+--------------------------------+
           ^      | (WebSocket)
           |      v
+--------------------------------+
|      Sync Broker (Server)      |
|  [ Backend - Bun WS Server ]   |
|       (localhost:8080)         |
+--------------------------------+
           ^      | (WebSocket)
           |      v
+--------------------------------+
|   Another User (Browser Tab)   |
|  [ Frontend - Next.js App ]    |
|       (localhost:3050)         |
+--------------------------------+
```

-   **Backend (`apps/backend`):** A minimalist WebSocket server built with Bun. Its sole responsibility is to manage WebSocket connections and broadcast messages to clients subscribed to a specific topic.
-   **Frontend (`apps/frontend`):** A Next.js client application that provides the user interface. It establishes a persistent WebSocket connection to the backend to send and receive updates.

## 3. Technology Stack

-   **Runtime & Package Manager:** **Bun** is used across the entire monorepo.
-   **Backend:** **Bun's native WebSocket API**, which is built on uWebSockets for high performance.
-   **Frontend:** **Next.js 15** (with Turbopack) and **React 19**.
-   **Styling:** **Tailwind CSS 4**.
-   **Monorepo Management:** **Turbo** for orchestrating build, development, and linting tasks.
-   **End-to-End Testing:** **Playwright** for comprehensive, multi-browser testing of the application's core synchronization features.

## 4. Project Structure

The codebase is organized into a monorepo under the `apps/` directory.

### 4.1. `apps/backend`

This contains the Bun WebSocket server.
-   `src/index.ts`: The entry point and complete source code for the server. It initializes environment variables and starts the `Bun.serve` instance with WebSocket handlers.

### 4.2. `apps/frontend`

This contains the Next.js client application.

-   `src/app/`: The core application code following the Next.js App Router paradigm.
    -   `layout.tsx`: The root layout, setting up fonts and global styles.
    -   `page.tsx`: The main page component. It's a client component (`"use client"`) that orchestrates the UI and state management.
-   `src/components/`: Reusable, "dumb" React components focused on presentation.
    -   `FileDropZone.tsx`: A wrapper component that handles both drag-and-drop events and click-to-upload functionality.
    -   `ScratchpadInput.tsx`: The main `<textarea>` for text entry.
    -   `StatusBar.tsx`: A simple component to display the WebSocket connection status, including a `data-testid` for testing.
-   `src/hooks/`: Reusable logic encapsulated in custom React hooks.
    -   `useHostname.ts`: A client-side hook to safely get the `window.location.hostname` for constructing the WebSocket URL. This is critical for making the app work on any network without hardcoding `localhost`.
    -   `useScratchpadSocket.ts`: **The most important frontend hook.** It manages the entire WebSocket lifecycle: connection, event listeners (`onopen`, `onmessage`, etc.), state management (`status`, `lastMessage`), and provides a `sendMessage` function.
-   `src/lib/`: Shared utilities and type definitions.
    -   `types.ts`: Defines the TypeScript types for the WebSocket message protocol. **This is the contract between the frontend and backend.**
    -   `downloadFile.ts`: A utility function that takes a file payload and triggers a browser download, which is the mechanism for receiving files.
-   `tests/`: Contains all Playwright end-to-end tests.
    -   `text-sync.spec.ts`: Validates real-time text synchronization between multiple clients.
    -   `file-upload.spec.ts`: Tests file upload functionality via both click/select and drag-and-drop.
    -   `multi-client-sync.spec.ts`: The most critical test suite, ensuring that actions in one client (text or file updates) are correctly reflected in other connected clients.
    -   `mobile-upload.spec.ts`: Tests behavior on mobile viewports.
-   `playwright.config.ts`: The main Playwright configuration, which defines projects for different browsers and includes the crucial `webServer` option to automatically launch the dev environment for testing.

## 5. Core Concepts & Data Flow

### 5.1. WebSocket Message Protocol

All communication between the client and server uses a simple JSON-based message protocol defined in `lib/types.ts`. A message must have a `type` and a `payload`.

-   **Text Message:**
    ```json
    {
      "type": "text",
      "payload": "The content of the textarea..."
    }
    ```
-   **File Message:**
    ```json
    {
      "type": "file",
      "payload": {
        "name": "document.pdf",
        "type": "application/pdf",
        "data": "data:application/pdf;base64,JVBERi0xLjQKJ..."
      }
    }
    ```

### 5.2. Publish-Subscribe (Pub/Sub) Model

The core of the synchronization logic relies on Bun's built-in pub/sub capabilities.

1.  **Subscription:** When a client successfully connects (`websocket.open` handler), it is immediately subscribed to a shared topic.
2.  **Publication:** When the server receives a message from any client (`websocket.message` handler), it simply broadcasts (publishes) that exact message to every client currently subscribed to the topic.

### 5.3. Data Flow: Text Sync

1.  **User Action:** A user types in the `<ScratchpadInput>`.
2.  **React Event & Callback:** The `onChange` event fires `handleTextChange` in `page.tsx`.
3.  **Local State Update:** The callback first calls `setText(newText)` to update the UI of the *current* client instantly for a responsive feel.
4.  **Send Message:** It then creates a `TextMessage` object and calls the `sendMessage` function from the `useScratchpadSocket` hook.
5.  **Server Broadcast:** The backend receives the message and publishes it to the `scratchpadTopic`.
6.  **Remote Client Reception:** All *other* clients receive the message via their `socket.onmessage` handler inside the `useScratchpadSocket` hook.
7.  **Hook State Update:** The hook calls `setLastMessage(message)`.
8.  **Remote UI Update:** The `useEffect` in `page.tsx` on the other clients (which depends on `[lastMessage]`) is triggered. It checks `message.type === 'text'` and calls `setText(message.payload)`, updating their UI to match.

### 5.4. Data Flow: File Sync

1.  **User Action:** A user either drags a file onto the `<FileDropZone>` or clicks it to select a file.
2.  **File Reading:** The `onFileDrop` event in `page.tsx` uses the `FileReader` API to read the file as a **Base64 data URL**.
3.  **Send Message:** Once the `FileReader` completes, its `onload` callback fires, calling `sendMessage` with a `FileMessage` object containing the file's name, MIME type, and base64 data.
4.  **Broadcast:** The backend receives and broadcasts the `FileMessage`.
5.  **Receive Message:** All other clients receive the `FileMessage`. The `useEffect` in `page.tsx` detects the message type.
6.  **Trigger Download:** It calls the `downloadFile` utility, which decodes the base64 data into a `Blob`, creates an invisible `<a>` tag with a `download` attribute, programmatically clicks it, and removes it from the DOM. This securely triggers a native browser download prompt.

## 6. Local Development & Testing

### 6.1. Development

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-org/syncpad.git
    cd syncpad
    ```
2.  **Install Dependencies:** Run from the root of the project.
    ```bash
    bun install
    ```
3.  **Configure Environment:**
    -   In `apps/backend/`, copy `.env.example` to `.env`.
    -   In `apps/frontend/`, copy `.env.example` to `.env`.
4.  **Run the Application:** Use the Turbo `dev` script from the root.
    ```bash
    turbo dev
    ```
    This will concurrently start:
    -   Backend server: `ws://localhost:8080`
    -   Frontend server: `http://localhost:3050`

### 6.2. Testing

The Playwright test suite is configured to automatically launch the necessary `webServer` instances. You do not need to have `turbo dev` running to execute the tests.

-   **Run all tests headlessly (for CI):**
    ```bash
    bun --cwd apps/frontend test
    ```
-   **Run tests with the interactive UI for debugging:**
    ```bash
    bun --cwd apps/frontend test:ui
    ```
-   **Run tests in a visible browser window:**
    ```bash
    bun --cwd apps/frontend test:headed
    ```

### 6.3. Test-Driven Development Guidelines

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

## 7. Configuration (Environment Variables)

| Variable | Workspace | Purpose | Default |
| :--- | :--- | :--- | :--- |
| `WEBSOCKET_PORT` | `backend` | The port on which the Bun WebSocket server will listen. | `8080` |
| `SCRATCHPAD_TOPIC` | `backend` | The internal pub/sub topic name for broadcasting messages. | `shared-scratchpad` |
| `NEXT_PUBLIC_WEBSOCKET_PORT` | `frontend` | The port the client should connect to. Must match the backend's `WEBSOCKET_PORT`. | `8080` |
