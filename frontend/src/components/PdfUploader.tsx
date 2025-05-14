import React, { useState } from 'react';
import { extractAddressesFromFile } from '../services/simpleFileExtractor';
import { extractPropertyAddressFromImage } from '../services/ocrService';
import AddressValidator from './AddressValidator';
import type { Property } from '../services/api';

interface PdfUploaderProps {
  onPropertiesExtracted: (properties: Property[]) => void;
}

const PdfUploader: React.FC<PdfUploaderProps> = ({ onPropertiesExtracted }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedAddresses, setExtractedAddresses] = useState<string[]>([]);
  const [showValidator, setShowValidator] = useState(false);
  const [isImageFile, setIsImageFile] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const fileType = file.type;

    // Check if file is supported
    if (fileType !== 'application/pdf' && fileType !== 'text/plain' &&
        !fileType.startsWith('image/')) {
      setError('Please upload a PDF, text file, or image');
      return;
    }

    setIsImageFile(fileType.startsWith('image/'));

    try {
      setIsLoading(true);
      setError(null);

      // Extract addresses from file
      let addresses: string[] = [];

      if (isImageFile) {
        // Use OCR for image files
        const jpAddress = await extractPropertyAddressFromImage(file);
        if (jpAddress) {
          addresses = [jpAddress];
        } else {
          setError('Could not detect Japanese address in the image');
          // Provide a sample Japanese address as fallback
          addresses = ["東京都豊島区駒込1-16-8"];
        }
      } else {
        // For text and PDF files, use the existing extractor
        addresses = await extractAddressesFromFile(file);
      }

      if (addresses.length === 0) {
        setError('No property addresses found in the file');
      }

      setExtractedAddresses(addresses);
      setShowValidator(true);
    } catch (err) {
      setError(`Error processing ${isImageFile ? 'image' : 'file'}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAddresses = async (validAddresses: string[]) => {
    try {
      setIsLoading(true);
      // Convert addresses to property objects
      const properties = validAddresses.map((address, index) => {
        // For Japanese addresses, generate coordinates around Tokyo
        // Tokyo coordinates: 35.6762° N, 139.6503° E
        const isJapaneseAddress = /[一-龯]/.test(address);

        const lat = isJapaneseAddress
          ? 35.6762 + (Math.random() - 0.5) * 0.1
          : 37.7749 + (Math.random() - 0.5) * 0.1;

        const lng = isJapaneseAddress
          ? 139.6503 + (Math.random() - 0.5) * 0.1
          : -122.4194 + (Math.random() - 0.5) * 0.1;

        return {
          id: `file-${index + 1}`,
          address,
          price: Math.floor(Math.random() * 1000000) + 500000,
          bedrooms: Math.floor(Math.random() * 4) + 1,
          bathrooms: Math.floor(Math.random() * 3) + 1,
          sqft: Math.floor(Math.random() * 2000) + 800,
          lat,
          lng
        };
      });

      onPropertiesExtracted(properties);

      // Clear state
      setShowValidator(false);
      setExtractedAddresses([]);
    } catch (err) {
      setError('Error importing addresses');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelValidation = () => {
    setShowValidator(false);
    setExtractedAddresses([]);
  };

  if (showValidator) {
    return (
      <AddressValidator
        addresses={extractedAddresses}
        onConfirm={handleConfirmAddresses}
        onCancel={handleCancelValidation}
      />
    );
  }

  return (
    <div className="pdf-uploader">
      <h2>Upload Property File</h2>
      <div className="upload-container">
        <input
          type="file"
          accept=".pdf,.txt,.jpg,.jpeg,.png"
          onChange={handleFileUpload}
          disabled={isLoading}
        />
        <button
          className="upload-btn"
          onClick={() => {
            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
            if (fileInput) fileInput.click();
          }}
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Upload File'}
        </button>
      </div>
      {error && <div className="error">{error}</div>}
      {isLoading && <div className="loading">Extracting addresses from file...</div>}
    </div>
  );
};

export default PdfUploader;