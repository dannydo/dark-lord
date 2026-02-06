---
name: Wings AI Main Screen Specification
description: Comprehensive specification for the Wings AI main interface, including layout, components, interactions, and API integrations for the reply generation and messaging system.
---

# Wings AI Main Screen Specification

## Overview

The Wings AI Main Screen is the primary interface consultants use to interact with clients. It provides AI-powered reply generation, direct messaging capabilities, and comprehensive client information display within a premium dark-themed modal overlay.

## UI Architecture

### Modal Structure

```
┌─────────────────────────────────────────────────────┐
│ WINGS AI Header                       [🖼️] [✕]│
├─────────────────────────────────────────────────────┤
│ Client Info Section                         💎 0    │
├─────────────────────────────────────────────────────┤
│ Action Buttons Row                                  │
│ [🧠] [✨] [✂️] [�] [📞] [📅] [💎]         [📦]    │
├─────────────────────────────────────────────────────┤
│ Reply Textarea Container                            │
│ ┌───────────────────────────────────────────────┐   │
│ │                                               │   │
│ │  AI-generated or manual reply text...        │   │
│ │                                               │   │
│ │  [⚠️]                          [💬] [➤]       │   │
│ └───────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│ History Preview (What AI sees)                      │
├─────────────────────────────────────────────────────┤
│ Ask Wings AI Input                          [➤]     │
├─────────────────────────────────────────────────────┤
│ POWERED BY WINGS AI v4.5                         [⚙️]│
└─────────────────────────────────────────────────────┘
```

### Component Hierarchy

1. **Header** (`#wings-ai-header`)
   - Logo and title
   - Gallery Toggle [🖼️]
   - Close button (✕)

2. **Client Info Section** (`#wings-ai-client-info`)
   - Client avatar
   - Client name
   - Diamond count badge

3. **Action Buttons Row** (`#wings-ai-action-buttons`)
   - AI Suggestion (🧠)
   - AI Sparkle (✨)
   - Cut/Extract (✂️)
   - Optimize for Phone Reading (📱)
   - Phone Request (📞)
   - Booking (📅)
   - Ask for Referral (💎)
   - Summarize Combo (�)

4. **Reply Area** (`#wings-ai-reply-section`)
   - Textarea container (`.wings-ai-textarea-container`)
   - Textarea (`#wings-ai-reply-text`)
   - Button bar (`.wings-ai-textarea-buttons`)
     - Report button (⚠️) - Left-aligned
     - Insert button (💬) - Right-aligned
     - Send button (➤) - Right-aligned

5. **History Preview Section**
6. **Ask Wings AI Input** (Inside Preferences Group)
7. **Global Footer** (`#wings-ai-global-footer`)
   - "POWERED BY WINGS AI" text
   - Settings Tooltip Trigger (⚙️)
     - Contains: 
       - Tone Selectors (Vui, Buồn, etc.)
       - Model Selector (v2.0 / v2.5)
       - Language Selector (Auto / VI / EN)
       - Environment Toggle (ORB / LIVE)
       - Data Cache Toggle (⚡)
   - Persistent across all views (Main, Booking, Gallery)

## Detailed Component Specifications

### Reply Textarea

**Element:** `#wings-ai-reply-text`

**Functionality:**
- Displays AI-generated suggestions
- Allows manual text editing
- Auto-populated from AI responses
- Cleared after successful send

**Styling:**
```css
.wings-ai-textarea-container textarea {
    width: 100%;
    height: 300px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 14px;
    padding: 20px;
    padding-bottom: 54px; /* Space for buttons */
    color: var(--wings-text-main);
    font-family: var(--wings-font);
    font-size: 15px;
    line-height: 1.6;
    resize: none;
}

.wings-ai-textarea-container textarea:focus {
    border-color: var(--wings-gold) !important;
    box-shadow: 0 0 0 1px var(--wings-gold) !important;
    outline: none !important;
}
```

**Behavior:**
- Placeholder: "Click 'AI Suggestion' above to generate a reply..."
- Focus border: Golden (`var(--wings-gold)`)
- No resize handle
- Supports multi-line text

### Button Bar

**Container:** `.wings-ai-textarea-buttons`

