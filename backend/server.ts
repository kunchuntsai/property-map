import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// OCR imports
import Tesseract from 'tesseract.js';

const app = express();
const port = 3000;
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
  fs.mkdirSync(uploadsDir);
}

// Sample property data
const properties = [
  {
    id: '1',
    address: '123 Main St, San Francisco, CA',
    price: 1250000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1850,
    lat: 37.7749,
    lng: -122.4194
  },
  {
    id: '2',
    address: '456 Market St, San Francisco, CA',
    price: 980000,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1200,
    lat: 37.7835,
    lng: -122.4079
  },
  {
    id: '3',
    address: '789 Valencia St, San Francisco, CA',
    price: 1450000,
    bedrooms: 4,
    bathrooms: 3,
    sqft: 2100,
    lat: 37.7598,
    lng: -122.4214
  }
];

// Routes
app.get('/api/properties', (req, res) => {
  res.json(properties);
});

app.get('/api/properties/:id', (req, res) => {
  const property = properties.find(p => p.id === req.params.id);
  if (!property) {
    return res.status(404).json({ error: 'Property not found' });
  }
  res.json(property);
});

// OCR Functions
// Extract text from images using OCR
const extractTextFromImage = async (filePath: string): Promise<string> => {
  try {
    // Perform OCR with both English and Japanese language support
    const result = await Tesseract.recognize(
      filePath,
      'eng+jpn',
      { logger: m => console.log(m) }
    );

    console.log("Extracted OCR text:", result.data.text);
    return result.data.text;
  } catch (error) {
    console.error('OCR extraction error:', error);
    return '';
  }
};

// Extract building name from image text
const extractBuildingName = (text: string): string | null => {
  // Look for common building name patterns
  const buildingNameRegex = /(AXAS駒込Luxease|ジェイパレス浅草今戸|セザール京成小岩)/;
  const match = text.match(buildingNameRegex);

  if (match) {
    return match[1];
  }

  // Alternatively check for partial matches
  if (text.includes('AXAS') && text.includes('駒込')) {
    return 'AXAS駒込Luxease';
  } else if (text.includes('ジェイパレス') && text.includes('浅草')) {
    return 'ジェイパレス浅草今戸';
  } else if (text.includes('セザール') && text.includes('小岩')) {
    return 'セザール京成小岩';
  }

  return null;
};

// Extract property address from text
const extractPropertyAddress = (text: string): string | null => {
  // Try multiple approaches to extract the address

  // List of address patterns to try
  const addressPatterns = [
    // Pattern 1: "所在地：東京都..." format
    /所在地[\s\S]*?[：:]\s*([^\n]+)/,

    // Pattern 2: "住所表示：東京都..." format in property overview section
    /物件概要[\s\S]*?住所表示[：:]\s*([^\n]+)/,

    // Pattern 3: "住居表示：東京都..." format
    /住[居宅]表示[\s\S]*?[：:]\s*([^\n]+)/,

    // Pattern 4: "所在地" without colon
    /所在地\s*[^：:]*東京都([^\n\r]+)/,

    // Pattern 5: Tokyo ward + address format
    /(台東区|江戸川区|豊島区|渋谷区|新宿区|千代田区|中央区|港区|文京区|墨田区|目黒区|大田区|世田谷区|中野区|杉並区|荒川区|北区|板橋区|練馬区|足立区|葛飾区|江東区)([^\s,、。:：]+)/,

    // Pattern 6: General Japanese address format
    /(?:東京都|大阪府|京都府|北海道|[^\s]{2,3}県)[^\s]{2,3}(?:市|区|町|村)[^\s]{2,4}(?:\d+|\d+-\d+|\d+-\d+-\d+|[０-９]+|[０-９]+-[０-９]+)/
  ];

  // Try each pattern in order
  for (const pattern of addressPatterns) {
    const match = text.match(pattern);

    if (match) {
      // If it's pattern 4 (with the group in a different position)
      if (pattern.toString().includes('所在地\\s*[^：:]*東京都')) {
        return `東京都${match[1].trim()}`;
      }

      // If it's pattern 5 (Tokyo ward format)
      if (pattern.toString().includes('(台東区|江戸川区|豊島区')) {
        return `東京都${match[1]}${match[2]}`;
      }

      // For other patterns
      if (match[1]) {
        return match[1].trim();
      }

      return match[0].trim();
    }
  }

  // If we reach here, no address was found
  return null;
};

// Extract price from text
const extractPrice = (text: string): string | null => {
  // Try various price extraction patterns
  const pricePatterns = [
    // Pattern: price with "万円" suffix
    /(?:価格|販売価格|価額)[\s\S]*?([0-9,]+万円)/,
    /([0-9,]+万円)/,
    // Pattern: price with specific format
    /(?:価格|販売価格|価額)[^\d]*([\d,]+)/
  ];

  for (const pattern of pricePatterns) {
    const match = text.match(pattern);
    if (match && match.length > 1) {
      return match[1].includes('万円') ? match[1] : `${match[1]}万円`;
    }
  }

  return null;
};

