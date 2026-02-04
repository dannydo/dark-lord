---
name: Wings AI Confirm Booking Modal Specification
description: Comprehensive specification for the Wings AI booking confirmation modal, including form fields, data inheritance from booking screen, validation rules, and submission flow with conditional payload logic.
---

# Wings AI Confirm Booking Modal Specification

## Overview

The Confirm Booking Modal is the final step in the booking workflow. It appears after a user selects a time slot from the booking screen, allowing them to review and edit booking details before final submission. This modal inherits data from the booking screen and client history, with selective fields being editable.

## Architecture

### Modal Flow

```
Booking Screen (Time Slot Click)
  ↓
Capture Inherited Data:
  - Store ID (from selected tab)
  - Date + Time (from selected slot)
  - Client Name (from page scrape/history)
  - Client Phone (from page scrape/history)
  - Selected Tech (if any)
  - CS Owner (from history API)
  - Session User (from storage)
  ↓
Show Confirmation Modal
  ↓
User Reviews/Edits:
  ✏️ Client Name
  ✏️ Client Phone
  ✏️ Tech (dropdown)
  ✏️ Booked By (dropdown)
  ✏️ Note
  🔒 Time (read-only)
  🔒 Store (read-only)
  ↓
Click "Confirm NOW"
  ↓
Validate + Submit → /3/booking/create
```

---

## 1. Modal Header

### 1.1 Icon

**Element**: Calendar emoji centered above title

**Display**: 📅

**Size**: Large, prominent

### 1.2 Title

**Text**: "Confirm Booking?"

**Style**: 
- Font size: Large (h3)
- Color: White
- Alignment: Center

**Visual Reference**:

![Confirm Booking Modal](/Users/dannydo/.gemini/antigravity/brain/629689d6-297e-04da-a9c3-41ea255d26ec/uploaded_media_1770107955462.png)

---

## 2. Form Fields

### 2.1 Client Name

**Label**: "Client:"

**Element ID**: `#wings-conf-name`

**Type**: Text input

**Editability**: ✏️ **Editable**

**Required**: ✅ **Yes**

**Data Source**: Inherited from:
1. Page scrape (chat participant name)
2. OR `/3/client/history` response

**Default Value**: Auto-populated from data source

**Validation**: Cannot be empty

**API Mapping**: Sent as `full_name` in booking payload

**Example**: "Ngọc Bảo"

---

### 2.2 Phone Number

**Label**: "Phone:"

**Element ID**: `#wings-conf-phone`

**Type**: Text input

**Editability**: ✏️ **Editable**

**Required**: ✅ **Yes**

**Data Source**: Inherited from:
1. Page scrape (from customer info panel)
2. OR `/3/client/history` request phone

**Default Value**: Auto-populated from data source

**Validation**: 
- Cannot be empty
- Must be valid phone format

**API Mapping**: Sent as `phone` in booking payload

**Example**: "0931009008"

---

### 2.3 Time

**Label**: "Time:"

**Element ID**: `#wings-conf-time`

**Type**: Read-only text display

**Editability**: 🔒 **Read-Only** (cannot change)

**Required**: ✅ **Yes** (always inherited from booking screen)

**Data Source**: Inherited from booking screen:
- `selectedBookingDate` (from date strip)
- `clickedSlotTime` (from time slot grid)

**Display Format**: `"HH:MM (YYYY-MM-DD)"`

**Color**: Gold (`var(--wings-gold)`)

**API Mapping**: Split and sent as:
- `start_time`: `"YYYY-MM-DD HH:MM:00"` (combined format)

**Example Display**: "14:45 (2026-02-13)"

**Example API Value**: `"2026-02-13 14:45:00"`

---

### 2.4 Store

**Label**: "Store:"

**Element ID**: `#wings-conf-store`

**Type**: Read-only text display

**Editability**: 🔒 **Read-Only** (cannot change)

**Required**: ✅ **Yes** (always inherited from booking screen)

**Data Source**: Inherited from `selectedBookingStore` in booking screen

