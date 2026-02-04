---
name: Wings AI Booking Screen Specification
description: Comprehensive specification for the Wings AI real-time booking interface, including UI components, AI-powered auto-population from conversation context, and interaction flows.
---

# Wings AI Booking Screen Specification

## Overview

The Wings AI Booking Screen is the real-time availability interface that allows customer service consultants to quickly book appointments by viewing live slot availability across stores and technicians. This screen features AI-powered auto-population that extracts booking intent from conversation context.

## Architecture

### Component Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│ HEADER                                                  │
│  ├─ Logo & Branding                                     │
│  └─ Refresh Button                                      │
├─────────────────────────────────────────────────────────┤
│ STORE SELECTOR                                          │
│  └─ 3 Store Tabs (Auto-selectable)                      │
├─────────────────────────────────────────────────────────┤
│ DATE STRIP                                              │
│  └─ 12-day Window (Auto-selectable)                     │
├─────────────────────────────────────────────────────────┤
│ STAFF ON SHIFT                                          │
│  └─ Technician Cards (Auto-selectable)                  │
├─────────────────────────────────────────────────────────┤
│ TIME SLOT GRID                                          │
│  ├─ MORNING (09:00 → 11:45)                             │
│  ├─ AFTERNOON (12:00 → 17:45)                           │
│  └─ EVENING (18:00 → 20:00)                             │
│    └─ Auto-selectable slots                             │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
Main Interface (📅 Click) → AI Extraction → Auto-Population → Booking Screen
                              ↓
                    {store, date, time, tech} → UI Updates
