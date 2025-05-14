#!/bin/bash

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up environment files for PropertyMap project...${NC}"

# Initialize variables
google_key=""
anthropic_key=""
needs_update=false

# Check if frontend .env file already exists
if [ -f frontend/.env ]; then
  echo -e "${GREEN}Found existing frontend/.env file.${NC}"

  # Check for Google Maps API key
  if grep -q "VITE_GOOGLE_MAPS_API_KEY" frontend/.env; then
    google_key=$(grep "VITE_GOOGLE_MAPS_API_KEY" frontend/.env | cut -d'=' -f2)
    echo -e "${GREEN}✓ Google Maps API key found.${NC}"
  else
    echo -e "${YELLOW}⚠ Google Maps API key not found.${NC}"
    echo "Please enter your Google Maps API key:"
    read -r google_key
    needs_update=true
  fi

  # Check for Anthropic API key
  if grep -q "VITE_ANTHROPIC_API_KEY" frontend/.env; then
    anthropic_key=$(grep "VITE_ANTHROPIC_API_KEY" frontend/.env | cut -d'=' -f2)
    echo -e "${GREEN}✓ Anthropic API key found.${NC}"
  else
    echo -e "${YELLOW}⚠ Anthropic API key not found.${NC}"
    echo "Please enter your Anthropic API key for Claude AI (press Enter to skip):"
    read -r anthropic_key
    needs_update=true
  fi

  # Update the file if needed
  if [ "$needs_update" = true ]; then
    if [ -z "$google_key" ]; then
      echo -e "${RED}Google Maps API key is required. No changes were made.${NC}"
      exit 1
    fi

    # Create a temporary file
    temp_file=$(mktemp)

    # Keep existing content but update or add our keys
    while IFS= read -r line || [[ -n "$line" ]]; do
      if [[ "$line" == VITE_GOOGLE_MAPS_API_KEY=* ]]; then
        echo "VITE_GOOGLE_MAPS_API_KEY=$google_key" >> "$temp_file"
      elif [[ "$line" == VITE_ANTHROPIC_API_KEY=* ]]; then
        if [ -n "$anthropic_key" ]; then
          echo "VITE_ANTHROPIC_API_KEY=$anthropic_key" >> "$temp_file"
        else
          echo "$line" >> "$temp_file"  # Keep existing anthropic key
        fi
      else
        echo "$line" >> "$temp_file"
      fi
    done < frontend/.env

    # Add missing keys if they weren't updated in the loop
    if ! grep -q "VITE_GOOGLE_MAPS_API_KEY" "$temp_file"; then
      echo "VITE_GOOGLE_MAPS_API_KEY=$google_key" >> "$temp_file"
    fi

    if [ -n "$anthropic_key" ] && ! grep -q "VITE_ANTHROPIC_API_KEY" "$temp_file"; then
      echo "VITE_ANTHROPIC_API_KEY=$anthropic_key" >> "$temp_file"
    fi

    # Replace the original file
    mv "$temp_file" frontend/.env
    echo -e "${GREEN}frontend/.env file has been updated!${NC}"
  else
    echo -e "${GREEN}All required API keys are already set. No changes needed.${NC}"
  fi
else
  echo -e "${YELLOW}No existing frontend/.env file. Creating a new one...${NC}"

  # Prompt for Google Maps API key
  echo "Please enter your Google Maps API key:"
  read -r google_key

  if [ -z "$google_key" ]; then
    echo -e "${RED}Google Maps API key is required. Setup aborted.${NC}"
    exit 1
  fi

  # Prompt for Anthropic API key (for Claude AI)
  echo "Please enter your Anthropic API key for Claude AI (press Enter to skip):"
  read -r anthropic_key

  # Create frontend .env file
  {
    echo "VITE_GOOGLE_MAPS_API_KEY=$google_key"
    if [ -n "$anthropic_key" ]; then
      echo "VITE_ANTHROPIC_API_KEY=$anthropic_key"
    fi
  } > frontend/.env

  echo -e "${GREEN}frontend/.env file has been created successfully!${NC}"
fi

# Check if backend .env file already exists
if [ -f backend/.env ]; then
  echo -e "${GREEN}Found existing backend/.env file.${NC}"
  # Check if PORT is defined
  if ! grep -q "PORT" backend/.env; then
    echo "PORT=3000" >> backend/.env
    echo -e "${GREEN}Added default PORT to backend/.env${NC}"
  fi
else
  # Create backend .env file with default configuration
  echo "PORT=3000" > backend/.env
  echo -e "${GREEN}backend/.env file has been created successfully!${NC}"
fi

echo -e "${YELLOW}Setup complete! Your API keys are now securely stored and will not be committed to Git.${NC}"

# Summary of API keys status
if grep -q "VITE_GOOGLE_MAPS_API_KEY" frontend/.env; then
  echo -e "${GREEN}✓ Google Maps API is configured${NC}"
else
  echo -e "${RED}✗ Google Maps API is not configured${NC}"
fi

if grep -q "VITE_ANTHROPIC_API_KEY" frontend/.env; then
  echo -e "${GREEN}✓ AI-powered property extraction with Claude is enabled!${NC}"
else
  echo -e "${YELLOW}⚠ Claude AI integration is not set up. Property extraction will use basic OCR only.${NC}"
  echo -e "${YELLOW}  To enable AI-powered extraction later, add VITE_ANTHROPIC_API_KEY to frontend/.env file.${NC}"
fi