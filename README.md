# Property Map

An interactive web application to visualize property listings on a map. Upload property data from text, PDF files, or images and see them displayed on an interactive map. Supports both English and Japanese property listings.

## Features

- Interactive map display with property markers
- Property listings with details (price, bedrooms, bathrooms, square footage)
- Upload and extract property addresses from text, PDF, and image files
- Japanese property listing scanner with OCR capabilities
- AI-powered property data extraction with Claude AI integration
- Automatic coordinate mapping for Tokyo addresses by ward
- Property details extraction for Japanese listings (price, size, layout)
- Two-step validation process for address extraction and geolocation
- Responsive UI for desktop and mobile devices

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/propertymap.git
   cd propertymap
   ```

2. Install all dependencies (frontend and backend):
   ```bash
   npm run install:all
   ```

### Running the Application

1. Start both frontend and backend:
   ```bash
   npm start
   ```

   Or run them separately:
   ```bash
   # Start the backend server
   npm run start:backend

   # In a separate terminal, start the frontend
   npm run start:frontend
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

## Project Structure

The application is organized into frontend and backend components:

### Frontend

- React/TypeScript-based web application
- Interactive map using Google Maps
- Property list and detail views
- File and image uploading interface

### Backend

- Express.js server
- OCR processing for images using Tesseract.js
- API endpoints for property data and OCR processing

## User Guide

### How to Upload Property Data

1. **Prepare your data file**:
   - Create a text (.txt) file or use a text-based PDF file that contains property addresses
   - For English addresses, use standard format (e.g., "123 Main St, San Francisco, CA 94105")
   - For Japanese properties, you can use structured property listings with details like:
     ```
     物件名: [Property Name]
     住所: [Address]
     面積: [Size]
     価格: [Price]
     階数: [Floor]
     ```
   - You can also upload images of Japanese property listings

2. **Upload and process files**:
   - Click the "Upload Property File or Image" button
   - Select your .txt, .pdf, or image file
   - For text/PDF files:
     - The application will extract addresses or property details
     - Review and confirm the extracted data
   - For Japanese property images:
     - The system will use OCR to extract address and property details
     - Review the extracted address and details before importing

3. **Verify property locations on the map**:
   - After importing, your properties will appear as markers on the map
   - Japanese properties will be placed on the map according to their wards in Tokyo
   - Click on a marker to view property details in a popup
   - Alternatively, click on a property in the list to highlight it on the map

### Supported Address Formats

The application recognizes addresses in the following formats:

#### English Addresses
- Standard US address format: "123 Main St, San Francisco, CA 94105"

#### Japanese Addresses
- Tokyo addresses with ward (区) information: "東京都豊島区駒込1-16-8"
- Full Japanese addresses with building names: "AXAS駒込Luxease - 東京都豊島区駒込1-16-8"

### Japanese Property Data

For Japanese properties, the system can extract and process:
- Property names (物件名)
- Addresses (住所/所在地)
- Price (価格) - Automatically converts from 万円 format
- Size (面積) - Automatically converts from ㎡ to sqft
- Floor information (階数)

### AI-Powered Property Data Extraction

The application uses Claude AI to enhance property data extraction:

1. **How it works**:
   - OCR extracts text from property images
   - Claude AI analyzes the extracted text to identify property details
   - Falls back to direct image analysis when OCR fails
   - Provides structured data even from complex Japanese real estate listings

2. **Setting up Claude AI integration**:
   - Obtain an API key from [Anthropic](https://www.anthropic.com/)
   - Create a `.env` file in the frontend directory with:
     ```
     VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
     ```
   - AI features will automatically activate when the key is present

3. **Benefits**:
   - Higher accuracy for Japanese property extraction
   - More reliable extraction of complex property details
   - Fallback mechanisms ensure data can be extracted even from low-quality images
   - Handles various real estate listing formats automatically

## Map Sharing

Share your property map with others using Google Maps Lists:

1. **Create a Google Maps List**:
   - Click the "Create Google Maps List" button
   - Enter a name for your list (e.g., "My Property List")
   - Click "Create Google Maps List" to proceed

2. **Follow the steps to create your shareable list**:
   - Click "Download KML File" to export your properties
   - Click "Open Google My Maps" to launch Google Maps
   - In Google My Maps, click "Import" and select the KML file you just downloaded
   - Your properties will be imported as a map with all locations
   - Click "Share" to get a shareable link

3. **Share with others**:
   - Use the shareable link from Google Maps to share your property list
   - Recipients can view all your selected properties on Google Maps

Note: This is the closest way to create a true Google Maps list that can be shared with a short URL.

## Google Maps Integration

This application uses Google Maps for displaying property locations:

1. Obtain a Google Maps API key from the [Google Cloud Platform Console](https://console.cloud.google.com/)
   - Create a new project or use an existing one
   - Enable the "Maps JavaScript API"
   - Create API credentials (API key)
   - Set up appropriate restrictions for your API key (HTTP referrers, IP addresses, etc.)

2. Configure your API key using the provided setup script:
   ```bash
   ./scripts/setup-env.sh
   ```
   This will create `.env` files in both the frontend and backend directories.

   Alternatively, you can manually create a `.env` file in the frontend directory:
   ```
   VITE_GOOGLE_MAPS_API_KEY=YOUR_ACTUAL_API_KEY_HERE
   ```

Note: Keep your API key confidential. The `.env` files are already included in `.gitignore` to ensure your API key is not committed to the repository.

## Utility Scripts

The project includes several utility scripts to help with development and code maintenance:

### Environment Setup

The `setup-env.sh` script creates necessary environment files for both frontend and backend:

```bash
./scripts/setup-env.sh
```

This interactive script will:
- Create a frontend `.env` file with your Google Maps API key
- Create a backend `.env` file with default configuration
- Handle existing files by asking if you want to overwrite them

### Code Maintenance

The `rm_trailing_spaces.sh` script removes trailing whitespace from code files:

```bash
./scripts/rm_trailing_spaces.sh
```

This script:
- Scans all relevant code files in the project
- Removes trailing whitespace automatically
- Reports which files were modified
- Excludes directories like node_modules, build, dist, etc.
- Works with JavaScript, TypeScript, CSS, HTML, and other common web development files

## Todo List

The following items are planned for future development:

- OCR functionality needs verification
- Display the property image on its map marker

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.