```

---

## 1. Header Section

### 1.1 Logo & Branding

**Element**: Hexagonal logo with wing icon

**Text**:
- Primary: "WINGS AI"
- Subtitle: "VUI VẺ - ÂN CẦN - CHÂN THÀNH - KHOA HỌC"
- View title: "Real-Time Booking"

**Interaction**: Same branding as main interface

### 1.2 Refresh Button

**Element**: Button with 🔄 icon

**Text**: "Refresh"

**Function**: Reloads availability data for current store and date

**API Calls**:
- `/get-slots-v2` - Refresh time slot availability
- `/fetchTechsOnly` - Refresh technician availability
- `/3/technician/appointments` - Refresh appointment indicators (if technician is selected)

---

## 2. Store Selector Tabs

### 2.1 Store Mapping

**Element**: 3 horizontal tabs

**Store Options**:

| Display Name | Store ID | Location |
|--------------|----------|----------|
| PXL | `2` | Phan Xích Long (Phú Nhuận) |
| De Tham | `6` | Đề Thám (Quận 1) |
| Estella | `16` | Estella Place (Quận 2) |

**Visual States**:
- **Active**: Gold background (#FCC33A), dark text
- **Inactive**: Dark background, light text

**Auto-Selection**:
```javascript
if (extractedIntent.storeId) {
    selectedBookingStore = extractedIntent.storeId;
    // Activate corresponding tab
}
```

### 2.2 AI Store Extraction Rules

**From Conversation** → **Mapped to ID**:
- "Phan Xích Long", "PXL", "Phú Nhuận" → `"2"`
- "Đề Thám", "Quận 1", "District 1" → `"6"`
- "Estella Place", "Quận 2", "District 2", "An Phú" → `"16"`

**Fallback**: If no store mentioned, defaults to PXL (`"2"`)

---

## 3. Date Strip

### 3.1 Date Window

**Element**: Horizontal scrolling strip of 28 dates

**Window**: 4 weeks (28 days) starting from today

**Format**:
```
┌──────┐
│ SUN  │  <- Day of week (3 letters, uppercase)
│  8   │  <- Date number
└──────┘
```

**Visual Example**:

![Date Strip Screenshot](/Users/dannydo/.gemini/antigravity/brain/629689d6-297e-40da-a9c3-41ea255d26ec/uploaded_media_1770106226894.png)

**Visual States**:
- **Selected**: Gold background, enlarged
- **Sunday (SUN)**: Always highlighted for visual week separation
- **Today**: Special indicator
- **Future**: Default style

### 3.2 Date Selection

**Interaction**: Click/tap date to select

**Effect**: 
- Updates staff availability
- Updates time slot grid
- Both sections reload via API

### 3.3 Auto-Selection from AI

**AI Extraction Logic**:
```javascript
// In background.js: handleExtractIntent
// Converts relative terms to YYYY-MM-DD
// Today is: ${new Date().toISOString().split('T')[0]}
// "Mai" = Tomorrow
// "Thứ Tư", "Thứ Năm" = Next occurrence
```

**Auto-Population**:
```javascript
if (extractedIntent.date) {
    selectedBookingDate = extractedIntent.date; // "YYYY-MM-DD"
    // Highlight corresponding date in strip
}
```

**Example Conversions**:
- "hôm nay" → Today's date
- "mai" → Tomorrow's date
- "Thứ Tư" → Next Wednesday

---

## 4. Staff on Shift Section

### 4.1 Section Title

**Text**: "STAFF ON SHIFT"

**Color**: Gold text (#FCC33A)

**Purpose**: Shows which technicians are available for selected date/store

### 4.2 Technician Cards

**Element**: Horizontal row of technician cards

**Card Components**:

| Component | Description | Example |
|-----------|-------------|---------|
| Badge | Tech ID number in brackets | `[T3]`, `[T4]`, `[T5]` |
| Name | Technician name | "Hậu Nguyễn", "Khanh Cao" |
| Shift Hours | Working hours for selected date | "09:00 - 20:00" |
| Availability Dot | Online status indicator | 🟢 (green = available) |

**Visual States**:
- **Unselected**: Gray border, dim text
- **Selected**: Gold border, bright text

**Selection Behavior**:
- Click to select a technician
- Once selected, time slot grid automatically **re-fetches** to show only that technician's availability
- Click again to deselect and return to showing aggregate availability for all technicians

**Visual Reference**:

![Staff Cards Screenshot](/Users/dannydo/.gemini/antigravity/brain/629689d6-297e-40da-a9c3-41ea255d26ec/uploaded_media_1770106226894.png)

### 4.3 Off-Day Tags

**Format**: `[Tx]` where x = day number

**Mapping**: English day name → Vietnamese tag

| English Day | Tag | Display |
|-------------|-----|---------|
| Monday | `[T2]` | Shown on card if off |
| Tuesday | `[T3]` | Shown on card if off |
| Wednesday | `[T4]` | Shown on card if off |
| Thursday | `[T5]` | Shown on card if off |
| Friday | `[T6]` | Shown on card if off |
| Saturday | `[T7]` | Shown on card if off |
| Sunday | `[CN]` | Shown on card if off |

**Display**: Tags appear next to or below technician name when they're scheduled off

### 4.4 Auto-Selection from AI

**AI Extraction**:
```javascript
// Extracts tech name from conversation
// Examples: "với Khanh", "bé Giang", "tech Ly"
```

**Matching Logic**:
```javascript
if (extractedIntent.techName) {
    const techName = extractedIntent.techName.toLowerCase();
    // Find matching tech in currentStoreTechs
    const match = techs.find(t => 
        t.name.toLowerCase().includes(techName)
    );
    if (match) {
        // Auto-select matching card
    }
}
```

---

## 5. Time Slot Grid

### 5.1 Grid Structure

**Layout**: Chronological grid organized by shift

**Three Shifts**:

1. **MORNING** `09:00 → 11:45`
   - Time slots: 09:00, 09:15, 09:30, ..., 11:45
   
2. **AFTERNOON** `12:00 → 17:45`
   - Time slots: 12:00, 12:15, 12:30, ..., 17:45
   
3. **EVENING** `18:00 → 20:00`
   - Time slots: 18:00, 18:15, 18:30, ..., 20:00

**Interval**: 15-minute increments

### 5.2 Time Slot Card

**Components**:

| Component | Description | Example |
|-----------|-------------|---------|
| Time | HH:MM format (24h) | "13:00" |
| Availability | Number with + prefix | "+3", "+5" |

**Availability Number Meaning**:
- `+4` = 4 available technicians
- `+2` = 2 available technicians  
- `+0` = No availability (slot disabled)
- `-2` = Negative availability (overbooked by 2)

**Color Coding**:
- **Green** (+3, +4, +5, +6): High availability (multiple techs free)
- **Yellow/Orange** (+1, +2): Low-medium availability
- **Red** (0, -1, -2, etc.): No availability or overbooked

**Technician Filtering**:
- When **no technician is selected**: Numbers show aggregate availability (e.g., "+3" = 3 techs available)
- When **a technician is selected**: Numbers show that specific tech's availability:
  - `+1` = Tech is free
  - `0` = Tech is booked
  - Colors adjust accordingly (Green for `+1`, Red for `0`)

**Visual States**:
- **Available**: Colored border, clickable
- **Selected**: Gold border, highlighted background
- **Overbooked/Unavailable**: Red number, still clickable (consultants can overbook)

**Visual Reference**:

![Time Slot Grid Screenshot](/Users/dannydo/.gemini/antigravity/brain/629689d6-297e-40da-a9c3-41ea255d26ec/uploaded_media_1770106226894.png)

### 5.3 Auto-Selection from AI

**AI Extraction**:
```javascript
// Converts Vietnamese time phrases to HH:MM
// "9h sáng" → "09:00"
// "2h chiều" → "14:00"
// "7h tối" → "19:00"
```

**Auto-Population**:
```javascript
if (extractedIntent.time) {
    const targetTime = extractedIntent.time; // "HH:MM"
    // Find closest available slot
    const slot = findClosestAvailableSlot(targetTime);
    if (slot) {
        // Auto-highlight slot
        // Apply gold border
    }
}
```

**Time Conversion Examples**:
- "9 giờ sáng" → "09:00"
- "1 giờ chiều" → "13:00"
- "6 giờ tối" → "18:00"

---

## 6. AI Auto-Population Flow

### 6.1 Trigger from Main Interface

**User Action**: Clicks 📅 Booking button in main interface

**Location**: Action bar in main interface

**Precondition**: Reply textarea contains conversation text

### 6.2 Intent Extraction Process

```
[📅 Button Click]
  ↓
