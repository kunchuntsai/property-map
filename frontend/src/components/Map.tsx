import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Property } from '../services/api';
import L from 'leaflet';

// Fix Leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Component to handle map recenter when properties change
const MapUpdater = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  
  return null;
};

interface MapProps {
  properties: Property[];
  onSelectProperty: (property: Property) => void;
}

const PropertyMap = ({ properties, onSelectProperty }: MapProps) => {
  // Determine map center based on properties
  const mapSettings = useMemo(() => {
    // Default to San Francisco
    let center: [number, number] = [37.7749, -122.4194];
    let zoom = 13;
    
    if (properties.length > 0) {
      // Check if we have Japanese properties
      const japaneseProperties = properties.filter(p => 
        p.address.includes('東京') || 
        p.address.includes('Tokyo') ||
        p.address.includes('Japan') ||
        (p.lat > 35 && p.lat < 36 && p.lng > 139 && p.lng < 140)
      );
      
      if (japaneseProperties.length > 0) {
        // If we have Japanese properties, center on Tokyo
        const latSum = japaneseProperties.reduce((sum, prop) => sum + prop.lat, 0);
        const lngSum = japaneseProperties.reduce((sum, prop) => sum + prop.lng, 0);
        
        center = [
          latSum / japaneseProperties.length, 
          lngSum / japaneseProperties.length
        ];
        zoom = 14; // Zoom in a bit more for city properties
      } else {
        // Otherwise, center on all properties
        const latSum = properties.reduce((sum, prop) => sum + prop.lat, 0);
        const lngSum = properties.reduce((sum, prop) => sum + prop.lng, 0);
        
        center = [
          latSum / properties.length, 
          lngSum / properties.length
        ];
      }
    }
    
    return { center, zoom };
  }, [properties]);

  return (
    <MapContainer 
      center={mapSettings.center} 
      zoom={mapSettings.zoom} 
      style={{ height: '100%', width: '100%' }}
    >
      <MapUpdater center={mapSettings.center} zoom={mapSettings.zoom} />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {properties.map((property) => {
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
          
        return (
          <Marker 
            key={property.id} 
            position={[property.lat, property.lng]}
            eventHandlers={{
              click: () => onSelectProperty(property)
            }}
          >
            <Popup>
              <div>
                <h3>{formattedPrice}</h3>
                <p>{property.address}</p>
                <p>{property.bedrooms} bd | {property.bathrooms} ba | {property.sqft} sqft</p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

export default PropertyMap; 