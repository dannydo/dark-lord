# Wings AI Standalone Dashboard 🦋

This is a standalone version of the Wings AI UI, designed to run in any browser without requiring the Chrome Extension.

## 🚀 Quick Start

1.  Open `index.html` in your browser.
2.  Click the **⚙️ Settings** icon in the header.
3.  Enter your **Gemini API Key**.
4.  (Optional) Enter your **Staff Phone** to login and fetch real customer history/booking slots.
5.  Use the **TEST CONTROLS** on the left to simulate different customer scenarios.

## 🛠 Features

-   **AI Suggestion**: Full reply generation using Gemini 2.0/2.5.
-   **Real-Time Booking**: View available slots and technicians for PXL, De Tham, and Estella stores.
-   **Style Gallery**: Browse lash styles (requires `gallery_data.json`).
-   **Draggable UI**: The interface can be moved around within the dashboard.

## 📂 Project Structure

-   `index.html`: Main entry point.
-   `app.js`: UI logic (ported from `content.js`).
-   `worker.js`: Mocked background service for API proxying and storage (ported from `background.js`).
-   `styles.css`: Premium Wings AI styling.
-   `assets/`: Icons and images.

## 🔒 Notes on Security

-   All settings (API keys, session tokens) are stored in your browser's `localStorage`.
-   API calls are made directly to Google (Gemini) and the Wings Backend.
-   **Important**: This page requires internet access to call the APIs.