[Extract text from replyTextarea]
  ↓
[chrome.runtime.sendMessage({
    action: "extractBookingIntent",
    text: conversationText,
    modelChoice: "2.0"
})]
  ↓
[background.js: handleExtractIntent()]
  ↓
[Build AI prompt with mapping rules]
  ↓
[Call Gemini API]
  ↓
[Parse JSON response]
  ↓
[Return {storeId, date, time, techName}]
  ↓
[Switch to booking view]
  ↓
[Auto-populate UI with extracted data]
```

### 6.3 AI Extraction Handler

**Function**: `handleExtractIntent()` in `background.js`

**AI Model**: Gemini 2.0 Flash Experimental

**System Prompt** (Key Rules):
```
# ROLE
You are a Data Extractor AI for Wings Lashes.

# OBJECTIVE
Extract booking details from the provided text and return ONLY a JSON object.

# MAPPING RULES (IMPORTANT - USE THESE IDs ONLY)
- Store: 
    - Phan Xích Long, PXL, Phú Nhuận -> "2"
    - Đề Thám, Quận 1, District 1 -> "6"
    - Estella Place, Quận 2, District 2, An Phú -> "16"

- Date: Convert relative terms to YYYY-MM-DD. 
    - Today is: ${current date}
    - "Mai" = Tomorrow
    - "Thứ Tư", "Thứ Năm", etc. = Next occurrence of that day.

- Time: Convert to "HH:MM" (24h format). Handle "h sáng", "h chiều", "h tối".