**Positioning:**
- Absolute positioning within textarea container
- Bottom: 12px from textarea bottom edge
- Left: 12px from textarea left edge
- Right: 12px from textarea right edge

**Layout:**
```css
.wings-ai-textarea-buttons {
    position: absolute;
    bottom: 12px;
    left: 12px;
    right: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 10;
    pointer-events: none; /* Allow clicking through */
}
```

#### Report Button (⚠️)

**Element:** `#wings-ai-report-btn`

**Purpose:** Report issues or problematic messages

**Styling:**
- Width/Height: 36px (circular)
- Background: `rgba(255, 255, 255, 0.08)` (glass-morphism)
- Icon color: `#ef4444` (red)
- Border-radius: 50%

**Hover Effect:**
```css
.wings-ai-btn-report:hover {
    background: #ef4444;
    color: #fff;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}
```

**Functionality:**
- Opens reporting interface (implementation TBD)
- Used for flagging inappropriate content or errors

#### Insert Button (💬)

**Element:** `#wings-ai-apply-btn`

**Purpose:** Insert generated reply into Pancake's native chat input

**Styling:**
- Width/Height: 36px (circular)
- Background: `rgba(255, 255, 255, 0.08)` (glass-morphism)
- Icon color: Golden (`var(--wings-gold)`)
- Border-radius: 50%

**Hover Effect:**
```css
.wings-ai-btn-primary:hover {
    background: var(--wings-gold);
    color: #000;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
}
```

**Functionality:**
1. Gets text from `#wings-ai-reply-text`
2. Finds Pancake's native input: `#replyBoxComposer`
3. Inserts text into native input
4. Does NOT send message (consultant reviews first)
5. Provides visual feedback

**Implementation:**
```javascript
applyBtn.addEventListener('click', async () => {
    const text = replyTextarea.value.trim();
    if (!text) {
        alert('No reply to insert');
        return;
    }
    
    const nativeInput = document.getElementById('replyBoxComposer');
    if (nativeInput) {
        nativeInput.value = text;
        nativeInput.focus();
        // Visual feedback
        applyBtn.innerHTML = '✓';
        setTimeout(() => {
            applyBtn.innerHTML = originalHtml;
        }, 500);
    }
});
```

#### Send Button (➤)

**Element:** `#wings-ai-send-btn`

**Purpose:** Send message directly to client via Pancake API (bypass native input)

**Styling:**
- Width/Height: 36px (circular)
- Background: `rgba(255, 255, 255, 0.08)` (glass-morphism)
- Icon color: Golden (`var(--wings-gold)`)
- Border-radius: 50%

**Hover Effect:** Same as Insert button

**Functionality:**

**API Endpoint:**
```
POST https://pancake.vn/api/v1/pages/{page_id}/conversations/{conversation_id}/messages
```

**Query Parameters:**
- `customer_id`: UUID from Pancake session
- `access_token`: JWT authentication token

**FormData Payload:**
```javascript
{
    "action": "reply_inbox",      // MUST be "reply_inbox" (not "send")
    "message": "text content",    // The message text
    "send_by_platform": "web"     // Required platform identifier
}
```

