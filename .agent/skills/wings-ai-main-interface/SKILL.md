---
name: Wings AI Main Interface Specification
description: Comprehensive design and functionality protocols for the Wings AI main interface, including all dynamic components, data bindings, and user interactions.
---

# Wings AI Main Interface Specification

## Overview

The Wings AI Main Interface is the primary interaction screen for customer service consultants using the Wings Lashes AI Chrome extension. This document specifies all UI components, dynamic data flows, and interaction patterns.

## Architecture

### Component Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│ HEADER                                                  │
│  ├─ Logo & Branding                                     │
│  ├─ Client Info (Dynamic)                               │
│  ├─ Diamond Balance (Dynamic)                           │
│  ├─ CS Owner Badge (Dynamic)                            │
│  ├─ Model Selector                                      │
│  └─ Environment Toggle                                  │
├─────────────────────────────────────────────────────────┤
│ CONTROL PANEL                                           │
│  ├─ AI Suggestion Button                                │
│  ├─ Tone Selectors (4 radios)                           │
│  └─ Active Tones Counter (Dynamic)                      │
├─────────────────────────────────────────────────────────┤
│ ACTION BAR                                              │
│  └─ 9 Action Buttons (some visibility dynamic)          │
├─────────────────────────────────────────────────────────┤
│ RESPONSE AREA                                           │
│  └─ AI Reply Textarea (Dynamic)                         │
├─────────────────────────────────────────────────────────┤
│ SETTINGS PANEL                                          │
│  ├─ History Preview Toggle                              │
│  └─ MY STYLE Input                                      │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action → Content Script → Background Script → API
                    ↑                                  ↓
                    └────────── Response ──────────────┘
                                   ↓
                         UI Updates (Dynamic)
