# Property Map

An interactive web application to visualize property listings on a map. Upload property data from text, PDF files, or images and see them displayed on an interactive map. Supports both English and Japanese property listings.

## Features

- Interactive map display with property markers
- Property listings with details (price, bedrooms, bathrooms, square footage)
- Upload and extract property addresses from text, PDF, and image files
- Japanese property listing scanner with OCR capabilities
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

2. Install dependencies:
   ```bash
   # Install frontend dependencies
   cd frontend
   npm install
   ```

### Running the Application

1. Start the frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

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

## Removing Properties

- Each property in the list has a remove button (×)
- Click this button to remove a property from the list and map 