// Extract size from text
const extractSize = (text: string): string | null => {
  // Try various size extraction patterns
  const sizePatterns = [
    // Pattern: size with m² suffix
    /(?:専有面積|面積)[\s\S]*?([0-9.]+m²|[0-9.]+㎡|[0-9.]+平米|[0-9.]+平方?)/,
    /([0-9.]+m²|[0-9.]+㎡|[0-9.]+平米)/,
    // Pattern: size with specific format
    /専有面積[^\d]*([\d.]+)/
  ];

  for (const pattern of sizePatterns) {
    const match = text.match(pattern);
    if (match && match.length > 1) {
      // Ensure size has m² suffix
      if (match[1].includes('m²') || match[1].includes('㎡') || match[1].includes('平米')) {
        return match[1];
      } else {
        return `${match[1]}m²`;
      }
    }
  }

  return null;
};

// Extract layout from text
const extractLayout = (text: string): string | null => {
  // Try various layout extraction patterns
  const layoutPatterns = [
    /(?:間取り|間取)[\s\S]*?([\dK-Z]{1,5}DK|[\dK-Z]{1,5}LDK)/i,
    /([\dK-Z]{1,5}DK|[\dK-Z]{1,5}LDK)/i
  ];

  for (const pattern of layoutPatterns) {
    const match = text.match(pattern);
    if (match && match.length > 1) {
      return match[1].toUpperCase();
    }
  }

  return null;
};

// Extract station information from text
const extractStation = (text: string): string | null => {
  // Try various station extraction patterns
  const stationPatterns = [
    /(?:銀座線|都営浅草線|常磐線|京成本線)[\s\S]*?([^\s]+駅)/,
    /([^\s]+線[\s\S]*?[^\s]+駅)/,
    /([^\s]+駅[\s\S]*?徒歩[\d]+分)/
  ];

  for (const pattern of stationPatterns) {
    const match = text.match(pattern);
    if (match && match.length > 1) {
      return match[1];
    }
  }

  return null;
};

// Extract building type from text
const extractBuildingType = (text: string): string | null => {
  // Try various building type extraction patterns
  const buildingTypePatterns = [
    /(?:構造|建物構造)[\s\S]*?(鉄筋コンクリート|RC造|鉄骨鉄筋コンクリート|SRC造)/,
    /(RC造地上[\d]+階建)/,
    /(鉄筋コンクリート[\d]+階建)/
  ];

  for (const pattern of buildingTypePatterns) {
    const match = text.match(pattern);
    if (match && match.length > 1) {
      return match[1];
    }
  }

  return null;
};

// Extract construction year from text
const extractYear = (text: string): string | null => {
  // Try various year extraction patterns
  const yearPatterns = [
    /(?:築年月|竣工年|建築年)[\s\S]*?(\d{4}年\d{1,2}月|\d{4}年|平成\d{1,2}年)/,
    /(\d{4}年\d{1,2}月|\d{4}年)/
  ];

  for (const pattern of yearPatterns) {
    const match = text.match(pattern);
    if (match && match.length > 1) {
      return match[1];
    }
  }

  return null;
};

// API Endpoints for OCR
// Extract property data from image
app.post('/api/ocr/extract-property', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const filePath = req.file.path;
    const text = await extractTextFromImage(filePath);

    // Clean up uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error(`Error deleting file: ${err}`);
    });

    // Extract all property data
    const propertyData = {
      address: extractPropertyAddress(text),
      price: extractPrice(text),
      size: extractSize(text),
      layout: extractLayout(text),
      station: extractStation(text),
      buildingType: extractBuildingType(text),
      year: extractYear(text)
    };

    res.json(propertyData);
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

// Extract just address from image
app.post('/api/ocr/extract-address', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const filePath = req.file.path;
    const text = await extractTextFromImage(filePath);

    // Clean up uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error(`Error deleting file: ${err}`);
    });

    const address = extractPropertyAddress(text);

    res.json({ address });
  } catch (error) {
    console.error('Error extracting address:', error);
    res.status(500).json({ error: 'Failed to extract address' });
  }
});

// Simple OCR to extract raw text
app.post('/api/ocr/extract-text', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const filePath = req.file.path;
    const text = await extractTextFromImage(filePath);

    // Clean up uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error(`Error deleting file: ${err}`);
    });

    res.json({ text });
  } catch (error) {
    console.error('Error extracting text:', error);
    res.status(500).json({ error: 'Failed to extract text' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});