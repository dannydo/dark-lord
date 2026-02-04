---
name: Wings AI Extension
description: Comprehensive intelligence protocols, data flow, and architecture for the Wings Lashes AI browser extension.
---

# 🦅 Wings AI Extension: Full Specification

This document provides a deep-dive into the architecture, intelligence logic, and UI standards of the Wings AI Extension (v3.6+). It serves as the master reference for developers and AI agents maintaining the project.

---

## 🏗️ 1. Technical Architecture & Lifecycle

The extension is a Chrome V3 Manifest application designed to overlay the Pancake/Messenger CRM.

### A. Modal Lifecycle (`content.js`)
*   **Injection Strategy**: Injected directly into the host page DOM. Uses a containment wrapper with `z-index: 2147483647`.
*   **Singleton Pattern**: Every launch triggers `document.querySelectorAll('.wings-ai-suggestion-box').forEach(el => el.remove())` to ensure only one instance exists.
*   **Draggable Interface**: The header implements a custom drag listener (`makeDraggable`) that updates `top` and `left` coordinates, allowing users to move the modal across their workspace.
*   **Isolated Views**: Uses a "Single Page App" approach within the modal. Views (`main`, `gallery`, `booking`, `upload`) are toggled via `display: none|flex`.

### B. Background Intelligence Hub (`background.js`)
*   **Model Routing**:
    *   **Gemini 2.0 Flash**: Default for speed and efficiency.
    *   **Gemini 2.5 Flash**: Strategy-based fallback for higher reasoning.
    *   **Retry Logic**: Implements an "Attempt Loop" across multiple model versions (v1beta, v1) if the primary model choice fails.
*   **Data Proxying**: All external API calls (`/3/client/history`, `/get-slots-v2`, `create-booking`) are routed through the background script to bypass CORS and inject the `session_token` securely from `chrome.storage.sync`.

---

## 🧠 2. AI Intelligence Engine (`handleGenerateReply`)

The core value of the extension is its high-context AI generation.

### A. Context Construction
Before calling Gemini, the background script aggregates:
1.  **Chat History**: Scraped live from the Pancake DOM.
2.  **Client identity**: UID, Name, Phone.
3.  **Financial Metrics**: Diamond balance (Loyalty), Total Spending (VIP Status).
4.  **Notes**: Critical alerts (Danger/Warning) and pinned profile notes.
5.  **Behavioral Data**: Favorite Technician (derived from most frequent visits), Recent Styles, and First Visit date.
6.  **Real-Time Availability**: Current technician status and next 48 hours of available slots.

### B. System Instruction Set (The Persona)
*   **Role**: High-End Sales Consultant for Wings Lashes (Nối Mi Bóng Tối).
*   **Tone**: "Bén" (Sharp), cheeky, caring, and funny.
*   **GREETING Rules**: "The 5-Second Laugh Rule"—must try to make the client smile in the first sentence.
*   **Anti-Repetition**: If a greeting was sent in the last 2-3 messages, the AI is instructed to skip "Chào/Hi" and dive directly into the solution.
*   **Proactive Sales**: If the client mentions "booking" or "coming", the AI MUST suggest specific times (e.g., "9:00 or 10:15 tomorrow at PXL").

---

## 📊 3. Data Flow & Field Mapping

### A. Client History API (`/3/client/history`)
The extension maps the following from the unified backend:
*   **`active_combos_raw`**: Array of active service packages.
*   **`diamond_balance`**: Displayed as a blue diamond icon 💎 in the header.
*   **`profile_notes`**: Pinned or high-priority notes are highlighted at the top of the AI context.
*   **`history_list`**: Used to calculate:
    *   **Top Technician**: The staff name with the highest count in the last 5-10 visits.
    *   **Style Preference**: Extracted from `design` and `color` fields of recent orders.

### B. UI Badge Logic (Combo Tracking)
A specialized parser renders symbols in the client info header:
*   **Symbol Ⓤ**: Triggers if `combo_name` contains "under" (Case-insensitive).
*   **Symbol Ⓣ**: Default for Top Lashes (Classic, Volume, etc.).
*   **Count Format**: `NewSet|Refill` (e.g., `1|2`) derived from `count_new` and `count_refill`.
*   **Legacy Fallback**: If raw data is missing, a Regex parser scrapes the human-readable string: `/(.*?) \((\d+) sessions left\)/`.

---

## 🎨 4. Design System & UI Components

### A. Visual Identity
*   **Typography**: Inter or System San-serif.
*   **Color Palette**:
    *   `--wings-gold`: `#fcc33a` (Primary Action)
    *   `--wings-gold-dim`: `rgba(252, 195, 58, 0.4)` (Secondary/Borders)
    *   `--wings-bg`: `#101014` (Deep Charcoal)
    *   `--wings-border`: `rgba(255, 255, 255, 0.1)`
*   **Glassmorphism**: Headers and buttons use `backdrop-filter: blur(12px)`.

### B. Button Groups (Quick Actions)
1.  **AI Power**: `✨ Refine` (Add social proof/elite positioning).
2.  **Style Tweaks**: `✂️ Shorter`, `📱 Mobile Format`.
3.  **Sales Goals**: `📅 Booking`, `📞 Phone Request`, `💎 Referrals`.
4.  **Final Actions**: `⚠️ Report` (AI correction), `Insert` (To CRM).

---

## 🛠️ 5. Deployment & Release Protocol

### A. Environment Management
*   **`orb`**: Local/Dev environment (defaults to `http://api.orb`).
*   **`live`**: Production environment (defaults to `https://api.wingslashes.com`).
*   Toggle via settings; all session tokens are environment-prefix stored (e.g., `staffUser_live`).

### B. Bundling
*   Version must be bumped in `manifest.json`.
*   Excluded from ZIP: `.git`, `DS_Store`, `.agent`, `.vscode`.
*   Command: `zip -r wings-ai-extension-vX.X.zip wings-ai-extension -x "*.git*" -x "*.DS_Store*"`

### C. Troubleshooting (The "Three-RS" Rule)
1.  **Reload**: Reload the extension in `chrome://extensions`.
2.  **Refresh**: Refresh the Pancake browser tab.
3.  **Relog**: Re-log into the Wings API if 401 errors appear in the background console.

---
