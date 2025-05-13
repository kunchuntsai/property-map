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
    return property.address.includes('東京') || 
           property.address.includes('Tokyo') ||
           property.address.includes('Japan') ||
           (property.lat > 35 && property.lat < 36 && property.lng > 139 && property.lng < 140);
  };
  
  // Helper function to format price based on property location
  const formatPrice = (property: Property) => {
    return isJapaneseProperty(property)
      ? `¥${property.price.toLocaleString()}`
      : `$${property.price.toLocaleString()}`;
  };

  // Prevent event propagation when clicking the remove button
  const handleRemoveClick = (e: React.MouseEvent, propertyId: string) => {
    e.stopPropagation();
    onRemoveProperty(propertyId);
  };
  
  return (
    <div className="property-list">
      <h2>Properties ({properties.length})</h2>
      <div className="property-cards">
        {properties.map(property => (
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
            <p>{property.address}</p>
            <p>{property.bedrooms} bd | {property.bathrooms} ba | {property.sqft} sqft</p>
          </div>
        ))}
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