- Staff: Extract name if mentioned (e.g. "với Khanh", "bé Giang").

# OUTPUT FORMAT
{
  "storeId": "2" | "6" | "16" | null,
  "date": "YYYY-MM-DD" | null,
  "time": "HH:MM" | null,
  "techName": "string or null"
}
```

**Response Handling**:
```javascript
const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
const intent = JSON.parse(cleaned);
// Returns: {storeId, date, time, techName}
```

**Fallback**: If AI extraction fails, uses regex parsing

### 6.4 Auto-Population Implementation

**Code Location**: `content.js` lines ~735-760

**Store Auto-Population**:
```javascript
if (intent.storeId) {
    selectedBookingStore = intent.storeId;
    // Activate tab (PXL/De Tham/Estella)
}
```

**Date Auto-Population**:
```javascript
if (intent.date) {
    selectedBookingDate = intent.date; // "YYYY-MM-DD"
} else {
    selectedBookingDate = new Date().toISOString().split('T')[0]; // Today
}
// Highlight date in strip
```

**Time Slot Auto-Highlighting**:
```javascript
if (intent.time) {
    // After slots load, find matching time
    // Apply gold border to slot card
}
```

**Technician Auto-Selection**:
```javascript
if (intent.techName) {
    // After techs load, find matching name
    // Apply gold border to tech card
}
```

---

## 7. Interaction Patterns

### Pattern 1: Manual Booking Flow

```
1. User clicks 📅 in main interface
2. Booking view opens (may have AI auto-populated data)
3. User selects/adjusts store tab
4. User selects/adjusts date
5. Staff cards load for selected store/date
6. User selects/adjusts technician (optional)
7. Time slots load for selected parameters
8. User clicks time slot
9. Confirmation modal opens
10. User confirms booking
```

### Pattern 2: AI-Assisted Booking Flow

```
1. User types: "Book chị ở PXL mai 2h chiều với Khanh"
2. AI Suggestion generates reply
3. User clicks 📅 Booking button
4. AI extracts from conversation:
   - Store: "PXL" → "2"
   - Date: "mai" → Tomorrow's date
   - Time: "2h chiều" → "14:00"
   - Tech: "Khanh" → "Khanh Cao"
5. Booking view opens with all data pre-filled:
   - ✅ PXL tab selected
   - ✅ Tomorrow's date highlighted
   - ✅ Khanh Cao card selected
   - ✅ 14:00 slot highlighted (or closest available)
6. User reviews and clicks highlighted slot
7. Confirmation modal opens
8. User confirms booking
```

### Pattern 3: Store Tab Switch

```
1. User clicks different store tab
2. selectedBookingStore updates
3. selectedTechId is cleared (if set)
4. API calls triggered:
   - fetchTechsOnly(newStoreId, selectedDate)
   - loadBookingData() → /booking/slots/available
5. Staff cards refresh
6. Time slot grid refreshes
```

### Pattern 3A: Technician Selection

```
1. User clicks a technician card
2. selectedTechId updates to tech's ID
3. API calls triggered:
   - fetchSlotsOnly(selectedStore, selectedDate, [selectedTechId])
   - /3/technician/appointments (fetch appointments for selected tech)
4. Time slot grid refreshes with filtered data:
   - Slot counts now show that tech's availability only
   - "+1" means tech is free
   - "0" means tech is booked
5. Appointment indicators appear on occupied timeslots:
   - Small dots on slots with existing appointments
   - Show appointment details on hover
6. User can click same tech card to deselect:
   - selectedTechId = null
   - Clear appointment indicators
   - Reload slots without filter (aggregate view)
```

### Pattern 4: Date Selection

```
1. User clicks date in strip
2. selectedBookingDate updates
3. API calls triggered:
   - fetchTechsOnly(selectedStore, newDate)
   - loadBookingData() → /get-slots-v2
