import React, { useEffect } from 'react';
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
  // Log properties for debugging
  useEffect(() => {
    console.log('PropertyList received properties:', properties);
  }, [properties]);

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
    console.log('Formatting area for property:', property.id, property.propertyName);
    console.log('Area data:', {
      areaMeters: property.areaMeters,
      areaTsubo: property.areaTsubo,
      sqft: property.sqft
    });
    
    // First check if we have area in square meters
    if (property.areaMeters) {
      const areaTsubo = property.areaTsubo || (property.areaMeters / 3.306);
      return `${property.areaMeters.toFixed(2)}㎡ (約${areaTsubo.toFixed(2)}坪)`;
    }
    
    // If no areaMeters but have sqft, convert
    if (property.sqft && property.sqft > 0) {
      const meters = property.sqft / 10.764;
      const tsubo = meters / 3.306;
      return `${meters.toFixed(2)}㎡ (約${tsubo.toFixed(2)}坪)`;
    }
    
    // If we can parse areaMeters from the floor field as a fallback
    // Sometimes area might be included in the floor description
    if (property.floor && property.floor.includes('㎡')) {
      const match = property.floor.match(/(\d+\.?\d*)㎡/);
      if (match && match[1]) {
        const areaMeters = parseFloat(match[1]);
        const areaTsubo = areaMeters / 3.306;
        return `${areaMeters.toFixed(2)}㎡ (約${areaTsubo.toFixed(2)}坪)`;
      }
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
    return property.propertyName || '-';
  };
  
  // Get floor information for Japanese properties
  const getFloor = (property: Property) => {
    return property.floor || '-';
  };
  
  // Fix and normalize property data if necessary
  const normalizePropertyData = (property: Property) => {
    // Ensure all required properties exist
    if (property.isJapanese && !property.areaMeters && property.sqft && property.sqft > 0) {
      // If missing areaMeters but have sqft, calculate it
      property.areaMeters = +(property.sqft / 10.764).toFixed(2);
      property.areaTsubo = +(property.areaMeters / 3.306).toFixed(2);
    }
    return property;
  };
  
  return (
    <div className="property-list">
      <h2>Properties ({properties.length})</h2>
      <div className="property-cards">
        {properties.map(property => {
          const isJapanese = isJapaneseProperty(property);
          const normalizedProperty = normalizePropertyData(property);
          
          return (
            <div 
              key={property.id} 
              className={`property-card ${selectedProperty?.id === property.id ? 'selected' : ''}`}
              onClick={() => onSelectProperty(property)}
            >
              <div className="property-card-header">
                <h3>{formatPrice(normalizedProperty)}</h3>
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
                  <p><strong>物件名:</strong> {getPropertyName(normalizedProperty)}</p>
                  <p><strong>住所:</strong> {normalizedProperty.address}</p>
                  <p><strong>階数:</strong> {getFloor(normalizedProperty)}</p>
                  <p><strong>面積:</strong> {formatJapaneseArea(normalizedProperty)}</p>
                </div>
              ) : (
                // Standard property format
                <>
                  <p>{normalizedProperty.address}</p>
                  <p>{normalizedProperty.bedrooms} bd | {normalizedProperty.bathrooms} ba | {normalizedProperty.sqft} sqft</p>
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