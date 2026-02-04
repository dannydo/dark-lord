---
name: Wings AI Booking UI Specification
description: Comprehensive design and logic protocols for the Real-Time Booking interface, including store mapping, staff status, and slot segmentation.
---

# 📅 Wings AI Booking UI: Full Specification

This document details the visual structure, data mapping, and interaction logic for the **Real-Time Booking** screen within the Wings AI extension. This interface allows Sales Consultants to view live availability across stores and technicians to close sales efficiently.

---

## 🎨 1. Visual Hierarchy & Design System

The UI follows a strict "Dark Mode Premium" aesthetic designed to overlay professional CRM dashboards without visual clashing.

### A. Layout Structure
*   **Header**: Contains the "Real-Time Booking" title and a global **🔄 Refresh** button. Also displays active Client Name, Phone, Diamond Count, and **CS Owner**.
*   **Store Selector**: Horizontal pills/tabs for switching between Store IDs (`PXL`, `De Tham`, `Estella`).
*   **Date Strip**: A horizontal scrolling row of 12 dates starting from Today. Current selected date is highlighted with a gold border or background.
*   **Staff on Shift**: A dedicated section showing technician availability for the selected date and store.
*   **Time Slot Grid**: Categorized chronological grid of available appointments.

---

## 🛠️ 2. Data Mapping & Store Logic

### A. Store Identifiers
The extension maps UI tabs to internal ID integers:
*   **PXL** (Phan Xích Long) ➔ `2`
*   **De Tham** (Đề Thám) ➔ `6`
*   **Estella** (Estella Place) ➔ `16`

### B. Date Management
*   **Window**: The date strip always shows Today + 11 upcoming days.
*   **Format**: Upper-case 3-letter day (e.g., `TUE`) over the numeric date (e.g., `3`).

---

## 👥 3. Staff on Shift Logic

Technician cards are dynamically rendered based on the `fetchTechsOnly` API response.

### A. Off-Day Mapping (`[Tx]` Tags)
The system maps English day names from the backend to Vietnamese shorthand tags:
*   `Monday` ➔ `[T2]`, `Tuesday` ➔ `[T3]`, `Wednesday` ➔ `[T4]`, etc.

### B. Card Components
*   **Selection Logic**: Tapping a card highlights it. This selection acts as a filter but is **non-binding** until the final confirmation, where it can be overridden.
*   **Data Persistence**: The full list of fetched technicians is stored in a `currentStoreTechs` pool to populate later dropdowns.

---

## ⏰ 4. Time Slot Segmentation

Time slots are retrieved from `/get-slots-v2` and automatically grouped into three shifts (Morning, Afternoon, Evening).

---

## 🔄 5. Interaction & Trigger Architecture

### A. Tapping a Time Slot (The "Action" Trigger)
*   **Selection State**: Freezes current `Store`, `Date`, and `Time`.
*   **Overlay Launch**: Immediately launches the **Final Confirmation Modal**. At this instant, the extension captures:
    1.  **Client Identity**: Scraped Name/Phone from the active chat.
    2.  **Attribution Identity**: The `persistentSessionUser` (logged-in staff) and `currentCSOwner` (assigned staff).

---

## ✅ 6. Final Confirmation Modal Protocol (Dynamic View)

The Confirmation Modal has evolved from a static summary to a dynamic editing suite.

### A. Smart Fields & Overrides
*   **Tech (Dropdown)**: 
    *   **Logic**: No longer static. It is a selection dropdown.
    *   **Defaulting**: If a technician was selected in the grid, they are selected here. If not, it defaults to **"Any Technician"** (`id: 0`).
    *   **Function**: Allows the Sales Consultant to override the technician choice at the very last second based on customer preference without exiting the modal.
*   **Booked by (Dropdown)**:
    *   **Logic**: Implements a two-option attribution system.
    *   **Defaulting**: Automatically selects the **CS Owner** (retrieved from the client's history) to ensure consistent commission tracking.
    *   **Override**: Allows switching to **"Me"** (the current Session User) if the CS Owner is not the one closing the sale.
*   **Note**: Large-format textarea for adding service nuances or "AI Suggestion" history context.

---

## 🧬 7. Dynamic Data Flow & State Management

The extension maintains a 3-layer data flow to ensure accuracy across screens:

| Data Layer | Source Component | Lifecycle | Usage |
| :--- | :--- | :--- | :--- |
| **Authentication State** | `background.js` | Persistent (Session) | populates `currentSessionUser` for booking attribution. |
| **Client Context** | `content.js` (Scraping) | Volatile (Per Chat) | populates the header info and confirmation name/phone. |
| **API Enrichment** | `fetchClientData` | Volatile (Per Request) | injects the **CS Owner** and **Diamond Balance** into the UI state. |
| **Store Inventory** | `fetchTechsOnly` | Transient (Per Store) | populates both the **Staff Cards** and the **Tech Dropdown** in the final modal. |

---

## 🚨 8. Rules of Engagement

1.  **Overbooking is Mandatory**: Never disable a slot card based on availability count.
2.  **No Duplicate Attribution**: If a staff member is both the `CS Owner` and the `Session User`, the "Booked by" dropdown must deduplicate them into a single entry.
3.  **UI Resilience**: The modal must operate within a `z-index: 2147483647` context to prevent obstruction by Pancake's floating notification system.
