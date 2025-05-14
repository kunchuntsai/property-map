#!/bin/bash

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up environment files for PropertyMap project...${NC}"

# Check if frontend .env file already exists
if [ -f frontend/.env ]; then
  echo "A frontend/.env file already exists. Do you want to overwrite it? (y/n)"
  read -r response
  if [[ "$response" =~ ^([nN][oO]|[nN])$ ]]; then
    echo "Frontend .env setup skipped. Existing file was not modified."
  else
    # Prompt for Google Maps API key
    echo "Please enter your Google Maps API key:"
    read -r api_key

    # Create frontend .env file
    echo "VITE_GOOGLE_MAPS_API_KEY=$api_key" > frontend/.env
    echo -e "${GREEN}frontend/.env file has been created successfully!${NC}"
  fi
else
  # Prompt for Google Maps API key
  echo "Please enter your Google Maps API key:"
  read -r api_key

  # Create frontend .env file
  echo "VITE_GOOGLE_MAPS_API_KEY=$api_key" > frontend/.env
  echo -e "${GREEN}frontend/.env file has been created successfully!${NC}"
fi

# Check if backend .env file already exists
if [ -f backend/.env ]; then
  echo "A backend/.env file already exists. Do you want to overwrite it? (y/n)"
  read -r response
  if [[ "$response" =~ ^([nN][oO]|[nN])$ ]]; then
    echo "Backend .env setup skipped. Existing file was not modified."
  else
    # Create backend .env file with default configuration
    echo "PORT=3000" > backend/.env
    echo -e "${GREEN}backend/.env file has been created successfully!${NC}"
  fi
else
  # Create backend .env file with default configuration
  echo "PORT=3000" > backend/.env
  echo -e "${GREEN}backend/.env file has been created successfully!${NC}"
fi

echo -e "${YELLOW}Setup complete! Your API key is now securely stored and will not be committed to Git.${NC}"