**Display Mapping**:

| Store ID | Display Name |
|----------|--------------|
| `2` | PXL |
| `6` | De Tham |
| `16` | Estella |

**API Mapping**: Sent as `store_id` (integer: 2, 6, or 16)

**Example Display**: "PXL"

**Example API Value**: `2`

---

### 2.5 Tech (Technician)

**Label**: "Tech:"

**Element ID**: `#wings-conf-tech-select`

**Type**: Dropdown select

**Editability**: ✏️ **Editable**

**Required**: ✅ **Yes**

**Data Source**: Populated from `currentStoreTechs` array

**Options**:
1. "Any Technician" (value: `0`)
2. Individual technicians from store/date
   - Format: Tech name (may include emoji, e.g., "Thuỷ Chang 🌸")

**Default Selection**:
- If tech was selected in booking screen → Pre-select that tech
- Otherwise → Default to "Any Technician"

**Visual Reference**: See screenshot showing "Any Technician ▾" dropdown

---

#### Payload Logic (Omission Rules)

> [!IMPORTANT]
> **Refined Logic**: Fields are **OMITTED** (removed from JSON) when the "Any" or "None" options are selected in the modal.

| Modal Selection | Payload Attribute | Behavior |
|:----------------|:------------------|:---------|
| **Any Technician** (id: 0) | `technician_id` | **OMITTED** (Results in **Unassigned** booking) |
| **Specific Tech** | `technician_id` | ✅ Included as integer |
| **Select Staff** (None, id: 0) | `created_by_staff_id` | **OMITTED** (No attribution) |
| **Specific Staff** | `created_by_staff_id` | ✅ Included as integer |

> [!NOTE]
> If a field is omitted and the backend still assigns a default (e.g., attributing to the token owner), this is a backend API behavior. Omission simply removes the client-side attempt to specify a value.

**API Mapping**: 
- Sends `technician_id` (integer)
- **NOT** the tech name from booking screen

**Example Values**:
- "Any Technician" → `technician_id: 0`
- "Khanh Cao" (id: 5) → `technician_id: 5`

---

### 2.6 Booked By (Attribution)

**Label**: "Booked by:"

**Element ID**: `#wings-conf-creator`

**Type**: Dropdown select

**Editability**: ✏️ **Editable**

**Required**: ✅ **Yes**

**Purpose**: Determines which staff member gets commission credit for the booking

---

#### Booked By Options

> [!IMPORTANT]
> **Critical Rules**:
> 1. This dropdown must contain a default **"─ Select Staff ─"** option (value: `0`).
> 2. `created_by_staff_id` is **ONLY SENT** if value is NOT `0` AND Tech is NOT "Any".

**Option 0: None / Select Staff**
- **Display**: "─ Select Staff ─"
- **Value**: `0`
- **Behavior**: Payload field `created_by_staff_id` is removed.

**Option 1: CS Owner (Default)**
- **Display**: CS Owner name (may include emoji, e.g., "Thuỷ Chang 🌸")
- **Value**: CS Owner's user ID (integer)
- **Source**: `lastHistoryData.cs_owner.id` or `window.modalElement.currentCSOwner.id`

**Option 2: "Me" (Session User)**
- **Display**: "Me" or session user name
- **Value**: Session user's ID (integer)
- **Source**: `chrome.storage.sync` → `staffUser_{apiEnv}.id`

**Default Selection**: CS Owner (for consistent commission tracking)

**Override**: User can switch to "Me" if session user is closing the sale instead of CS Owner

**Visual Reference**: See screenshot showing "Thuỷ Chang 🌸 ▾" dropdown

**API Mapping**: Sent as `created_by_staff_id` (integer)

**Example**:
- CS Owner selected → `created_by_staff_id: 42`
- "Me" selected → `created_by_staff_id: 17`

---

### 2.7 Note

**Label**: "Note:"

**Element ID**: `#wings-conf-note`

**Type**: Textarea (multi-line)

**Editability**: ✏️ **Editable**