**Implementation:**
```javascript
sendBtn.addEventListener('click', async () => {
    const originalHtml = sendBtn.innerHTML;
    
    try {
        const text = replyTextarea.value.trim();
        if (!text) {
            alert('Please enter a message first');
            return;
        }
        
        // Extract IDs from current context
        let pageId, conversationId, customerId, accessToken;
        
        // Try URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        accessToken = urlParams.get('access_token');
        customerId = urlParams.get('customer_id');
        
        // Fallback: Extract from Performance API
        if (!accessToken || !customerId) {
            const perfEntries = performance.getEntriesByType('resource');
            const apiCall = perfEntries.find(e => 
                e.name.includes('/api/v1/') && e.name.includes('access_token')
            );
            
            if (apiCall) {
                const tokenMatch = apiCall.name.match(/access_token=([^&]+)/);
                const customerMatch = apiCall.name.match(/customer_id=([^&]+)/);
                accessToken = tokenMatch ? tokenMatch[1] : null;
                customerId = customerMatch ? customerMatch[1] : null;
            }
        }
        
        // Extract conversation ID from DOM
        const activeConv = document.querySelector('.conversation-item.active');
        if (activeConv) {
            // ID format: {page_id}_{conversation_id}__0
            const parts = activeConv.id.split('_');
            if (parts.length >= 2) {
                pageId = parts[0];
                // Remove __0 suffix if present
                const convIdParts = activeConv.id.split('__');
                conversationId = convIdParts[0];
            }
        }
        
        // Build the API request - match native Pancake UI exactly
        const formData = new FormData();
        formData.append('action', 'reply_inbox'); // MUST be 'reply_inbox'
        formData.append('message', text);
        formData.append('send_by_platform', 'web'); // Required
        
        const apiUrl = `https://pancake.vn/api/v1/pages/${pageId}/conversations/${conversationId}/messages?` +
                      `customer_id=${customerId}&access_token=${accessToken}`;
        
        // Visual feedback: disable button and show loading
        sendBtn.disabled = true;
        sendBtn.innerHTML = '⏳';
        
        // Send the message
        const response = await fetch(apiUrl, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const responseData = await response.json();
            console.log('[Wings AI] Message sent successfully', responseData);
            // Clear the textarea
            replyTextarea.value = '';
            // Restore button immediately (no checkmark)
            sendBtn.innerHTML = originalHtml;
            sendBtn.disabled = false;
        } else {
            const errorText = await response.text();
            console.error('[Wings AI] API Error Response:', errorText);
            throw new Error(`API returned ${response.status}`);
        }
        
    } catch (error) {
        console.error('[Wings AI] Send error:', error);
        alert('Failed to send message: ' + error.message);
        sendBtn.disabled = false;
        sendBtn.innerHTML = originalHtml;
    }
});
```

**Loading States:**
1. **Idle:** Send icon (➤)
2. **Sending:** Hourglass (⏳) + disabled
3. **Success:** Returns to send icon immediately
4. **Error:** Returns to send icon + alert

**Critical Notes:**
- ⚠️ The `action` parameter MUST be `"reply_inbox"` (not `"send"`)
- ⚠️ Must include `send_by_platform: "web"`
- ⚠️ Do NOT include `type` field (native UI doesn't send it)
- ⚠️ Remove `__0` suffix from conversation IDs extracted from DOM
- Messages appear in Pancake conversation immediately upon success
- No DOM manipulation needed - direct API call

## Action Buttons

### AI Suggestion Button (🧠)

**Purpose:** Generate AI reply based on conversation context

**Behavior:**
1. Harvests conversation history from DOM
2. Sends to background.js → Gemini API
3. Populates `#wings-ai-reply-text` with response
4. Shows loading state during generation

### AI Sparkle Button (✨)

**Purpose:** Refine/enhance current reply with social proof and elite positioning

**Requirements:**
- Textarea must have content
- Sends current text + refinement prompt to Gemini
- Replaces textarea content with refined version

### Summarize Combo Button (📦)

**Element:** `#wings-ai-combo-btn`

**Purpose:** Generate AI summary of client's combo/package history and preferences

**Position:** Isolated on the far right of the action buttons row, separate from other action buttons

**Conditional Rendering:** Only appears if client has an active combo (based on client history API data)

**Visual Styling:**
- 1-pixel circular border with color based on combo type
- Background: Glass-morphism (`rgba(255, 255, 255, 0.08)`)
- Size: 36px diameter
- Border colors by combo type:

| Combo Type | ID | Border Color | CSS |
|------------|-----|--------------|-----|
| **Combo Live** | 20365 | Green | `#4ade80` |
| **Combo Time** | 17695 | Gold | `#fbbf24` |
| **Combo Over** | 17910 | Orange | `#fb923c` |
| **Combo Ex** | 17791 | Coral/Salmon | `#fb7185` |

**Behavior:**
1. Checks if client has combo data from client history API
2. If no combo: Button is hidden (not rendered)
3. If combo exists: Button rendered with appropriate border color
4. On click: Fetches combo data and sends to Gemini for summarization
5. Generates contextual summary (e.g., "Client has Classic combo, due for renewal")
6. Populates `#wings-ai-reply-text` with generated summary
7. Shows loading state (hourglass) during generation

