# SyncPad: Engineering Onboarding & Technical Overview

## 1. Project Overview

### 1.1. Purpose

SyncPad is a zero-friction, browser-based scratchpad for instant text and file synchronization across devices. It solves the common problem of needing to quickly transfer small pieces of information (code snippets, URLs, temporary files) between machines (e.g., a work laptop and a personal laptop) without the overhead of dedicated apps, cloud storage, or messaging yourself.

Each SyncPad session is isolated in its own **room** with a unique, shareable URL. When you visit the root URL, you're automatically redirected to a new room with a memorable ID (e.g., `brave-coral-eagle-castle`). You can share this room URL with others to collaborate in real-time.

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

-   **Backend (`apps/backend`):** A minimalist WebSocket server built with Bun. It manages WebSocket connections and broadcasts messages to clients subscribed to room-specific topics. Each room is isolated using separate pub/sub topics.
-   **Frontend (`apps/frontend`):** A Next.js client application that provides the user interface. It establishes a persistent WebSocket connection to the backend using the room ID in the URL path to join the appropriate room.

## 3. Technology Stack

-   **Runtime & Package Manager:** **Bun** is used across the entire monorepo.
-   **Backend:** **Bun's native WebSocket API**, which is built on uWebSockets for high performance.
-   **Frontend:** **Next.js 15** (with Turbopack) and **React 19**.
-   **Styling:** **Tailwind CSS 4**.
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
    -   `useHostname.ts`: A client-side hook to safely get the `window.location.hostname` for constructing the WebSocket URL. This is critical for making the app work on any network without hardcoding `localhost`.
    -   `useScratchpadSocket.ts`: **The most important frontend hook.** It manages the entire WebSocket lifecycle: connection, event listeners (`onopen`, `onmessage`, etc.), state management (`status`, `lastMessage`), and provides a `sendMessage` function.
    -   `useDarkMode.ts`: Manages the dark mode state and persists the user's preference in `localStorage`.
-   `src/lib/`: Shared utilities and type definitions.
    -   `types.ts`: Defines the TypeScript types for the WebSocket message protocol. **This is the contract between the frontend and backend.**
    -   `downloadFile.ts`: A utility function that takes a file payload and triggers a browser download, which is the mechanism for receiving files.
    -   `roomId.ts`: Utilities for generating and validating memorable room IDs using word combinations (e.g., "brave-coral-eagle-castle").
-   `tests/`: Contains all Playwright end-to-end tests.
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
-   `playwright.video.config.ts`: A separate Playwright configuration for recording video of test runs.

### 4.3. `apps/playwright`
-   `Dockerfile`: A dedicated Dockerfile for running Playwright tests in a containerized CI environment.

### 4.4. Root Configuration
-   `docker-compose.yml`: Defines the services for local development.
-   `docker-compose.ci.yml`: Defines the services for running in a CI environment.

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

### 5.2. Room System & Routing

SyncPad uses a room-based architecture to isolate different sessions:

1.  **Room ID Generation:** Memorable room IDs are generated using 4 random words (adjective-color-animal-noun format) like `brave-coral-eagle-castle`.
2.  **URL Structure:** Each room has its own URL, using a query parameter: `/room?id={room-id}`. Visiting the root `/` automatically redirects to a new room.
3.  **Room Validation:** The backend validates room IDs to ensure they follow the correct 4-word format before allowing WebSocket connections.
4.  **WebSocket Connection:** The frontend client extracts the `roomId` from the URL query parameter. It then connects to `ws://host:port/{room-id}`, and the backend extracts the room ID from the WebSocket URL path to place the client in the correct room.

### 5.3. Publish-Subscribe (Pub/Sub) Model

The core of the synchronization logic relies on Bun's built-in pub/sub capabilities with room isolation:

1.  **Room-Specific Subscription:** When a client connects, it subscribes to a room-specific topic (`room:{room-id}`).
2.  **Room-Isolated Broadcasting:** Messages are only broadcast to clients within the same room, ensuring complete isolation between different sessions.

### 5.4. Data Flow: Text Sync

1.  **User Action:** A user types in the `<ScratchpadInput>`.
2.  **React Event & Callback:** The `onChange` event fires `handleTextChange` in `room/page.tsx`.
3.  **Local State Update:** The callback first calls `setText(newText)` to update the UI of the *current* client instantly for a responsive feel.
4.  **Send Message:** It then creates a `TextMessage` object and calls the `sendMessage` function from the `useScratchpadSocket` hook.
5.  **Server Broadcast:** The backend receives the message and publishes it to the room-specific topic (`room:{room-id}`).
6.  **Remote Client Reception:** All *other* clients in the same room receive the message via their `socket.onmessage` handler inside the `useScratchpadSocket` hook.
7.  **Hook State Update:** The hook calls `setLastMessage(message)`.
8.  **Remote UI Update:** The `useEffect` in `room/page.tsx` on the other clients (which depends on `[lastMessage]`) is triggered. It checks `message.type === 'text'` and calls `setText(message.payload)`, updating their UI to match.

### 5.5. Data Flow: File Sync

1.  **User Action:** A user either drags a file onto the `<FileDropZone>` or clicks it to select a file.
2.  **File Reading:** The `onFileDrop` event in `room/page.tsx` uses the `FileReader` API to read the file as a **Base64 data URL**.
3.  **Send Message:** Once the `FileReader` completes, its `onload` callback fires, calling `sendMessage` with a `FileMessage` object containing the file's name, MIME type, and base64 data.
4.  **Broadcast:** The backend receives and broadcasts the `FileMessage` to all clients in the room.
5.  **Receive Message:** All other clients in the same room receive the `FileMessage`. The `useEffect` in `room/page.tsx` detects the message type.
6.  **Trigger Download:** It calls the `downloadFile` utility, which decodes the base64 data into a `Blob`, creates an invisible `<a>` tag with a `download` attribute, programmatically clicks it, and removes it from the DOM. This securely triggers a native browser download prompt.

### 5.6. Room Usage

***For Users:**
- Visit the root URL (`/`) to automatically create a new room
- Share the room URL (e.g., `/room?id=brave-coral-eagle-castle`) with others to collaborate
- Use the "📋 Share Room" button to copy the room URL to clipboard
- Each room is completely isolated - messages and files only sync within the same room

**For Developers/Testing:**
- Use fixed room IDs in tests (e.g., `/room?id=test-blue-cat-moon`) to ensure clients connect to the same room
- All existing functionality works the same, just scoped to the specific room
- Room IDs must follow the 4-word format: `word-word-word-word`

## 6. Local Development & Testing

### 6.1. Testing

The Playwright test suite is configured to automatically launch the necessary `webServer` instances. You do not need to have `turbo dev` running to execute the tests.

-   **Run all tests headlessly:**
    ```bash
    bun --cwd apps/frontend test
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

## 7. Configuration (Environment Variables)

| Variable | Workspace | Purpose | Default |
| :--- | :--- | :--- | :--- |
| `WEBSOCKET_PORT` | `backend` | The port on which the Bun WebSocket server will listen. | `8080` |
| `NEXT_PUBLIC_WEBSOCKET_PORT` | `frontend` | The port the client should connect to. Must match the backend's `WEBSOCKET_PORT`. | `8080` |
