# Wings Lashes AI Copilot v2.8

The **Wings Lashes AI Copilot** is a high-performance Chrome Extension (Manifest V3) designed to revolutionize customer support on the Pancake, Pages.fm, and Facebook Business platforms. It leverages the **Google Gemini API** (Flash and Pro models) to generate context-aware, personalized, and style-consistent replies.

## 🚀 Key Features

- **Neural Context Scraping**: Automatically extracts the last 20 messages from the active chat, identifying client names and distinguishing between staff and consumer messages.
- **Dynamic Action Button (FAB)**: A sleek, floating interface injected directly into the Pancake UI for instant access without tab-switching.
- **Pro-Multi-Tone Selection**: Integrated checkboxes allow agents to blend multiple tones (e.g., *Cheerful* + *Witty* + *Short*) to match the customer's mood.
- **"My Style" Persistence**: Saves agent preferences (e.g., "always use emojis", "be concise") via `chrome.storage.sync`.
- **Intelligent Model Fallback**: Optimized `background.js` logic that prioritizes **Gemini 2.0 Flash** for speed, falling back to **2.5 Pro** or **1.5 Flash** if the primary model is unavailable.
- **One-Click Integration**: "Insert" functionality injects the AI reply directly into the Pancake composer, bypassing the need for manual copy-pasting.
- **Visual Asset Gallery & Management**: Integrated photo library for rapid deployment of lash style examples (e.g., UltraLight, Kim K Classic). Agents can manage, tag, and instantly send visual references to clients within the chat flow.

## 🏗️ Technical Architecture

### 1. Manifest (`manifest.json`)
- **MV3 Compliant**: Uses Service Workers for background persistence.
- **Broad Domain Access**: Configured for `pancake.biz`, `pancake.vn`, and `pages.fm`.
- **Permissions**: Requires `storage` (for settings/style) and `scripting` for UI injection.

### 2. Content Injection (`content.js`)
- **DOM Observer**: Identifies chat bubbles using color-matching, alignment detection, and class-based scraping.
- **UI System**: Injects a draggable FAB and a glassmorphic suggestion modal into the host page.
- **History Engine**: Generates a sanitized conversation log for the AI, ensuring historical consistency.
- **Asset Bridge**: A dedicated UI layer within the suggestion modal for browsing and selecting high-resolution service photos, specifically optimized for when clients ask: *"gửi hình chị xem nào"* (show me some photos).

### 3. Background Bridge (`background.js`)
- **Prompt Engineering**: Uses structured "Rules of Engagement" to prevent repetitive questioning (e.g., checking if customer preferences were already mentioned).
- **API Orchestration**: Handles secure requests to `generativelanguage.googleapis.com`.
- **Error Handling**: Provides real-time debug information and robust retry strategies across Gemini models.

### 4. Setup & Configuration (`popup.html`)
- **API Management**: Secure entry for Gemini API keys.
- **Business Context**: Allows global branding rules (e.g., "We specialize in natural-looking 3D lashes") to be baked into every response.

## 🛠️ Usage for Developers

1. **Load Unpacked**: Go to `chrome://extensions`, enable **Developer mode**, and select the `wings-ai-extension` folder.
2. **Setup**: Click the extension icon to set your **Gemini API Key** and **Business Context**.
3. **Analyze**: Open a Pancake chat and click the Wings FAB to initiate a deep-neural analysis of the customer's needs.

---
## 🖼️ UI Preview

The AI Copilot in action, analyzing chat history and suggesting style-consistent replies while preparing visual assets for client review.

![Wings AI Copilot Interface](file:///Users/dannydo/.gemini/antigravity/brain/56e50645-640f-4234-97f7-6fd7eb82a1c9/uploaded_media_1769686775519.png)

---
**Status**: STABLE (v2.5) | **Engine**: Google Gemini Neural Network
