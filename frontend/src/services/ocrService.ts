import type { Property } from './api';

const API_BASE_URL = 'http://localhost:3000/api';

// Extract property data from image using backend OCR service
export const extractPropertyData = async (file: File): Promise<{
  address: string | null;
  price: string | null;
  size: string | null;
  layout: string | null;
  station: string | null;
  buildingType: string | null;
  year: string | null;
}> => {
  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await fetch(`${API_BASE_URL}/ocr/extract-property`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error extracting property data:', error);
    // Return empty values in case of error
    return {
      address: null,
      price: null,
      size: null,
      layout: null,
      station: null,
      buildingType: null,
      year: null
    };
  }
};

// Extract just address from property image using backend OCR service
export const extractPropertyAddressFromImage = async (file: File): Promise<string | null> => {
  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await fetch(`${API_BASE_URL}/ocr/extract-address`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const result = await response.json();
    return result.address;
  } catch (error) {
    console.error('Error extracting address:', error);
    return null;
  }
};

// Extract raw text from image using backend OCR service
export const extractTextFromImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await fetch(`${API_BASE_URL}/ocr/extract-text`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    const result = await response.json();
    return result.text;
  } catch (error) {
    console.error('Error extracting text:', error);
    return '';
  }
};

// Extract addresses from images in PDF
export const extractAddressesFromImagePDF = async (file: File): Promise<string[]> => {
  // First extract text using OCR
  const text = await extractTextFromImage(file);

  // Regular expressions for extracting addresses
  // American format addresses
  const US_ADDRESS_REGEX = /(\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Terrace|Ter|Way),\s+[\w\s]+,\s+[A-Z]{2}\s+\d{5})/gi;

  // Japanese address format - matches patterns like "東京都豊島区駒込1-16-8"
  const JP_ADDRESS_REGEX = /(?:東京都|大阪府|京都府|北海道|[^\s]{2,3}県)[^\s]{2,3}(?:市|区|町|村)[^\s]{2,4}(?:\d+|\d+-\d+|\d+-\d+-\d+)/g;

  // Extract addresses using both regex patterns
  const usAddresses = text.match(US_ADDRESS_REGEX) || [];
  const jpAddresses = text.match(JP_ADDRESS_REGEX) || [];

  // Combine both types of addresses
  const allAddresses = [...usAddresses, ...jpAddresses];
  const uniqueAddresses = [...new Set(allAddresses)];

  return uniqueAddresses;
};