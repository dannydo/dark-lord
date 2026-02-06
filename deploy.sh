#!/bin/bash

# Configuration
EXTENSION_DIR="wings-ai-extension"
GDRIVE_ROOT="/Users/dannydo/Library/CloudStorage/GoogleDrive-danny.do@wingslashes.com/My Drive"
TARGET_PATH="[WINGS] OFFICIAL/[WINGS] Operation/30. Project/Wings AI"
FULL_TARGET_DIR="$GDRIVE_ROOT/$TARGET_PATH"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting Wings AI Deployment...${NC}"

# 1. Extract Version from manifest.json
VERSION=$(grep '"version":' "$EXTENSION_DIR/manifest.json" | cut -d '"' -f 4)
ZIP_NAME="wings-ai-extension-v$VERSION.zip"

echo -e "📦 Identified Version: ${GREEN}$VERSION${NC}"

# 2. Check if Google Drive path exists
if [ ! -d "$FULL_TARGET_DIR" ]; then
    echo -e "${RED}❌ Error: Target Google Drive folder not found!${NC}"
    echo "Checked path: $FULL_TARGET_DIR"
    echo "Attempting to find 'Wings AI' folder anywhere in Drive..."
    
    # Fallback search (might be slow)
    FOUND_DIR=$(find "$GDRIVE_ROOT" -type d -name "Wings AI" 2>/dev/null | head -n 1)
    
    if [ -n "$FOUND_DIR" ]; then
        echo -e "${GREEN}✅ Found alternative path: $FOUND_DIR${NC}"
        FULL_TARGET_DIR="$FOUND_DIR"
    else
        echo -e "${RED}❌ Could not find destination folder. Aborting.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Target Google Drive folder confirmed.${NC}"
fi

# 3. Create Zip File
echo -e "${YELLOW}🔄 Zipping extension files...${NC}"
# Remove existing zip if any
rm -f "$ZIP_NAME"

cd "$EXTENSION_DIR"
zip -r -X "../$ZIP_NAME" manifest.json background.js content.js styles.css popup.html popup.js gallery_data.json assets/ icons/
cd ..

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful: $ZIP_NAME${NC}"
else
    echo -e "${RED}❌ Zip creation failed.${NC}"
    exit 1
fi

# 4. Move to Google Drive
echo -e "${YELLOW}📤 Moving to Google Drive...${NC}"
mv "$ZIP_NAME" "$FULL_TARGET_DIR/"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Successfully moved to: $FULL_TARGET_DIR/$ZIP_NAME${NC}"
else
    echo -e "${RED}❌ Move failed. Please check permissions.${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Deployment Complete!${NC}"
