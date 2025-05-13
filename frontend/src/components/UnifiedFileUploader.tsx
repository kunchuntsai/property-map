import React, { useState, useRef } from 'react';
import { extractAddressesFromFile } from '../services/simpleFileExtractor';
import { extractPropertyAddressFromImage, extractPropertyData } from '../services/ocrExtractor';
import AddressValidator from './AddressValidator';
import type { Property } from '../services/api';

interface UnifiedFileUploaderProps {
  onPropertyExtracted: (property: Property) => void;
  onPropertiesExtracted: (properties: Property[]) => void;
}

interface JapanesePropertyListItem {
  name: string;
  address: string;
  floor?: string;
  size?: string;
  price?: string;
}

const UnifiedFileUploader: React.FC<UnifiedFileUploaderProps> = ({ 
  onPropertyExtracted,
  onPropertiesExtracted
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedAddresses, setExtractedAddresses] = useState<string[]>([]);
  const [extractedProperties, setExtractedProperties] = useState<JapanesePropertyListItem[]>([]);
  const [showValidator, setShowValidator] = useState(false);
  const [showPropertyList, setShowPropertyList] = useState(false);
  const [fileInfo, setFileInfo] = useState<{
    name: string;
    type: string;
    preview?: string;
  } | null>(null);
  const [extractedData, setExtractedData] = useState<{
    address: string | null;
    price: string | null;
    size: string | null;
    layout: string | null;
    station: string | null;
    buildingType: string | null;
    year: string | null;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    
    // Check if file is supported
    if (fileType !== 'application/pdf' && fileType !== 'text/plain' && 
        !fileType.startsWith('image/')) {
      setError('Please upload a PDF, text file, or image');
      return;
    }

    setFileInfo({
      name: file.name,
      type: fileType,
      preview: fileType.startsWith('image/') ? URL.createObjectURL(file) : undefined
    });
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Process file based on type
      if (fileType.startsWith('image/')) {
        // Process as Japanese property image
        const propertyData = await extractPropertyData(file);
        setExtractedData(propertyData);
        
        if (propertyData.address) {
          setExtractedAddresses([propertyData.address]);
          setShowValidator(true);
        } else {
          // Try to extract just the address as fallback
          const jpAddress = await extractPropertyAddressFromImage(file);
          if (jpAddress) {
            setExtractedAddresses([jpAddress]);
            setShowValidator(true);
          } else {
            setError('Could not detect Japanese address in the image');
          }
        }
      } else if (fileType === 'text/plain') {
        // Try to extract Japanese property details first
        const japaneseProperties = await extractJapanesePropertyList(file);
        
        if (japaneseProperties.length > 0) {
          // Found property details in Japanese format
          setExtractedProperties(japaneseProperties);
          setShowPropertyList(true);
        } else {
          // Fall back to address extraction
          const addresses = await extractAddressesFromFile(file);
          if (addresses.length > 0) {
            setExtractedAddresses(addresses);
            setShowValidator(true);
          } else {
            setError('No property information found in the file');
          }
        }
      } else {
        // For PDF files, extract addresses
        const addresses = await extractAddressesFromFile(file);
        
        if (addresses.length === 0) {
          setError('No property addresses found in the file');
        } else {
          setExtractedAddresses(addresses);
          setShowValidator(true);
        }
      }
    } catch (err) {
      setError(`Error processing file`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Extract property data from a Japanese property list text file
  const extractJapanesePropertyList = async (file: File): Promise<JapanesePropertyListItem[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const properties: JapanesePropertyListItem[] = [];
          
          // First method: Split by "物件名:" pattern
          // This is the expected format in list.txt
          const propertyBlocks = text.split(/物件名[:：]/);
          
          // Process each block (skip first which is empty or header)
          for (let i = 1; i < propertyBlocks.length; i++) {
            const block = propertyBlocks[i].trim();
            
            // Extract property details
            const nameMatch = block.match(/^(.+?)[\n]/);
            const addressMatch = block.match(/住所[:：]\s*([^\n]+)/);
            const floorMatch = block.match(/階数[:：]\s*([^\n]+)/);
            const sizeMatch = block.match(/面積[:：]\s*([^\n]+)/);
            const priceMatch = block.match(/価格[:：]\s*([^\n]+)/);
            
            if (addressMatch) {
              properties.push({
                name: nameMatch ? nameMatch[1].trim() : `Property ${i}`,
                address: addressMatch[1].trim(),
                floor: floorMatch ? floorMatch[1].trim() : undefined,
                size: sizeMatch ? sizeMatch[1].trim() : undefined,
                price: priceMatch ? priceMatch[1].trim() : undefined
              });
            }
          }
          
          // If no properties found yet, try alternative patterns
          if (properties.length === 0) {
            // Try looking for the pattern of alternating name/value pairs
            const lines = text.split('\n').filter(line => line.trim().length > 0);
            
            let currentProperty: Partial<JapanesePropertyListItem> = {};
            let hasAddress = false;
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim();
              
              // Look for key-value pairs
              if (line.includes(':') || line.includes('：')) {
                const [key, value] = line.split(/[:：]/).map(part => part.trim());
                
                if (key && value) {
                  if (key === '物件名' || key === 'マンション名') {
                    // If we were building a property and it has an address, save it
                    if (hasAddress && currentProperty.address) {
                      properties.push({
                        name: currentProperty.name || 'Unknown Property',
                        address: currentProperty.address,
                        floor: currentProperty.floor,
                        size: currentProperty.size,
                        price: currentProperty.price
                      });
                    }
                    
                    // Start a new property
                    currentProperty = { name: value };
                    hasAddress = false;
                  } else if (key === '住所' || key === '所在地') {
                    currentProperty.address = value;
                    hasAddress = true;
                  } else if (key === '階数') {
                    currentProperty.floor = value;
                  } else if (key === '面積') {
                    currentProperty.size = value;
                  } else if (key === '価格') {
                    currentProperty.price = value;
                  }
                }
              }
            }
            
            // Add the last property if it has an address
            if (hasAddress && currentProperty.address) {
              properties.push({
                name: currentProperty.name || 'Unknown Property',
                address: currentProperty.address,
                floor: currentProperty.floor,
                size: currentProperty.size,
                price: currentProperty.price
              });
            }
          }
          
          console.log("Extracted properties:", properties);
          resolve(properties);
        } catch (error) {
          console.error('Error parsing Japanese property list:', error);
          resolve([]);
        }
      };
      
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // Get map coordinates for Japanese properties
  const getMapCoordinates = (address: string): [number, number] => {
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

  const handlePropertyListConfirm = () => {
    try {
      setIsLoading(true);
      
      // Convert Japanese property list items to Property objects
      const properties = extractedProperties.map((item, index) => {
        // Parse price value from Japanese format (e.g., "3,780万円")
        let priceValue = 0;
        if (item.price) {
          // Remove non-numeric characters and convert to number
          const numericValue = item.price.replace(/[^0-9]/g, '');
          priceValue = parseInt(numericValue) * 10000; // Convert 万円 to regular yen
        }
        
        // Parse size value from text (e.g., "30.31㎡ (約9.16坪)")
        let sizeValue = 0;
        if (item.size) {
          // Extract the numeric part before m² or ㎡
          const numericMatch = item.size.match(/(\d+\.?\d*)/);
          if (numericMatch) {
            sizeValue = parseFloat(numericMatch[1]) * 10.7639; // Convert m² to sqft
          }
        }
        
        // Get coordinates based on the address
        const [lat, lng] = getMapCoordinates(item.address);
        
        // Create property with full details
        return {
          id: `jp-list-${Date.now()}-${index}`,
          address: item.name ? `${item.name} - ${item.address}` : item.address,
          price: priceValue || 37800000, // Default if not extracted
          bedrooms: 2, // Default for Japanese properties
          bathrooms: 1, 
          sqft: sizeValue || 307, // Default if not extracted
          lat,
          lng
        };
      });
      
      onPropertiesExtracted(properties);
      handleCancel();
    } catch (err) {
      setError('Error importing properties');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAddresses = async (validAddresses: string[]) => {
    try {
      setIsLoading(true);
      
      // Handle single Japanese property with detailed data
      if (fileInfo?.type.startsWith('image/') && extractedData && validAddresses.length === 1) {
        const address = validAddresses[0];
        
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
        const [lat, lng] = getMapCoordinates(address);
        
        // Create a property object with the extracted data
        const property: Property = {
          id: `property-${Date.now()}`,
          address,
          price: priceValue || 37800000, // Default if not extracted
          bedrooms: bedroomCount,
          bathrooms: 1, 
          sqft: sizeValue || 307, // Default if not extracted
          lat,
          lng
        };
        
        onPropertyExtracted(property);
      } else {
        // Multiple addresses or PDF/text file - convert to properties
        const properties = validAddresses.map((address, index) => {
          // For Japanese addresses, generate coordinates around Tokyo
          const isJapaneseAddress = /[一-龯]/.test(address) || address.includes('東京');
          
          const [lat, lng] = isJapaneseAddress 
            ? getMapCoordinates(address)
            : [37.7749 + (Math.random() - 0.5) * 0.1, -122.4194 + (Math.random() - 0.5) * 0.1];
          
          return {
            id: `file-${Date.now()}-${index}`,
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
      }
      
      // Reset state
      handleCancel();
    } catch (err) {
      setError('Error importing addresses');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setExtractedData(null);
    setExtractedAddresses([]);
    setExtractedProperties([]);
    setShowValidator(false);
    setShowPropertyList(false);
    setFileInfo(null);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Render property list validation view
  if (showPropertyList) {
    return (
      <div className="unified-file-uploader">
        <h2>Confirm Property List</h2>
        <p>Found {extractedProperties.length} properties in the file</p>
        
        <div className="property-list-preview">
          {extractedProperties.map((property, index) => (
            <div key={index} className="property-list-item">
              <h3>{property.name}</h3>
              <p><strong>住所:</strong> {property.address}</p>
              {property.price && <p><strong>価格:</strong> {property.price}</p>}
              {property.size && <p><strong>面積:</strong> {property.size}</p>}
              {property.floor && <p><strong>階数:</strong> {property.floor}</p>}
            </div>
          ))}
        </div>
        
        <div className="validation-actions">
          <button 
            className="btn-cancel" 
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button 
            className="btn-confirm" 
            onClick={handlePropertyListConfirm}
            disabled={extractedProperties.length === 0}
          >
            Import {extractedProperties.length} Properties
          </button>
        </div>
      </div>
    );
  }

  // Render address validation view
  if (showValidator) {
    return (
      <div className="unified-file-uploader">
        {fileInfo?.preview && (
          <div className="image-preview">
            <img src={fileInfo.preview} alt="Property preview" style={{ maxWidth: '100%', maxHeight: '200px' }} />
            {fileInfo.name && <p className="image-name">{fileInfo.name}</p>}
          </div>
        )}
        <AddressValidator 
          addresses={extractedAddresses}
          onConfirm={handleConfirmAddresses}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  // Render default upload view
  return (
    <div className="unified-file-uploader">
      <h2>Upload Property</h2>
      <div className="upload-container">
        <input
          type="file"
          accept=".pdf,.txt,.jpg,.jpeg,.png"
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
          {isLoading ? 'Processing...' : 'Upload Property File or Image'}
        </button>
        <p className="hint">Supports PDF, text, and images (including Japanese property listings)</p>
      </div>
      {error && <div className="error">{error}</div>}
      {isLoading && <div className="loading">Analyzing file...</div>}
    </div>
  );
};

export default UnifiedFileUploader; 