4. Staff cards refresh (show who's working that day)
5. Time slot grid refreshes (show availability)
```

### Pattern 5: Refresh Data

```
1. User clicks 🔄 Refresh button
2. Reload current view:
   - fetchTechsOnly(selectedStore, selectedDate)
   - loadBookingData() → /get-slots-v2
3. Staff cards update
4. Time slot grid updates
5. Show loading indicators during refresh
```

---

## 8. Data Sources & APIs

### 8.1 API Endpoints

| Endpoint | Purpose | Parameters | Response |
|----------|---------|------------|----------|
| `/3/booking/slots/available` | Fetch time slot availability | `storeId`, `from`, `to`, `session_token`, `technicianIds` (optional) | Object with dates and slot counts |
| `/3/technician/active` | Fetch technician list | `storeId`, `session_token` | Array of techs with schedules |
| `/3/booking/create` | Create booking | Full booking data | Success/error |

**Technician Filtering**:
- When `technicianIds` parameter is omitted: Returns aggregate availability for all techs at the store
- When `technicianIds=101,102` is passed: Returns availability only for those specific technicians
- Use case: When user selects a technician card, pass their ID to filter slots

### 8.2 Data Storage

**Global State**:
| Variable | Scope | Purpose | Example Value |
|----------|-------|---------|---------------|
| `selectedBookingStore` | Module | Currently selected store | `"2"`, `"6"`, `"16"` |
| `selectedBookingDate` | Module | Currently selected date | `"2026-02-08"` |
| `currentStoreTechs` | Module | Technicians for current store/date | Array of tech objects |

**AI Extracted Intent**:
```javascript
{
    storeId: "2" | "6" | "16" | null,
    date: "YYYY-MM-DD" | null,
    time: "HH:MM" | null,
    techName: "string" | null
}
```

---

## 9. Visual Design Tokens

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Gold | `#FCC33A` | Selected tabs, slots, tech cards |
| Gold Dim | `#9F7928` | Inactive gold elements |
| Dark Background | `#1a1a2e` | Main background |
| Dark Secondary | `#16213e` | Cards, panels |
| Green (High Avail) | `#22c55e` | +4, +5, +6 slots |
| Yellow (Med Avail) | `#eab308` | +2, +3 slots |
| Orange (Low Avail) | `#f97316` | +1 slots |
| Red (Alert) | `#ef4444` | No availability |
| Text Primary | `#ffffff` | Main text |
| Text Dim | `#a0a0a0` | Secondary text |

### Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Section Titles | Inter | 11px | 700 |
| Store Tabs | Inter | 13px | 600 |
| Date Display | Inter | 14px | 600 |
| Tech Names | Inter | 12px | 600 |
| Time Slots | Inter | 13px | 600 |
| Availability Numbers | Inter | 10px | 700 |

---

## 10. Code References

### Key Files

| File | Path | Purpose |
|------|------|---------|
| Content Script | `/wings-ai-extension/content.js` | Booking UI rendering and logic |
| Background Script | `/wings-ai-extension/background.js` | AI extraction and API calls |
| Styles | `/wings-ai-extension/styles.css` | Booking screen styling |

### Key Functions

| Function | Location | Purpose |
|----------|----------|---------|
| `handleExtractIntent()` | `background.js:991` | AI extraction of booking intent |
| `loadBookingData()` | `content.js:~1800` | Loads time slot data |
| `fetchTechsOnly()` | `content.js:~1900` | Loads technician data |
| `switchView('booking')` | `content.js:~640` | Switches to booking view |
| `parseBookingIntent()` | `content.js:~1700` | Regex fallback for intent extraction |

---

## Summary

This specification documents all aspects of the Wings AI booking screen interface, with special emphasis on the AI-powered auto-population feature that extracts booking intent from natural conversation. The system intelligently maps Vietnamese terms to structured data (store IDs, dates, times, technician names) and pre-fills the booking interface, dramatically reducing the number of clicks needed to complete a booking.

The booking screen seamlessly integrates with the main interface through the 📅 button, creating a fluid workflow from conversation to confirmed appointment.
