---
name: Wings AI Settings Tooltip
description: Instructions for managing and styling the unified settings tooltip in the Wings AI extension.
---

# Wings AI Settings Tooltip

This skill defines the architecture and styling for the unified settings tooltip triggered by the gear icon in the footer.

## Components

### 1. Settings Trigger (⚙️)
- Positioned to the left of the model version selector.
- Triggers the tooltip on hover.

### 2. Unified Tooltip
- Contains the tone selection pills.
- Contains the model and language selectors.
- Styled with a dark, premium aesthetic to match the extension theme.

## Implementation Guidelines

### HTML structure
The selectors and tone pills should be moved inside a `.wings-ai-settings-tooltip` container.

### CSS logic
- Use `opacity` and `visibility` for smooth transitions.
- Ensure the tooltip doesn't get cut off by the modal bounds.
- Use `z-index` to keep it above other footer elements.