**Implementation:**
```javascript
// Combo type to color mapping
const COMBO_COLORS = {
    20365: '#4ade80',  // Combo Live - Green
    17695: '#fbbf24',  // Combo Time - Gold
    17910: '#fb923c',  // Combo Over - Orange
    17791: '#fb7185'   // Combo Ex - Coral/Salmon
};

// Conditional rendering based on client combo data
function renderComboButton(clientHistoryData) {
    const comboBtn = document.getElementById('wings-ai-combo-btn');
    
    // Check if client has an active combo
    const hasCombo = clientHistoryData?.combo_id && 
                     clientHistoryData.combo_id !== null;
    
    if (!hasCombo) {
        // Hide button if no combo
        comboBtn.style.display = 'none';
        return;
    }
    
    // Show button and apply color-coded border
    comboBtn.style.display = 'inline-flex';
    const comboId = clientHistoryData.combo_id;
    const borderColor = COMBO_COLORS[comboId] || '#ffffff'; // Default white
    
    comboBtn.style.border = `1px solid ${borderColor}`;
    comboBtn.style.borderRadius = '50%';
    
    // Click handler
    comboBtn.addEventListener('click', async () => {
        // Show loading state
        comboBtn.innerHTML = '⏳';
        comboBtn.disabled = true;
        
        try {
            // Send to background script for Gemini processing
            chrome.runtime.sendMessage({
                action: 'generateComboSummary',
                clientData: clientHistoryData
            }, (response) => {
                if (response.success) {
                    replyTextarea.value = response.summary;
                }
                // Restore button
                comboBtn.innerHTML = '📦';
                comboBtn.disabled = false;
            });
        } catch (error) {
            console.error('[Wings AI] Combo summary error:', error);
            comboBtn.innerHTML = '📦';
            comboBtn.disabled = false;
        }
    });
}

// Call after fetching client history data
renderComboButton(clientHistoryData);
```

**Styling Example:**
```css
#wings-ai-combo-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
    /* Border applied dynamically via JavaScript */
    border: 1px solid #4ade80; /* Example: Combo Live */
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    pointer-events: all;
}

#wings-ai-combo-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
    /* Shadow color matches border color */
}
```

**Requirements:**
- Client must have combo data in history API with valid `combo_id`
- Button hidden if `combo_id` is null or undefined
- Border color dynamically set based on combo type
- Positioned far right, isolated from other action buttons
- Generates contextual, actionable summary based on combo status

### Booking Button (📅)

**Purpose:** Switch to booking interface

**Behavior:**
- Calls `switchView('booking')`
- Hides main content
- Shows booking screen

### Diamond Button (💎)

**Purpose:** Display client's diamond tier/status

**Behavior:**
- Shows client loyalty information
- Integration: TBD

## Styling Guidelines

### Color Palette

```css
:root {
    --wings-gold: #FFD700;
    --wings-bg: #1a1a1a;
    --wings-surface: rgba(255, 255, 255, 0.05);
    --wings-text-main: #ffffff;
    --wings-text-dim: rgba(255, 255, 255, 0.6);
    --wings-font: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

### Button Design Principles

1. **Glass-morphism Background:** `rgba(255, 255, 255, 0.08)`
2. **Circular Shape:** 36px diameter, `border-radius: 50%`
3. **Hover Animation:**
   - Fill with accent color (red/gold)
   - Lift effect: `translateY(-1px)`
   - Glow shadow
4. **Consistent Spacing:** 12px margins on all sides
5. **Premium Feel:** Smooth transitions (0.2s)

### Spacing System

- **Textarea padding:** 20px (top/left/right), 54px (bottom)
- **Button margins:** 12px from all edges
- **Action Buttons gap:** 4px (tight spacing for more icons)
- **Button gap (right group):** 8px between Insert and Send
- **Visual bottom margin:** Exactly 12px from textarea bottom edge

## Data Flow

### Client Information

**Source:** Pancake DOM + API

**Extraction:**
```javascript
// Client name
const nameElement = document.querySelector('.conversation-name');
const clientName = nameElement?.textContent || 'Client';

// Phone number (from customer info panel only)
const customerPanel = document.querySelector('[data-block="page"]');
const phoneEl = customerPanel?.querySelector('a[href^="tel:"]');
const phoneNumber = phoneEl?.textContent || '';

