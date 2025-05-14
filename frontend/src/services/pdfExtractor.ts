import type { Property } from './api';

// Using a simpler version with direct CDN import to avoid build issues
const pdfjsLib = window['pdfjs-dist/build/pdf'];

export const extractPropertiesFromPDF = async (file: File): Promise<Property[]> => {
  try {
    // Dynamically load PDF.js
    if (!pdfjsLib) {
      // Add PDF.js script to the document
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
      document.head.appendChild(script);

      // Wait for script to load
      await new Promise<void>((resolve) => {
        script.onload = () => resolve();
      });
    }

    // Set worker source
    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

    // Regular expression for extracting addresses
    const ADDRESS_REGEX = /(\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Terrace|Ter|Way),\s+[\w\s]+,\s+[A-Z]{2}\s+\d{5})/gi;

    // Load the PDF file
    const arrayBuffer = await file.arrayBuffer();
    const typedArray = new Uint8Array(arrayBuffer);
    const loadingTask = pdfjsLib.getDocument({ data: typedArray });
    const pdf = await loadingTask.promise;

    // Extract text from each page
    const extractedAddresses: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((item: any) => item.str).join(' ');

      // Extract addresses using regex
      const addresses = text.match(ADDRESS_REGEX);

      if (addresses) {
        addresses.forEach(address => {
          if (!extractedAddresses.includes(address)) {
            extractedAddresses.push(address);
          }
        });
      }
    }

    // Convert extracted addresses to property format with mock data
    return extractedAddresses.map((address, index) => {
      // Generate random coordinates near San Francisco
      const lat = 37.7749 + (Math.random() - 0.5) * 0.1;
      const lng = -122.4194 + (Math.random() - 0.5) * 0.1;

      return {
        id: `pdf-${index + 1}`,
        address,
        price: Math.floor(Math.random() * 1000000) + 500000, // Random price between 500k and 1.5M
        bedrooms: Math.floor(Math.random() * 4) + 1,         // 1-4 bedrooms
        bathrooms: Math.floor(Math.random() * 3) + 1,        // 1-3 bathrooms
        sqft: Math.floor(Math.random() * 2000) + 800,        // 800-2800 sqft
        lat,
        lng
      };
    });
  } catch (error) {
    console.error('Error extracting properties from PDF:', error);
    return [];
  }
};