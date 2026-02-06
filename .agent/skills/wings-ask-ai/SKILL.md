---
name: Ask Wings AI Skill
description: Specification for the "Ask Wings AI" feature, enabling direct user-to-AI prompts for training, corrections, and drafting.
---

# Ask Wings AI Skill

## Overview
"Ask Wings AI" replaces the static "MY STYLE" text area with an interactive chat-like input. It allows the user to send direct instructions, training examples, or correction requests to the AI. The AI's response is populated in the main reply text area.

## UI Components
-   **Container**: Replaces `.wings-ai-style-section`.
-   **Input Field**:
    -   Placeholder: "Ask Wings AI..." (Grey text).
    -   Style: Rounded input with integrated send button.
-   **Send Button**:
    -   Icon: ➤ (Arrow/Paper plane).
    -   Location: Inside the right edge of the input field.
    -   Action: Clicks or Enter key triggers submission.

## Functional Logic
1.  **User Input**: User types a command (e.g., "training: ...", "correcting: ...").
2.  **Submission**:
    -   On Send/Enter, the input value is captured.
    -   A request is sent to the AI (via background script/API).
    -   Loading state: Input disabled or spinner shown.
3.  **Response**:
    -   The AI's text response is inserted into the main `#wings-ai-reply-text` textarea.
    -   Input field is cleared.

## Use Cases
-   **Training**: "training: tell clients we are closed on Sundays."
-   **Correction**: "correcting: The price for X is actually $50."
-   **Drafting**: "Draft a polite apology for running late."

## CSS Structure
```css
.wings-ai-ask-container {
    position: relative;
    margin-top: 12px;
}

.wings-ai-ask-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    padding: 10px 40px 10px 16px; /* Right padding for button */
    color: #fff;
    font-size: 13px;
}
"
.wings-ai-ask-send-btn {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 8px;
    width: 28px;
    height: 28px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--wings-gold);
}
```
