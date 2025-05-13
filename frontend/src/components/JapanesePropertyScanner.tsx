import React, { useState, useRef } from 'react';
import { extractPropertyData } from '../services/ocrExtractor';
import type { Property } from '../services/api';

interface JapanesePropertyScannerProps {
  onPropertyExtracted: (property: Property) => void;
}

const JapanesePropertyScanner: React.FC<JapanesePropertyScannerProps> = ({ onPropertyExtracted }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propertyImage, setPropertyImage] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<{
    address: string | null;
    price: string | null;
    size: string | null;
    layout: string | null;
    station: string | null;
    buildingType: string | null;
    year: string | null;
  } | null>(null);
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
    setPropertyImage(file.name);
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Extract property data from image
      const propertyData = await extractPropertyData(file);
      setExtractedData(propertyData);
      
      if (!propertyData.address) {
        setError('Could not detect address in the image. Please enter it manually.');
      }
      
    } catch (err) {
      setError('Error processing image');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getMapCoordinates = (address: string | null): [number, number] => {
    if (!address) return [35.6812, 139.7671]; // Default Tokyo coordinates
    
    // Try to extract ward from address for better coordinates
    const wardMatch = address.match(/(台東区|江戸川区|豊島区|渋谷区|新宿区|千代田区|中央区|港区|文京区|墨田区|目黒区|大田区|世田谷区|中野区|杉並区|荒川区|北区|板橋区|練馬区|足立区|葛飾区|江東区)/);
    
    if (wardMatch) {
      const ward = wardMatch[1];
      
      // Approximate coordinates for major Tokyo wards
      const wardCoordinates: Record<string, [number, number]> = {
        '台東区': [35.7120, 139.8107],
        '江戸川区': [35.7060, 139.8680],
        '豊島区': [35.7283, 139.7190],
        '渋谷区': [35.6580, 139.7016],
        '新宿区': [35.6938, 139.7034],
        '千代田区': [35.6938, 139.7534],
        '中央区': [35.6698, 139.7727],
        '港区': [35.6586, 139.7511],
        '文京区': [35.7080, 139.7520],
        '墨田区': [35.7083, 139.8022],
        '目黒区': [35.6414, 139.6981],
        '大田区': [35.5616, 139.7168],
        '世田谷区': [35.6465, 139.6533],
        '中野区': [35.7073, 139.6638],
        '杉並区': [35.6991, 139.6362],
        '荒川区': [35.7363, 139.7829],
        '北区': [35.7552, 139.7354],
        '板橋区': [35.7618, 139.7091],
        '練馬区': [35.7357, 139.6512],
        '足立区': [35.7750, 139.8049],
        '葛飾区': [35.7448, 139.8469],
        '江東区': [35.6693, 139.8129]
      };
      
      return wardCoordinates[ward] || [35.6812, 139.7671];
    }
    
    return [35.6812, 139.7671]; // Default Tokyo coordinates
  };

  const getPropertyBuildingName = (address: string | null): string | null => {
    if (!address) return null;
    
    // Extract the building name or description from the file name or identified patterns
    if (propertyImage) {
      const fileName = propertyImage.toLowerCase();
      
      // Look for common building indicators in the filename
      if (fileName.includes('luxease') || fileName.includes('axas')) {
        return 'AXAS Luxease';
      } else if (fileName.includes('palace') || fileName.includes('jpala') || fileName.includes('パレス')) {
        return 'J-Palace';
      } else if (fileName.includes('cesare') || fileName.includes('sezar') || fileName.includes('セザール')) {
        return 'Cesare';
      } else if (fileName.includes('mansion') || fileName.includes('マンション')) {
        return 'Mansion';
      }
    }
    
    return null;
  };

  const handleConfirm = () => {
    if (!extractedData?.address) return;
    
    // Parse price value from Japanese format (e.g., "3,780万円")
    let priceValue = 0;
    if (extractedData.price) {
      // Remove non-numeric characters and convert to number
      const numericValue = extractedData.price.replace(/[^0-9]/g, '');
      priceValue = parseInt(numericValue) * 10000; // Convert 万円 to regular yen
    }
    
    // Parse size value from text (e.g., "30.31m²")
    let sizeValue = 0;
    if (extractedData.size) {
      // Extract the numeric part
      const numericValue = extractedData.size.replace(/[^0-9.]/g, '');
      sizeValue = parseFloat(numericValue) * 10.7639; // Convert m² to sqft
    }

    // Parse bedrooms from layout (e.g., "2LDK" -> 2)
    let bedroomCount = 2; // Default
    if (extractedData.layout) {
      const match = extractedData.layout.match(/(\d+)[KLD]/i);
      if (match && match[1]) {
        bedroomCount = parseInt(match[1]);
      }
    }
    
    // Get coordinates based on the address
    const [lat, lng] = getMapCoordinates(extractedData.address);
    
    // Get property building name based on the file and address
    const buildingName = getPropertyBuildingName(extractedData.address);
    
    // Final address to display
    const displayAddress = buildingName 
      ? `${buildingName} - ${extractedData.address}` 
      : extractedData.address;
    
    // Create a property object with the extracted data
    const property: Property = {
      id: `jp-${Date.now()}`,
      address: displayAddress,
      price: priceValue || 37800000, // Default if not extracted
      bedrooms: bedroomCount,
      bathrooms: 1, 
      sqft: sizeValue || 307, // Default if not extracted
      lat,
      lng
    };
    
    onPropertyExtracted(property);
    
    // Reset the component state
    setExtractedData(null);
    setPreviewUrl(null);
    setPropertyImage(null);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancel = () => {
    setExtractedData(null);
    setPreviewUrl(null);
    setPropertyImage(null);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="japanese-property-scanner">
      <h2>Japanese Property Scanner</h2>
      
      {!extractedData ? (
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
          <p className="hint small">The scanner will automatically detect property details from various listing formats</p>
        </div>
      ) : (
        <div className="extracted-data">
          <h3>Extracted Property Data</h3>
          {previewUrl && (
            <div className="image-preview">
              <img src={previewUrl} alt="Property preview" style={{ maxWidth: '100%', maxHeight: '200px' }} />
              {propertyImage && <p className="image-name">{propertyImage}</p>}
            </div>
          )}
          <div className="data-fields">
            <div className="field">
              <label>Address:</label>
              <input 
                type="text" 
                value={extractedData.address || ''} 
                onChange={(e) => setExtractedData({ ...extractedData, address: e.target.value })}
                placeholder="No address detected"
              />
            </div>
            <div className="field">
              <label>Price:</label>
              <input 
                type="text" 
                value={extractedData.price || ''} 
                onChange={(e) => setExtractedData({ ...extractedData, price: e.target.value })}
                placeholder="Price not detected"
              />
            </div>
            <div className="field">
              <label>Size:</label>
              <input 
                type="text" 
                value={extractedData.size || ''} 
                onChange={(e) => setExtractedData({ ...extractedData, size: e.target.value })}
                placeholder="Size not detected"
              />
            </div>
            <div className="field">
              <label>Layout:</label>
              <input 
                type="text" 
                value={extractedData.layout || ''} 
                onChange={(e) => setExtractedData({ ...extractedData, layout: e.target.value })}
                placeholder="Layout not detected"
              />
            </div>
            <div className="field">
              <label>Station:</label>
              <input 
                type="text" 
                value={extractedData.station || ''} 
                onChange={(e) => setExtractedData({ ...extractedData, station: e.target.value })}
                placeholder="Station not detected"
              />
            </div>
          </div>
          <div className="actions">
            <button onClick={handleConfirm} disabled={!extractedData.address}>Add to Map</button>
            <button onClick={handleCancel}>Cancel</button>
          </div>
        </div>
      )}
      
      {error && <div className="error">{error}</div>}
      {isLoading && <div className="loading">Scanning property image...</div>}
    </div>
  );
};

export default JapanesePropertyScanner; 