**Required**: ❌ **No** (optional)

**Default Value**: "Booked by Wings AI"

**Purpose**: Add service nuances, context from conversation, or special requests

**Style**:
- Dark background with subtle border
- Resizable (vertical)
- Min height: 40px

**API Mapping**: Sent as `note` in booking payload

**Example Values**:
- "Booked by Wings AI"
- "Client requested classic style"
- "Follow-up from previous appointment"

---

## 3. Action Buttons

### 3.1 Cancel Button

**Element ID**: `#wings-conf-cancel`

**Text**: "Cancel"

**Class**: `wings-ai-btn-outline`

**Style**: Transparent background with gold border

**Action**: 
```javascript
onclick: () => {
    overlay.style.display = 'none';
    pendingBookingTime = null;
}
```

**Effect**: Closes modal, returns to booking screen, discards form data

---

### 3.2 Confirm NOW Button

**Element ID**: `#wings-conf-submit`

**Text**: "Confirm NOW"

**Class**: `wings-ai-btn-primary`

**Style**: Gold background, prominent

**Action**: 
```javascript
onclick: () => {
    if (pendingBookingTime) submitBooking(pendingBookingTime);
}
```

**Effect**: Validates form, submits booking to API

**Visual States**:
- Default: Clickable, gold background
- Loading: Replaced by "⏳ Booking in progress..."

---

## 4. Data Inheritance & Population

### 4.1 Inheritance Sources

| Field | Source | Type |
|-------|--------|------|
| Client Name | Page scrape OR `/3/client/history` | Editable |
| Phone | Page scrape OR `/3/client/history` | Editable |
| Date | Booking screen `selectedBookingDate` | Read-only |
| Time | Booking screen `clickedSlotTime` | Read-only |
| Store | Booking screen `selectedBookingStore` | Read-only |
| Tech List | Booking screen `currentStoreTechs` | Dropdown population |
| CS Owner | `/3/client/history` → `cs_owner` | Dropdown option |
| Session User | `chrome.storage.sync` | Dropdown option |

### 4.2 Population Flow

```javascript
// When time slot is clicked:
1. Capture booking screen state
   - selectedBookingStore (e.g., "2")
   - selectedBookingDate (e.g., "2026-02-13")
   - clickedSlotTime (e.g., "14:45")
   - currentStoreTechs (array)

2. Get client data
   - From page scrape: name, phone
   - From lastHistoryData: name, phone, cs_owner

3. Get session user
   - From chrome.storage.sync: staffUser_{apiEnv}

4. Populate modal fields
   document.getElementById('wings-conf-name').value = clientName;
   document.getElementById('wings-conf-phone').value = clientPhone;
   document.getElementById('wings-conf-time').textContent = `${time} (${date})`;
   document.getElementById('wings-conf-store').textContent = storeDisplayName;

5. Populate Tech dropdown
   - Add option: "Any Technician" (value: 0)
   - Add techs from currentStoreTechs
   - Default: Selected tech OR "Any Technician"

6. Populate Booked By dropdown
   - Add option: CS Owner name (value: cs_owner.id)
   - Add option: "Me" (value: sessionUser.id)
   - Default: CS Owner

7. Show modal
   overlay.style.display = 'flex';
```

---

## 5. Validation Rules

### 5.1 Required Field Validation

**Checked Fields**:
- ✅ Client Name (must not be empty)
- ✅ Phone (must not be empty)

**Validation Code**:
```javascript
const clientName = document.getElementById('wings-conf-name').value.trim();
const clientPhone = document.getElementById('wings-conf-phone').value.trim();

if (!clientName || !clientPhone) {
    alert("Please enter both Client Name and Phone number");
    return;
}
```

**Auto-Valid Fields** (no check needed):
- Time (always inherited)
- Store (always inherited)
- Tech (dropdown always has selection)
- Booked By (dropdown always has selection)

### 5.2 Tech Selection Validation

> [!IMPORTANT]
> **Special Rule for "Any Technician"**