```

---

## 1. Header Section

### 1.1 Logo & Branding

**Element**: Hexagonal logo with wing icon
**Text**: 
- Primary: "WINGS AI"
- Subtitle: "VUI VẺ - ẤN CẦN - CHÂN THÀNH - KHOA HỌC"

**Interaction**: Clicking logo resets view to main (from booking/gallery)

### 1.2 Client Information Display

**Dynamic Data Source**: `historyData` from `/3/client/history` API

**Components**:

| Element | Data Source | Example | Notes |
|---------|------------|---------|-------|
| Client Name | `window.modalElement.lastHistoryData.phone` or scraped from page | "Loan Tran 0938893587" | Displayed prominently in header |
| Phone Number | Scraped from page | "0938893587" | Part of client display |

**Visibility**: Always shown when client is identified

### 1.3 Diamond Balance

**Element**: 💎 icon + numeric count

**Dynamic Data Source**: 
```javascript
historyData.diamond_balance
```

**Example Display**: 
```
💎 100
```

**Color**: Gold (#FCC33A) for icon, white for number

**Update Trigger**: After `generateReply` response received

**Fallback**: If `diamond_balance` is `undefined`, displays `0`

### 1.4 CS Owner Badge

**Element**: CS owner name badge with "CS OWNER" label

**Dynamic Data Source**:
```javascript
historyData.cs_owner.name
```

**Visual Examples**:

![CS Owner Example 1](/Users/dannydo/.gemini/antigravity/brain/629689d6-297e-40da-a9c3-41ea255d26ec/uploaded_media_0_1770104024064.png)

![CS Owner Example 2](/Users/dannydo/.gemini/antigravity/brain/629689d6-297e-40da-a9c3-41ea255d26ec/uploaded_media_1_1770104024064.png)

**Display Format**:
- CS owner name (may include emoji decoration like 🌸)
- "CS OWNER" label below name
- Gold/yellow text color for name
- Gray text for label

**API Flow**:
1. `generateReply` calls `/3/client/history`
2. Receives `user_id` from response
3. Calls `/3/cs/get-owner` with `user_id`
4. Returns `{status: 'success', cs_id, cs_name}`
5. Stored in `historyData.cs_owner = {id, name}`

**Visibility**: Only shown if CS owner exists

**Fallback**: If no CS owner, element is hidden

### 1.5 Combo Badges

**Element**: Circular badges displaying active combo session counts

**Dynamic Data Source**:
```javascript
historyData.active_combos_raw
```

**Format**: `[T/U] [new_count]|[refill_count]`

**Badge Components**:
- **Letter**: Lash type indicator
  - `T` = Top lashes (Upper lashes)
  - `U` = Under lashes (Bottom lashes)
- **First Number**: Remaining "Nối" (new/full set) sessions
- **Second Number**: Remaining "Dặm" (refill) sessions

**Visual Examples**:

![Combo Badge Example 1](/Users/dannydo/.gemini/antigravity/brain/629689d6-297e-40da-a9c3-41ea255d26ec/uploaded_media_0_1770103775822.png)

![Combo Badge Example 2](/Users/dannydo/.gemini/antigravity/brain/629689d6-297e-40da-a9c3-41ea255d26ec/uploaded_media_1_1770103775822.png)

**Badge Examples**:
| Badge Display | Meaning |
|--------------|---------|
| `T 1\|4` | Top lashes: 1 Nối session, 4 Dặm sessions |
| `T 0\|1` | Top lashes: 0 Nối sessions, 1 Dặm session |
| `U 10\|0` | Under lashes: 10 Nối sessions, 0 Dặm sessions |
| `T 7\|13` | Top lashes: 7 Nối sessions, 13 Dặm sessions |

**Visibility**: Only displayed when client has active combos (`active_combos_raw.length > 0`)

**Rendering**: Badges are rendered dynamically next to client name in header

**Data Structure**:
```javascript
historyData.active_combos_raw = [
  {
    combo_name: "New Ultralight 550",
    count_new: 3,      // Nối sessions
    count_refill: 5,   // Dặm sessions
    lash_type: "T"     // T or U
  }
]
```

**Color Scheme**:
- Background: Dark with subtle border
- Text: White
- Border: Gold accent when active

### 1.6 Model Selector

**Element**: Dropdown menu

**Options**:
- `v2.0` (Gemini 2.0 Flash)
- `v2.5` (Gemini 2.5 Flash)

**Storage Key**: `lastModelChoice`

**Default**: v2.0

**Interaction**: Change triggers save to `chrome.storage.sync`

### 1.7 Environment Toggle

**Element**: Icon button (🌐)

**States**:
- **Orb**: Green indicator dot
- **Live**: Red indicator dot

**Storage Key**: `apiEnv`

**Default**: `orb`

**Impact**: Changes API base URL
- Orb: `http://api.orb`
- Live: `https://api.wingslashes.com`

---

## 2. Control Panel

### 2.1 AI Suggestion Button

**Element**: Large golden button

**Text**: "AI Suggestion"

**Function**: Triggers `onGenerateClick()`

**Interaction Flow**:
```
[Click "AI Suggestion"]
  ↓
[Scrape client name, phone, chat history]
  ↓
[Gather selected tones, MY STYLE, language]
  ↓
[chrome.runtime.sendMessage({
    action: "generateReply",
    clientName: "...",
    clientPhone: "...",
    history: "...",
    tones: [...],
    userStyle: "...",
    modelChoice: "2.0",
    apiEnv: "orb"
})]
  ↓
[background.js: handleGenerateReply()]
  ↓
[Fetch /3/client/history]
  ↓
[Enrich context with history data]
  ↓
[Call Gemini API]
  ↓
[Return {reply, historyData}]
  ↓
[Update UI:
  - replyTextarea.value = reply
  - window.modalElement.lastHistoryData = historyData
  - Update diamond display
  - Show/hide combo button
  - Render combo badges
]
```

**Loading State**: Button text changes to "⏳ Generating..."

**Disabled State**: During API call

### 2.2 Tone Selectors

**Element**: 4 radio buttons in horizontal layout

**Options**:
| Tone | Value | Vietnamese |
|------|-------|-----------|
| Cheerful | `vui` | Vui |
| Sad | `buon` | Buồn |
| Respectful/Measured | `tuc_thanh` | Đố/Nói tục giảng thanh |
| Empathetic | `dong_cam` | Động cảm |

