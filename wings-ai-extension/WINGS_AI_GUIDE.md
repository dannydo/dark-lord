# 🦢# Wings AI Chrome Extension - Master Guide (v2.9)

> **The Ultimate AI Assistant for High-Volume Lash Support**  
> *Empowering agents with Neural Intelligence, Instant Visuals, and Human-Like Conversation.*

---

## 🌟 What's New in v2.7?

### 1. 📂 Intelligent Gallery & Storage
- **Unlimited Storage**: We've unlocked the browser's storage limit. Upload as many high-res verification photos as you need without hitting the 5MB cap.
- **Smart Drag-to-Add**: Simply drag an image (or a folder!) directly onto the **"Add New Style"** card to instantly upload it.
- **Bulk Folder Upload**: Select an entire Google Drive folder to upload your whole catalog in one go.
- **Edit & Tag**: Rename your custom uploads and add searchable tags (e.g., *"Wispy, Natural"*) right in the UI. Click the **✏️ Pencil Icon** on any custom image.

### 2. 🗣️ Language Force Control
- **Strict Mode (VI/EN/AUTO)**: A new toggle allows you to force the AI to reply strictly in **Vietnamese** or **English**, regardless of the customer's language.
- **Persistence**: The extension remembers your language preference between sessions.

### 3. 🧠 Human-Like Context Engine
- **Anti-Repetition**: The AI now detects if you've already greeted the customer ("Hi", "Chào"). If so, it skips the greeting and jumps straight to the answer to avoid robotic repetition.
- **Natural Flow**: Optimized prompts ensure the AI sounds warm, conversational, and "un-scripted".

---

## 🚀 Core Features

### 🤖 Smart Reply Generation
- **Context Reader**: Scrapes the last 20 messages of the active chat to understand exactly what the client needs.
- **Multi-Tone Blending**: Mix and match tones (e.g., *Fun* + *Short* + *Sympathetic*) for the perfect vibe.
- **Model Selector**: Choose between **Gemini 2.0** (Fast, Creative) and **2.5** (Smart, Precise) depending on complexity.

### 🖼️ Visual Style Gallery
- **Instant Insert**: Click any image in the gallery to paste it directly into the chat box. No manual copy-pasting required.
- **Search & Filter**: Quickly find "Natural", "Volume", or "Classic" styles using the filter pills or search bar.
- **System vs. Custom**: Pre-loaded system styles are properly categorized, while your custom uploads are safely stored locally.

### ⚙️ Workflow Efficiency
- **FAB (Floating Action Button)**: Always accessible overlay on the Pancake/Pages.fm interface.
- **Auto-Paste**: Images and text are inserted directly into the composer.

---

## 🛠️ Technical Specifications

### Architecture
- **Manifest V3**: Secure, performance-oriented extension architecture.
- **Storage**: Uses `chrome.storage.local` with `unlimitedStorage` permission for heavy assets, and `chrome.storage.sync` for lightweight user settings.
- **Security**: API Keys are stored locally and never transmitted to third parties except Google's GenAI endpoint.

### File Structure
- `manifest.json`: Configuration & Permissions.
- `content.js`: UI Injection, DOM Scraping, Gallery Logic, Drag-and-Drop handling.
- `background.js`: Gemini API communication, Prompt Engineering, Context Management.
- `styles.css`: Premium Dark-Mode UI, Glassmorphism effects, Responsive Grid.

---

## 📖 User Manual

### How to Install
1.  Download the `wings-ai-extension` folder.
2.  Go to `chrome://extensions`.
3.  Enable **Developer Mode** (top right).
4.  Click **Load Unpacked** and select the folder.

### How to Use
1.  **Open Chat**: Go to any conversation on Pancake.
2.  **Launch**: Click the floating Wings logo.
3.  **Generate**: Select your styles/tones and click **"AI Suggestion"**.
4.  **Gallery**: Click the Gallery icon (top right) to browse or upload lash styles.
5.  **Upload**: Drag files onto the "+" card or click "Folder" to verify bulk upload.

---

*Verified & Maintained by the Wings Tech Team*