When `technician_id === 0`:
- ✅ Valid for submission
- ❌ `created_by_staff_id` must be REMOVED from payload

**Implementation**:
```javascript
const techId = parseInt(document.getElementById('wings-conf-tech-select').value);

if (techId === 0) {
    // "Any Technician" selected
    payload.technician_id = 0;
    // DO NOT include created_by_staff_id
} else {
    // Specific tech selected
    payload.technician_id = techId;
    payload.created_by_staff_id = parseInt(document.getElementById('wings-conf-creator').value);
}
```

### 5.3 Booked By Validation

> [!IMPORTANT]
> **Allowed Values Only**

The `created_by_staff_id` must be one of:
1. CS Owner ID (from `lastHistoryData.cs_owner.id`)
2. Session User ID (from storage)

**No other values permitted.**

---

## 6. Submission Flow

### 6.1 Submit Process

```
[User clicks "Confirm NOW"]
  ↓
[Validate required fields]
  ↓ FAIL
[Alert: "Please enter both Client Name and Phone number"]
[Keep modal open]
  ↓ PASS
[Hide action buttons]
[Show loading: "⏳ Booking in progress..."]
  ↓
[Build payload based on tech selection]
  ↓
[POST /3/booking/create]
  ↓ SUCCESS
[Show success feedback]
[Close modal]
[Return to main interface]
  ↓ ERROR
[Show error message]
[Restore action buttons]
[Keep modal open for retry]
```

### 6.2 Payload Construction

> [!IMPORTANT]
> **Conditional Payload Logic**

The payload structure depends on tech selection:

**Case 1: "Any Technician" Selected** (`technician_id === 0`)

```javascript
payload = {
    phone: clientPhone,                    // "0931009008"
    full_name: clientName,                 // "Ngọc Bảo"
    store_id: parseInt(selectedBookingStore), // 2
    start_time: `${selectedBookingDate} ${time}:00`, // "2026-02-13 14:45:00"
    technician_id: 0,
    services: [1],                         // Default: Any - Lashes 2
    note: noteText || "Booked by Wings AI"
    // NO created_by_staff_id field
};
```

**Case 2: Specific Technician Selected** (`technician_id > 0`)

```javascript
payload = {
    phone: clientPhone,
    full_name: clientName,
    store_id: parseInt(selectedBookingStore),
    start_time: `${selectedBookingDate} ${time}:00`,
    technician_id: parseInt(techId),       // e.g., 5
    services: [1],
    note: noteText || "Booked by Wings AI",
    created_by_staff_id: parseInt(bookedByUserId) // CS Owner or Session User
};
```

### Tech Selection Logic
> [!IMPORTANT]
> **Refined Logic**: Fields are **OMITTED** (removed from JSON) when the "Any" or "None" options are selected in the modal.

```javascript
// ... selectors captured ...

const payload = {
    phone: clientPhone,
    full_name: clientName,
    store_id: parseInt(selectedBookingStore) || 2,
    start_time: `${selectedBookingDate} ${time}:00`,
    services: [1], // Corrected: Must be array
    note: noteValue
};

// Any Technician = unassigned (OMIT IT)
if (techId !== 0) {
    payload.technician_id = techId;
}

// Select Staff = No attribution (OMIT IT)
if (bookedByUserId !== 0) {
    payload.created_by_staff_id = bookedByUserId;
}

console.table(payload); // Debug logging
```

### 6.3 API Call

**Endpoint**: `/3/booking/create`

**Method**: POST

**Headers**: Include authentication token

**Request Body**: JSON payload (see above)

**Response Handling**:
- **Success**: Close modal, show confirmation
- **Error**: Display error message, keep modal open

---

## 7. UI States

### 7.1 Default State

- All fields populated with inherited data
- "Confirm NOW" button enabled
- "Cancel" button enabled
- Loading indicator hidden

### 7.2 Loading State

**Triggered**: When "Confirm NOW" is clicked and validation passes