**Visual States**:
- **Active**: Gold ring border, filled center
- **Inactive**: Gray border, empty center

**Multi-Select**: User can select multiple tones

**Storage**: Selected tones passed to AI as comma-separated string

**Example**: `"vui, dong_cam"` → "Cheerful, Empathetic"

### 2.3 Quick Filters

**Element**: Checkbox

**Label**: "Ngắn" (Short)

**Function**: Instructs AI to generate concise replies

**Storage**: Not persisted, applies to current generation only

### 2.4 Active Tones Counter

**Element**: Text label with counter

**Dynamic Calculation**:
```javascript
const count = Array.from(toneCheckboxes).filter(cb => cb.checked).length;
```

**Display Format**: `"+ 2 tones active"`

**Color**: Gold (#FCC33A)

**Visibility**: Always shown, updates in real-time as tones selected

### 2.5 Active Combos Indicator

**Element**: Text label with counter

**Dynamic Data Source**:
```javascript
historyData.active_combos_raw.length
```

**Display Format**: `"+ 2 tones active"` (shows combo count)

**Visibility**: Only shown when `active_combos_raw.length > 0`

**Update Trigger**: After history data is received

---

## 3. Action Bar

### Overview

9 action buttons arranged horizontally, each triggering specific AI transformations or actions.

### 3.1 Button: 📦 Combo Summary

**Icon**: 📦

**Tooltip**: "Summarize Combo"

**Function**: Generates AI summary of client's active combo packages

**Visibility**: 
```javascript
display: historyData && (historyData.active_combos_raw || historyData.active_combos) 
  ? 'inline-flex' 
  : 'none'
```

**Interaction Flow**:
```
[Click 📦]
  ↓
[Check: window.modalElement.lastHistoryData exists?]
  ↓ No
[Alert: "Please click 'AI Suggestion' first"]
  ↓ Yes
[chrome.runtime.sendMessage({
    action: "summarizeCombos",
    historyData: lastHistoryData,
    clientName: "...",
    modelChoice: "2.0"
})]
  ↓
[background.js: handleSummarizeCombos()]
  ↓
[Extract combo data from historyData.active_combos_raw]
  ↓
[Format combo list:
   "- New Ultralight 550: Còn 3 lần Nối và 5 lần Dặm."]
  ↓
[Call Gemini API with combo-specific prompt]
  ↓
[Return {reply: "Dạ chị ... ơi, hiện tại mình còn ..."}]
  ↓
[Set replyTextarea.value = reply]
```

**Example Output**:
```
Dạ chị Loan Tran 0938893587 ơi, hiện tại mình còn 3 lần nối 
và 5 lần dặm của combo New Ultralight 550 đó ạ. 
Chị tranh thủ book lịch đế Wings mình phục vụ chị nha!
```

**Loading State**: Button text → "⌛"

**Data Structure**:
```javascript
historyData.active_combos_raw = [
  {
    combo_name: "New Ultralight 550",
    count_new: 3,      // Remaining "Nối" sessions
    count_refill: 5    // Remaining "Dặm" sessions
  }
]
```

### 3.2 Button: ✨ Refine

**Icon**: ✨

**Tooltip**: "Refine Message"

**Function**: Enhances current reply with social proof and elite positioning

**Requirements**: Reply textarea must not be empty

**Interaction**: Sends current text to `handleImproveReply()`

**Prompt Strategy**:
- Inject social proof (popular among elite clients)
- Elite positioning language
- Maintain natural "bén" tone
- Keep original style suggestion intact

### 3.3 Button: ✂️ Shorten

**Icon**: ✂️

**Tooltip**: "Shorten Reply"

**Function**: Condenses reply while preserving key information

**Requirements**: Reply textarea must not be empty

**Interaction**: Sends current text to `handleShortenReply()`

**Prompt Strategy**:
- Remove fluff
- Keep prices, times, important questions
- Preserve 1-2 emojis
- Make punchy but polite

### 3.4 Button: � Format

**Icon**: � (Phone/Mobile device)

**Visual Reference**:

![Format Button](/Users/dannydo/.gemini/antigravity/brain/629689d6-297e-04da-a9c3-41ea255d26ec/uploaded_media_1770104140599.png)

**Tooltip**: "Format for Mobile"

**Function**: Reformats reply for mobile readability

**Requirements**: Reply textarea must not be empty

**Interaction**: Sends current text to `handleFormatReply()`

**Prompt Strategy**:
- Break into single sentences or short chunks
- Use double newlines for spacing
- Use bullet points or emojis for lists
- No content deletion

### 3.5 Button: 📅 Booking

**Icon**: 📅

**Tooltip**: "Create Booking"

**Function**: Extracts booking intent from reply and switches to booking view

**Interaction Flow**:
```
[Click 📅]
  ↓
[Extract text from replyTextarea]
  ↓
[chrome.runtime.sendMessage({
    action: "extractBookingIntent",
    text: "..."
})]
  ↓
[Gemini extracts: store, date, time, tech_name]
  ↓
[Switch to booking view]
  ↓
[Pre-populate extracted data]
```

**View Transition**: Hides main groups, shows booking view

### 3.6 Button: 📞 Request Phone

**Icon**: 📞

**Tooltip**: "Request Phone Number"

**Function**: Adds polite request for client's phone number

**Interaction**: Sends to `handleRequestPhoneReply()`

**Prompt Strategy**:
- Polite & warm Vietnamese
- Give reason (để em tiện gởi mẫu cho chị)
- 1-2 sentences max
- Use 📞✨ emojis

### 3.7 Button: 💎 Refer

**Icon**: 💎

**Tooltip**: "Ask for Referral"

**Function**: Adds referral program invitation to reply

**Interaction**: Sends to `handleReferralReply()`

**Offer Details**:
- **For referrer**: 100 Diamonds for NEW clients only
- **For referee**: 30% OFF first service
- **Style**: Cheeky, fun, caring

### 3.8 Button: ⚠️ Report

**Icon**: ⚠️ (red)

**Tooltip**: "Report Issue"

**Function**: Opens correction UI for fail-faster learning

**Interaction**: Calls `showCorrectionUI()`

**Purpose**: Store corrections that become mandatory rules in future AI prompts

### 3.9 Button: Insert

**Color**: Yellow/Gold (#FCC33A)

**Text**: "Insert"

**Function**: Applies reply to chat input field

**Interaction**: Calls `insertTextIntoChat(replyTextarea.value)`

**Target**: Main Pancake chat textarea

---

## 4. Response Area

### 4.1 Reply Textarea

**Element**: Large multi-line textarea

**ID**: `wings-ai-reply-text`

**Placeholder**: None (starts empty)

**Editable**: Yes, user can modify AI-generated text before insertion

**Dynamic Updates**:
- Set by `generateReply` response
- Set by action button responses (refine, shorten, format, etc.)
- Set by combo summary

**Styling**:
- Dark background (#1a1a2e)
- Light text (#ffffff)
- Scrollable
- Monospace font for better readability

---

## 5. Settings Panel

### 5.1 History Preview Section

**Title**: "History Preview (What AI sees)"

**Environment Indicators**:
- 🟢 Orb
- 🔴 Live

**Purpose**: Shows the enriched context data that AI receives

**Content** (Read-only, informational):
```
# CRITICAL CLIENT HISTORY (REAL DATA FROM BACKEND)
The client [Name] ([Phone]) context:
- Referral Diamonds: X 💎
- ⚠️ CRITICAL ALERTS: [notes]
- LAST SERVICE: [service] on [date] (Tech: [name])
- FAVORITE TECH: [tech_name]
- PREFERRED STYLES/DESIGN: [styles]
- ACTIVE PACKAGES: [combos]
- SOCIAL CIRCLE (Friends): [connections]
- UPCOMING BOOKING: [service] on [date] (Store: [store])
- LIFETIME SPENDING: XXX,XXX VND (VIP Candidate)
- LOYAL CLIENT SINCE: YYYY-MM-DD
- Total Completed Services: X
- Total Cancellations/No-Shows: X
- General Staff Notes: [notes]
```

### 5.2 MY STYLE Section

**Title**: "MY STYLE"

**Element**: Textarea

**ID**: `wings-ai-style-input`

**Storage Key**: `lastMyStyle`

**Purpose**: User's custom writing style instructions for AI

**Placeholder/Example**:
```
Trả lời ngắn gọn, vui vẻ, cảm xúc. 
Luôn dùng emoji. Viết câu ngắn, 
xuống hàng cho dễ đọc!
```

**Autosave**: Changes saved to `chrome.storage.sync` on input

**Impact**: Appended to AI prompt as target style

**Tip Label**: "Tip: keep styles short."

---

## 6. Dynamic Data Bindings Reference

### Complete Data Flow Map

| UI Element | Data Source | API Endpoint | Data Path | Update Trigger |
|------------|-------------|--------------|-----------|----------------|
| Client Name | Page scrape or history | `/3/client/history` | `phone` field | `generateReply` |
| Diamond Balance 💎 | History API | `/3/client/history` | `historyData.diamond_balance` | `generateReply` |
| CS Owner Badge | CS Owner API | `/3/cs/get-owner` | `historyData.cs_owner.name` | After history fetch |
| Combo Badges (T/U #\|#) | History API | `/3/client/history` | `historyData.active_combos_raw` | `generateReply` |
| Combo Button 📦 Visibility | History API | `/3/client/history` | `historyData.active_combos_raw` | `generateReply` |
| Active Combos Count | History API | `/3/client/history` | `historyData.active_combos_raw.length` | `generateReply` |
| Reply Textarea | Background script | Multiple | `response.reply` | Any AI action |
| Active Tones Counter | Local state | N/A | Checkbox count | Checkbox change |
| History Preview | History API | `/3/client/history` | Full `historyData` object | `generateReply` |

### Storage Keys

| Key | Purpose | Example Value | Scope |
|-----|---------|---------------|-------|
| `lastMyStyle` | User's writing style | "Trả lời ngắn gọn, vui vẻ..." | `chrome.storage.sync` |
| `lastModelChoice` | Preferred Gemini model | "2.0" or "2.5" | `chrome.storage.sync` |
| `lastLangChoice` | Language preference | "AUTO", "VI", "EN" | `chrome.storage.sync` |
| `apiEnv` | API environment | "orb" or "live" | `chrome.storage.sync` |
| `staffUser_orb` | Orb session token | `{token, status, user}` | `chrome.storage.sync` |
| `staffUser_live` | Live session token | `{token, status, user}` | `chrome.storage.sync` |
| `geminiApiKey` | Gemini API key | "AIza..." | `chrome.storage.sync` |

### Global State

| Variable | Scope | Purpose | Example Value |
|----------|-------|---------|---------------|
| `window.modalElement` | Global | Reference to modal DOM | DOM Element |
| `window.modalElement.lastHistoryData` | Global | Cached history response | `{diamond_balance: 100, cs_owner: {...}, ...}` |
| `replyTextarea` | Module | Textarea element | DOM Element |

---

## 7. Interaction Patterns

### Pattern 1: Standard AI Reply Generation

```
1. User clicks "AI Suggestion"
2. Button text → "⏳ Generating..."
3. Scrape client info from page
4. Gather tone selections
5. Send message to background script
6. Background calls /3/client/history
7. Background enriches context
8. Background calls Gemini API
9. Response returns with {reply, historyData}
10. Update replyTextarea.value
11. Store historyData in window.modalElement
12. Update diamond display
13. Show/hide combo button
14. Button text → "AI Suggestion"
```

### Pattern 2: Combo Summary

```
1. User clicks 📦 button
2. Check if lastHistoryData exists
3. If not: Alert user to click AI Suggestion first
4. If yes: Button icon → "⌛"
5. Send message to background with historyData
6. Background extracts active_combos_raw
7. Background formats combo list
8. Background calls Gemini with combo prompt
9. Response returns with summarized text
10. Update replyTextarea.value
11. Button icon → "📦"
```

### Pattern 3: Reply Transformation (Refine/Shorten/Format)

```
1. User clicks action button
2. Check if replyTextarea has text
3. If not: Do nothing (silently ignore)
4. If yes: Button icon/text → loading state
5. Send current text to background
6. Background calls Gemini with transformation prompt
7. Response returns with transformed text
8. Replace replyTextarea.value
9. Button returns to normal state
```

### Pattern 4: Insert to Chat

```
1. User clicks "Insert" button
2. Get text from replyTextarea
3. Find Pancake chat input element
4. Set value of chat input
5. Optionally: Focus chat input
```

---

## 8. Error Handling

### Missing History Data

**Scenario**: User clicks 📦 before clicking "AI Suggestion" (Note: Button only visible when combos exist)

**Handling**:
```javascript
if (!window.modalElement.lastHistoryData) {
    alert("No client history found. Please click 'AI Suggestion' first.");
    return;
}
```

### API Errors

**Scenario**: Background script returns error response

**Handling**:
```javascript
if (response && response.error) {
    alert("Wings AI Error: " + response.error);
}
```

### Empty Reply

**Scenario**: Action button clicked on empty textarea

**Handling**: Silently ignore (no operation)

### Null Element Safety

**Pattern**: All event listeners use `safeAddListener()` helper

```javascript
function safeAddListener(selector, event, handler, context = modal) {
    const element = context.querySelector(selector);
    if (element) {
        element.addEventListener(event, handler);
        return true;
    } else {
        console.warn(`[Wings AI] Element not found: ${selector}`);
        return false;
    }
}
```

---

## 9. Code References

### Key Files

| File | Path | Purpose |
|------|------|---------|
| Content Script | `/wings-ai-extension/content.js` | Main UI logic and DOM manipulation |
| Background Script | `/wings-ai-extension/background.js` | API calls and AI processing |
| Styles | `/wings-ai-extension/styles.css` | UI styling |
| Manifest | `/wings-ai-extension/manifest.json` | Extension configuration |

### Key Functions

| Function | Location | Purpose |
|----------|----------|---------|
| `createSuggestionModal()` | `content.js:~40` | Builds main interface HTML |
| `onGenerateClick()` | `content.js:~1960` | Handles "AI Suggestion" click |
| `handleGenerateReply()` | `background.js:~287` | Processes reply generation |
| `handleSummarizeCombos()` | `background.js:~1049` | Processes combo summary |
| `callGeminiAPI()` | `background.js:~570` | Calls Gemini with retries |
| `fetchClientHistory()` | `background.js:~708` | Calls `/3/client/history` |
| `safeAddListener()` | `content.js:~383` | Safe event listener helper |

---

## 10. Visual Design Tokens

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Gold | `#FCC33A` | Primary actions, active states, accents |
| Gold Dim | `#9F7928` | Inactive gold elements |
| Dark Background | `#1a1a2e` | Main background |
| Dark Secondary | `#16213e` | Panels, cards |
| Text Primary | `#ffffff` | Main text |
| Text Secondary | `#a0a0a0` | Hints, labels |
| Green (Orb) | `#22c55e` | Orb environment indicator |
| Red (Live) | `#ef4444` | Live environment indicator, alerts |

### Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Button Text | Inter | 14px | 600 |
| Client Name | Inter | 16px | 700 |
| Diamond Count | Inter | 14px | 600 |
| Reply Textarea | Monospace | 14px | 400 |
| Labels | Inter | 12px | 500 |

---

## Summary

This specification documents all visible and dynamic aspects of the Wings AI main interface. Every UI component has been mapped to its data source, interaction flow, and visual state. This enables AI assistants to understand the complete system architecture and assist with modifications, debugging, or extensions to the interface.
