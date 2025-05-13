import type { Property } from './api';
import { geocodeAddress } from './geocodingService';

// Initially set with zero coordinates, will be updated by geocoding
export const mockProperties: Property[] = [
  {
    id: '1',
    address: '東京都品川区南大井三丁目11-14',
    price: 55000000, // 5,500万円
    bedrooms: 2, // Assumed based on size
    bathrooms: 1, // Assumed
    sqft: 452, // Converted from 42.00㎡
    lat: 0, // Will be filled by geocoding
    lng: 0, // Will be filled by geocoding
    propertyName: 'ルーブル大森八番館',
    floor: '6階部分',
    areaMeters: 42.00,
    areaTsubo: 12.70,
    isJapanese: true
  }
];

// Function to update mock properties with geocoded coordinates
export const updateMockPropertiesWithCoordinates = async (): Promise<void> => {
  for (const property of mockProperties) {
    try {
      const coordinates = await geocodeAddress(property.address);
      if (coordinates) {
        property.lat = coordinates.lat;
        property.lng = coordinates.lng;
        console.log(`Updated coordinates for ${property.propertyName}: ${coordinates.lat}, ${coordinates.lng}`);
      } else {
        console.warn(`Failed to geocode ${property.address}`);
      }
    } catch (error) {
      console.error(`Error geocoding ${property.address}:`, error);
    }
  }
}; 