// Diamond count (from client history API)
const diamondCount = clientHistoryData?.diamond_count || 0;
```

### Conversation History

**Harvesting:**
```javascript
function harvestConversationHistory() {
    const messages = document.querySelectorAll('.message');
    const history = [];
    
    messages.forEach(msg => {
        const isClient = msg.classList.contains('customer-message');
        const text = msg.querySelector('.message-text')?.textContent;
        
        if (text) {
            history.push({
                role: isClient ? 'client' : 'consultant',
                content: text,
                timestamp: msg.dataset.timestamp
            });
        }
    });
    
    return history;
}
```

### AI Integration

**Background Script Communication:**
```javascript
chrome.runtime.sendMessage({
    action: 'generateReply',
    conversationHistory: history,
    clientName: clientName,
    clientPhone: phoneNumber
}, (response) => {
    if (response.success) {
        document.getElementById('wings-ai-reply-text').value = response.reply;
    }
});
```

## Edge Cases & Error Handling

### Missing Authentication

**Scenario:** No `access_token` or `customer_id`

**Handling:**
```javascript
if (!accessToken || !customerId) {
    alert('Please refresh the page to restore session');
    return;
}
```

### API Rate Limiting

**Scenario:** Too many requests to Gemini API

**Handling:**
- Disable AI buttons temporarily
- Show retry countdown
- Log to console

### Network Errors

**Scenario:** Fetch fails (offline, timeout, 500 error)

**Handling:**
```javascript
catch (error) {
    console.error('[Wings AI] Send error:', error);
    alert('Failed to send message: ' + error.message);
    // Restore button state
    sendBtn.disabled = false;
    sendBtn.innerHTML = originalHtml;
}
```

### Empty Textarea

**Scenario:** User clicks Send with empty textarea

**Handling:**
```javascript
if (!text.trim()) {
    alert('Please enter a message first');
    return;
}
```

## Performance Considerations

1. **Lazy Loading:** Only initialize components when modal opens
2. **Event Delegation:** Use single listener for button rows
3. **Debouncing:** Prevent rapid-fire AI requests
4. **Memory Management:** Clear large conversation histories after use
5. **DOM Caching:** Store frequently accessed elements

## Accessibility

- All buttons have `title` attributes for tooltips
- Keyboard navigation support for all interactive elements
- ARIA labels for screen readers
- High contrast colors (WCAG AA compliant)
- Focus indicators (golden border on textarea)

## Version History

**Current Version:** v4.5.1

**Recent Changes:**
- **Data Cache Toggle (⚡):** Added to settings to control API fetching strategy (Cache vs Live).
- **Infinite Loop Fix:** Refactored booking slot rendering to prevent recursion.
- **Model & Language Selectors:** Added to Settings Tooltip.
- Fixed textarea focus border to golden color
- Adjusted button spacing to pixel-perfect 12px
- Corrected Send API parameters (`action: "reply_inbox"`)
- Removed checkmark animation from Send button
- Added `send_by_platform: "web"` parameter

## File Locations

- **Main Logic:** `/wings-ai-extension/content.js`
- **Styling:** `/wings-ai-extension/styles.css`
- **Background:** `/wings-ai-extension/background.js`
- **Manifest:** `/wings-ai-extension/manifest.json`

## Related Skills

- [Wings AI Extension](../wings-ai/SKILL.md) - Overall architecture
- [Wings AI Booking Screen](../wings-ai-booking-screen/SKILL.md) - Booking interface
- [Wings Settings Tooltip](../wings-settings/SKILL.md) - Settings management
- [Ask Wings AI](../wings-ask-ai/SKILL.md) - AI prompt feature

## Testing Checklist

- [ ] Textarea focus shows golden border (not blue)
- [ ] All three buttons visible inside textarea
- [ ] Button spacing exactly 12px from all edges
- [ ] Send button sends message to Pancake successfully
- [ ] Message appears in conversation thread immediately
- [ ] Insert button populates native input correctly
- [ ] AI Suggestion generates appropriate reply
- [ ] Loading states show correctly (hourglass)
- [ ] Error handling works (alerts show)
- [ ] Textarea clears after successful send
