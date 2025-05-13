# Property Map Frontend

This is the frontend for the Property Map application, which displays property listings on a map using Google Maps.

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up Google Maps API Key:
   - Create a `.env` file in the frontend directory
   - Add your Google Maps API key as:
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```
   - Make sure your API key has the following APIs enabled:
     - Maps JavaScript API
     - Geocoding API
     - Places API (if you're using places functionality)

3. Start the development server:
```bash
npm run dev
```

## Features

- Upload property listings from PDFs, text files, or images
- Display properties on Google Maps
- Select properties to view details
- Support for Japanese property listings with proper formatting and geocoding

## Troubleshooting

If the map shows "This page can't load Google Maps correctly":
1. Check that you've added your API key correctly in the `.env` file
2. Verify that your API key is valid and has the necessary APIs enabled
3. Check if there are any billing issues with your Google Cloud account
4. Make sure your API key has the right restrictions (domain, HTTP referrers, etc.)
