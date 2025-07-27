<div align="center">
  <h1>SyncPad</h1>
  <p>The zero-friction cross-device clipboard.</p>
  <img src="https://raw.githubusercontent.com/pocketarc/syncpad/main/apps/frontend/public/logo.png" alt="SyncPad Logo" width="200" />
</div>

[![CI](https://github.com/pocketarc/syncpad/actions/workflows/ci.yml/badge.svg)](https://github.com/pocketarc/syncpad/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-AGPLv3-blue.svg)](LICENSE)

A lightweight, browser-based scratchpad that instantly syncs text & files between your devices. Each session gets its own shareable room with a memorable URL. Built with Bun + Next.js.

## 🤔 What does SyncPad solve?

- Needing that one snippet of code from your personal Mac on your work PC.
- Trying to get a URL from your phone to your laptop without emailing yourself.
- Fighting with USB sticks or cloud storage for simple file transfers.
- Using Discord or Slack to send files to yourself.

SyncPad stops all that. It exists only in your browser tab and works instantly across any device on your network. No accounts, no data mining, no third-parties, just a pure utility.

Because god damn, not everything needs to be monetized.

## ✨ Features

- Real-time collaborative editing for text.
- End-to-end encrypted file and text sharing.
- Private, shareable rooms with memorable URLs.
- Zero setup, with no login or configuration required.
- Real-time synchronization of text and files across all connected devices in the same room.
- Complete room isolation - each session is private and separate from others.
- Drag and drop support for file sharing.
- Your data is never stored on any server - everything is handled in-browser.

## 🚀 Quick Start

1. Visit [syncpad.app](https://syncpad.app). (@todo: add link to live demo)
   - Alternatively, you can run it locally (see below).
2. You'll be automatically redirected to a new room with a memorable URL.
3. Share that room URL with others or open it on your other devices.
4. Start typing or drag files - they'll sync instantly across all devices in the room!

![SyncPad Demo](demo.gif) (@todo: add demo gif)

## 🛠 Development

### Prerequisites

- [Bun](https://bun.sh) installed on your machine
- Node.js 20+ (for Next.js)

### Local Setup

```bash
# Clone the repository
git clone https://github.com/pocketarc/syncpad.git
cd syncpad

# Install dependencies
bun install

# Start the project
turbo dev
```

The app will be available at:
- Frontend: `http://localhost:3050`
- WebSocket Server: `ws://localhost:8080`

## 🧪 Testing

This project uses [Playwright](https://playwright.dev/) for comprehensive end-to-end testing, covering multi-client synchronization, file uploads, and mobile interactions.

The test runner is configured to automatically start the frontend and backend servers, so you can run tests directly without needing `turbo dev` running in a separate terminal.

## 🏗 Architecture

SyncPad is built with:
- [Bun](https://bun.sh)
- [Next.js](https://nextjs.org)
- [TailwindCSS](https://tailwindcss.com)

The application uses a room-based pub/sub model where:

1. Each client connects to the WebSocket server and joins a specific room.
2. Updates are broadcast only to clients within the same room.
3. Files are streamed through the WebSocket connection to room participants.
4. Rooms are completely isolated from each other for privacy.

## 📝 Contributing

PRs are welcome! Please open an issue first to discuss what you'd like to change, then open a PR with your changes.

## 📜 License

Distributed under the AGPLv3 License. See [LICENSE](LICENSE) for more information.