import React from 'react';
import type { Property } from '../services/api';

interface PropertyDetailProps {
  property: Property | null;
}

const PropertyDetail: React.FC<PropertyDetailProps> = ({ property }) => {
  if (!property) {
    return <div className="property-detail">Select a property to view details</div>;
  }

  // Determine if this is a Japanese property
  const isJapaneseProperty = 
    property.address.includes('東京') || 
    property.address.includes('Tokyo') ||
    property.address.includes('Japan') ||
    (property.lat > 35 && property.lat < 36 && property.lng > 139 && property.lng < 140);
  
  // Format price according to property location
  const formattedPrice = isJapaneseProperty 
    ? `¥${property.price.toLocaleString()}` 
    : `$${property.price.toLocaleString()}`;
    
  // Format area according to property location
  const formattedArea = isJapaneseProperty 
    ? `${(property.sqft / 10.7639).toFixed(2)}㎡` 
    : `${property.sqft.toLocaleString()} sqft`;
    
  // Format area label
  const areaLabel = isJapaneseProperty ? "Area (㎡)" : "Square Feet";

  return (
    <div className="property-detail">
      <h2>Property Details</h2>
      <h3>{formattedPrice}</h3>
      <p><strong>Address:</strong> {property.address}</p>
      <div className="property-specs">
        <div className="spec">
          <span className="value">{property.bedrooms}</span>
          <span className="label">Bedrooms</span>
        </div>
        <div className="spec">
          <span className="value">{property.bathrooms}</span>
          <span className="label">Bathrooms</span>
        </div>
        <div className="spec">
          <span className="value">{formattedArea}</span>
          <span className="label">{areaLabel}</span>
        </div>
      </div>
      <div className="location-info">
        <p><strong>Coordinates:</strong> {property.lat.toFixed(6)}, {property.lng.toFixed(6)}</p>
        {isJapaneseProperty && (
          <p><strong>Note:</strong> This is a Japanese property listing</p>
        )}
      </div>
    </div>
  );
};

export default PropertyDetail; 