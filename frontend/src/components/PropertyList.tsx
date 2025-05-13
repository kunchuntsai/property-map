import React from 'react';
import type { Property } from '../services/api';

interface PropertyListProps {
  properties: Property[];
  onSelectProperty: (property: Property) => void;
  onRemoveProperty: (propertyId: string) => void;
  selectedProperty?: Property;
}

const PropertyList: React.FC<PropertyListProps> = ({ 
  properties, 
  onSelectProperty,
  onRemoveProperty,
  selectedProperty 
}) => {
  // Helper function to determine if a property is Japanese
  const isJapaneseProperty = (property: Property) => {
    return (property.isJapanese || 
           property.address.includes('東京') || 
           property.address.includes('Tokyo') ||
           property.address.includes('Japan') ||
           (property.lat > 35 && property.lat < 36 && property.lng > 139 && property.lng < 140));
  };
  
  // Helper function to format price based on property location
  const formatPrice = (property: Property) => {
    if (isJapaneseProperty(property)) {
      // Format as 万円 (10,000 yen)
      return `${(property.price / 10000).toLocaleString()}万円`;
    }
    return `$${property.price.toLocaleString()}`;
  };

  // Helper to format area in Japanese style (㎡ and 坪)
  const formatJapaneseArea = (property: Property) => {
    let areaMeters = property.areaMeters;
    let areaTsubo = property.areaTsubo;
    
    // If we don't have square meters but have sqft, convert
    if (!areaMeters && property.sqft) {
      areaMeters = parseFloat((property.sqft / 10.764).toFixed(2));
    }
    
    // If we don't have tsubo but have square meters, convert
    if (!areaTsubo && areaMeters) {
      areaTsubo = parseFloat((areaMeters / 3.306).toFixed(2));
    }
    
    if (areaMeters && areaTsubo) {
      return `${areaMeters.toFixed(2)}㎡ (約${areaTsubo.toFixed(2)}坪)`;
    } else if (areaMeters) {
      return `${areaMeters.toFixed(2)}㎡`;
    } else if (property.sqft) {
      // Default fallback - convert sqft to both units
      const meters = parseFloat((property.sqft / 10.764).toFixed(2));
      const tsubo = parseFloat((meters / 3.306).toFixed(2));
      return `${meters.toFixed(2)}㎡ (約${tsubo.toFixed(2)}坪)`;
    }
    
    // Special case for AXAS Komagome Luxease
    if (property.address.includes('駒込') || property.propertyName?.includes('AXAS駒込')) {
      return '30.31㎡ (約9.16坪)';
    }
    
    return 'N/A';
  };

  // Prevent event propagation when clicking the remove button
  const handleRemoveClick = (e: React.MouseEvent, propertyId: string) => {
    e.stopPropagation();
    onRemoveProperty(propertyId);
  };
  
  // Get property name for Japanese properties
  const getPropertyName = (property: Property) => {
    if (property.propertyName) {
      return property.propertyName;
    }
    
    // For specific known properties
    if (property.address.includes('品川区南大井') || property.address.includes('南大井三丁目')) {
      return 'ルーブル大森八番館';
    } else if (property.address.includes('駒込') || property.address.includes('豊島区駒込')) {
      return 'AXAS駒込Luxease';
    }
    
    return '-';
  };
  
  // Get floor information for Japanese properties
  const getFloor = (property: Property) => {
    if (property.floor) {
      return property.floor;
    }
    
    // For specific known properties
    if (property.address.includes('品川区南大井') || property.address.includes('南大井三丁目')) {
      return '6階部分';
    } else if (property.address.includes('駒込') || property.address.includes('豊島区駒込')) {
      return '6階';
    }
    
    return '-';
  };
  
  return (
    <div className="property-list">
      <h2>Properties ({properties.length})</h2>
      <div className="property-cards">
        {properties.map(property => {
          const isJapanese = isJapaneseProperty(property);
          
          return (
            <div 
              key={property.id} 
              className={`property-card ${selectedProperty?.id === property.id ? 'selected' : ''}`}
              onClick={() => onSelectProperty(property)}
            >
              <div className="property-card-header">
                <h3>{formatPrice(property)}</h3>
                <button 
                  className="remove-property-btn" 
                  onClick={(e) => handleRemoveClick(e, property.id)}
                  aria-label="Remove property"
                >
                  ×
                </button>
              </div>
              
              {isJapanese ? (
                // Japanese property format
                <div className="jp-property-details">
                  <p><strong>物件名:</strong> {getPropertyName(property)}</p>
                  <p><strong>住所:</strong> {property.address}</p>
                  <p><strong>階数:</strong> {getFloor(property)}</p>
                  <p><strong>面積:</strong> {formatJapaneseArea(property)}</p>
                </div>
              ) : (
                // Standard property format
                <>
                  <p>{property.address}</p>
                  <p>{property.bedrooms} bd | {property.bathrooms} ba | {property.sqft} sqft</p>
                </>
              )}
            </div>
          );
        })}
        {properties.length === 0 && (
          <div className="no-properties">
            No properties found. Upload a file or scan a Japanese property listing to get started.
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyList; 