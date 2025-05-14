#!/bin/bash

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Installing Anthropic SDK for AI-powered property extraction...${NC}"

# Check if we're in the right directory
if [ ! -d "frontend" ]; then
  echo -e "${RED}Error: frontend directory not found. Make sure you're running this script from the project root.${NC}"
  exit 1
fi

# Change to frontend directory and install the SDK
cd frontend

echo "Checking if @anthropic-ai/sdk is already installed..."
if npm list @anthropic-ai/sdk > /dev/null 2>&1; then
  echo -e "${GREEN}@anthropic-ai/sdk is already installed.${NC}"
else
  echo "Installing @anthropic-ai/sdk..."
  npm install --save @anthropic-ai/sdk

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Successfully installed @anthropic-ai/sdk!${NC}"
  else
    echo -e "${RED}Failed to install @anthropic-ai/sdk. Please install it manually:${NC}"
    echo "cd frontend && npm install --save @anthropic-ai/sdk"
    exit 1
  fi
fi

# Make sure the environment variable is set
if [ -f ".env" ]; then
  if grep -q "VITE_ANTHROPIC_API_KEY" .env; then
    echo -e "${GREEN}Anthropic API key is already configured in .env file.${NC}"
  else
    echo -e "${YELLOW}Anthropic API key is not set in your .env file.${NC}"
    echo "Do you want to add it now? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
      echo "Please enter your Anthropic API key:"
      read -r api_key
      echo "VITE_ANTHROPIC_API_KEY=$api_key" >> .env
      echo -e "${GREEN}API key added to .env file.${NC}"
    else
      echo -e "${YELLOW}Skipping API key setup. You'll need to add VITE_ANTHROPIC_API_KEY to your .env file to use AI features.${NC}"
    fi
  fi
else
  echo -e "${YELLOW}No .env file found. Create one with ../scripts/setup-env.sh or manually add VITE_ANTHROPIC_API_KEY to a new .env file.${NC}"
fi

echo -e "${GREEN}Setup complete! You can now use AI-powered property extraction.${NC}"
echo -e "${YELLOW}Remember to restart your application for changes to take effect.${NC}"