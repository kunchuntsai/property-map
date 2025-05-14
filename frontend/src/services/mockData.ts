import type { Property } from './api';

// Initially set with zero coordinates, will be updated by geocoding
// tokyo station: 35.6812,139.7671
// correct: 35.59090176233874, 139.7348277632899
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
  },
  {
    id: '2',
    address: '東京都豊島区駒込1-16-8',
    price: 37800000, // 3,780万円
    bedrooms: 1,
    bathrooms: 1,
    sqft: 326, // Converted from 30.31㎡
    lat: 0, // Will be filled by geocoding
    lng: 0, // Will be filled by geocoding
    propertyName: 'AXAS駒込Luxease',
    floor: '6階',
    areaMeters: 30.31,
    areaTsubo: 9.16,
    isJapanese: true
  }
];