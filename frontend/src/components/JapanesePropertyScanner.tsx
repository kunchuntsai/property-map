import React, { useState, useRef } from 'react';
import { extractFormattedPropertyData } from '../services/ocrService';
import type { Property } from '../services/api';

interface JapanesePropertyScannerProps {
  onPropertyExtracted?: (property: Property) => void;
}

interface FormattedPropertyData {
  propertyName: string;
  address: string;
  floor: string;
  size: string;
  price: string;
}

const JapanesePropertyScanner: React.FC<JapanesePropertyScannerProps> = ({ onPropertyExtracted }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formattedData, setFormattedData] = useState<FormattedPropertyData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG)');
      return;
    }

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    try {
      setIsLoading(true);
      setError(null);

      // Extract property data from image
      const propertyData = await extractFormattedPropertyData(file);

      if (propertyData) {
        setFormattedData(propertyData);
      } else {
        setError('Could not detect property information in the image');
      }
    } catch (err) {
      setError('Error processing image');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormattedData(null);
    setPreviewUrl(null);
    setError(null);

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const copyFormattedDataToClipboard = () => {
    if (!formattedData) return;

    const formatted = `\`\`\`
物件名: ${formattedData.propertyName}
住所: ${formattedData.address}
階数: ${formattedData.floor}
面積: ${formattedData.size}
価格: ${formattedData.price}
\`\`\``;

    navigator.clipboard.writeText(formatted)
      .then(() => {
        alert('Formatted data copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  return (
    <div className="japanese-property-scanner">
      <h2>Japanese Property Data Extractor</h2>

      {!formattedData ? (
        <div className="upload-container">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={isLoading}
            className="file-input"
            ref={fileInputRef}
          />
          <button
            className="upload-btn"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Scan Property Image'}
          </button>
          <p className="hint">Upload a Japanese property listing image to extract details</p>
          {error && <p className="error">{error}</p>}
        </div>
      ) : (
        <div className="extracted-data">
          <h3>Extracted Property Data</h3>
          {previewUrl && (
            <div className="image-preview">
              <img src={previewUrl} alt="Property preview" style={{ maxWidth: '100%', maxHeight: '200px' }} />
            </div>
          )}
          <div className="formatted-data">
            <pre>
{`物件名: ${formattedData.propertyName}
住所: ${formattedData.address}
階数: ${formattedData.floor}
面積: ${formattedData.size}
価格: ${formattedData.price}`}
            </pre>
          </div>
          <div className="actions">
            <button className="btn copy-btn" onClick={copyFormattedDataToClipboard}>
              Copy Formatted Data
            </button>
            <button className="btn cancel-btn" onClick={handleCancel}>
              Scan Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JapanesePropertyScanner;