**Changes**:
```javascript
document.getElementById('wings-ai-confirm-actions').style.display = 'none';
document.getElementById('wings-ai-confirm-loading').style.display = 'block';
document.getElementById('wings-ai-confirm-loading').textContent = '⏳ Booking in progress...';
```

**Visual**: 
- Action buttons hidden
- Gold loading text displayed

### 7.3 Error State

**Triggered**: When API call fails or validation fails

**Actions**:
- Show error message (alert or inline)
- Restore action buttons
- Keep modal open for user to retry

---

## 8. Visual Design Tokens

### Colors

| Element | Color | Usage |
|---------|-------|-------|
| Modal Background | Dark (#1a1a2e) | Card background |
| Modal Border | Gold (#FCC33A) | Card outline |
| Icon | Emoji 📅 | Header |
| Title Text | White (#ffffff) | Heading |
| Label Text | Gray (#a0a0a0) | Field labels |
| Read-only Value | Gold (#FCC33A) | Time display |
| Input Background | Dark transparent | Form fields |
| Input Border | Rgba white 10% | Field borders |
| Dropdown Background | Dark transparent | Select fields |
| Primary Button | Gold (#FCC33A) | Confirm NOW |
| Outline Button | Transparent + Gold border | Cancel |
| Loading Text | Gold (#FCC33A) | Progress indicator |

### Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Modal Title | Inter | 18px (h3) | 700 |
| Field Labels | Inter | 11px | 400 |
| Input Text | Inter | 12px | 400 |
| Display Values | Inter | 12px | 600 |
| Button Text | Inter | 13px | 600 |

### Spacing

- **Modal Padding**: 20px
- **Field Gap**: 8-12px between rows
- **Button Gap**: 8px between Cancel and Confirm

---

## 9. Code References

### Key Elements

| Element | ID/Class | Line (content.js) |
|---------|----------|-------------------|
| Modal Container | `#wings-ai-confirm-overlay` | 328 |
| Modal Card | `.wings-ai-confirm-card` | 329 |
| Icon | `.wings-ai-confirm-icon` | 330 |
| Client Name Input | `#wings-conf-name` | 335 |
| Phone Input | `#wings-conf-phone` | 339 |
| Time Display | `#wings-conf-time` | 341 |
| Store Display | `#wings-conf-store` | 342 |
| Tech Dropdown | `#wings-conf-tech-select` | 345 |
| Booked By Dropdown | `#wings-conf-creator` | 349 |
| Note Textarea | `#wings-conf-note` | 353 |
| Cancel Button | `#wings-conf-cancel` | 357 |
| Submit Button | `#wings-conf-submit` | 358 |
| Loading Indicator | `#wings-ai-confirm-loading` | 360 |

### Key Functions

| Function | Location | Purpose |
|----------|----------|---------|
| `submitBooking(time)` | `content.js:993` | Handles form submission |
| Cancel handler | `content.js:972` | Closes modal |
| Submit handler | `content.js:982` | Triggers submitBooking |

### Storage Keys

| Key | Purpose | Example |
|-----|---------|---------|
| `staffUser_{apiEnv}` | Session user data | `{id: 17, name: "John"}` |
| `apiEnv` | Current environment | `"orb"` or `"live"` |

---

## 10. Error Handling

### Validation Errors

**Missing Required Fields**:
```javascript
if (!clientName || !clientPhone) {
    alert("Please enter both Client Name and Phone number");
    // Restore UI
    document.getElementById('wings-ai-confirm-actions').style.display = 'flex';
    document.getElementById('wings-ai-confirm-loading').style.display = 'none';
    return;
}
```

### API Errors

**Connection Failure**:
- Display error message
- Restore action buttons
- Allow user to retry

**Booking Conflict**:
- Display conflict message from API
- Suggest alternative time slots

---

---

## 11. Post-Confirmation Messaging

After a successful booking, the system generates a standardized confirmation message for the staff to send to the customer.

### 11.1 Display Trigger

The messaging UI appears immediately after the `/3/booking/create` API returns a success status. The modal transitions from the "Loading" state to the "Success" state.

### 11.2 Success Feedback UI

**Visual Elements**:
- **Checkmark Icon**: Large green ✅ icon at the top.
- **Success Message**: "Booking confirmed successfully!" text.
- **Preview Textarea**:
    - **Element ID**: `#wings-conf-msg-preview`
    - **Type**: Textarea (Editable)
    - **Style**: Auto-expanding, subtle border, formatted for easy reading.
    - **Function**: Allows staff to tweak the generated text before copying.
- **Action Buttons**:
    - **Copy & Close**: Primary button (`#wings-conf-copy-close`). Copies text to clipboard and closes modal.
    - **Close**: Secondary button to dismiss without copying.

### 11.3 Message Template

The message is generated using the following template:

```text
Dạ đây là lịch hẹn của chị [client_name] 

🗓️ [time] [day_of_week], [date] - Chu kì: [cycle_gap]
📍 D/c: [store_address] - HOTLINE [store_hotline]
[technician_line]

Chị đẹp cố gắng sắp xếp ghé em sớm 5 10 phút để Thiên Thần Wings phục vụ mình tốt hơn nhen! <3
```

### 11.4 Dynamic Placeholder Logic

| Placeholder | Source / Logic | Format Example |
|:------------|:---------------|:---------------|
| `[client_name]` | From `#wings-conf-name` input | "Ngọc Nguyễn" |
| `[time]` | From `#wings-conf-time` (HH:mm format) | "09:30 AM" |
| `[day_of_week]` | Derived from booking date (Vietnamese or English) | "Thứ Năm" or "Thursday" |
| `[date]` | From booking date (DD/MM/YYYY) | "05/02/2026" |
| `[cycle_gap]` | Calculated gap between `last_normal_retain_date` and booking date. | "21 ngày" or "21 days" |
| `[store_address]`| Mapped from `store_id` (see 11.5) | "L5-08, 09 Estella Place..." |
| `[store_hotline]`| Mapped from `store_id` (see 11.5) | "19008154" |
| `[technician_line]`| If `technician_id > 0` then: `👩‍🎨 [Label]: [tech_name]` | 👩‍🎨 Chuyên Viên: Ánh Tuyết |

#### ⚠️ Conditional Logic: New Customers
If the client is a **New Customer** (no `last_normal_retain_date` is available), the system **MUST OMIT** the ` - Chu kì: [cycle_gap]` (or cycle gap equivalents) part of the line entirely.

#### 🌐 Multi-language Support
The Success State UI includes a **language toggle** (`#wings-conf-lang-toggle`) to switch the generated message between **Tiếng Việt** and **English**. The placeholder labels (Cycle, Technician, etc.) and footer text adjust accordingly.

### 11.5 Store Data Mapping

| Store ID | Name | Address | Hotline |
|:---------|:-----|:--------|:--------|
| `2` | PXL | 180 Nguyễn Lương Bằng, Phường Tân Phú, Quận 7 | 19008154 |
| `6` | De Tham | 114 - 116 Đề Thám, Phường Cầu Ông Lãnh, Quận 1 | 19008154 |
| `16` | Estella | L5-08, 09 Estella Place, 88 Song Hành, Quận 2 | 19008154 |

## Summary

This specification documents the final confirmation step in the Wings AI booking workflow. Key features include:

1. **Selective Editability**: Client name, phone, tech, booked-by, and note are editable; time and store are locked from booking screen.
2. **Critical Business Logic**: "Any Technician" selection removes `created_by_staff_id` from payload entirely.
3. **Attribution Control**: Booked By must be CS Owner (for commission) or Session User only.
4. **Post-Confirmation Messaging**: Automated generation of localized customer messages with cycle-gap intelligence.
5. **Success State UI**: Transitions to an editable message preview with one-click "Copy & Close" functionality for staff efficiency.

The modal provides a final checkpoint for booking accuracy while maintaining speed through intelligent data inheritance, sensible defaults, and ready-to-use customer messaging.
