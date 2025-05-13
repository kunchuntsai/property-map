import axios from 'axios';
import { mockProperties, updateMockPropertiesWithCoordinates } from './mockData';

const API_URL = 'http://localhost:3000/api';

export interface Property {
  id: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  lat: number;
  lng: number;
  // Japanese property specific fields
  propertyName?: string;  // 物件名
  floor?: string;         // 階数
  areaMeters?: number;    // 面積 (㎡)
  areaTsubo?: number;     // 面積 (坪)
  isJapanese?: boolean;   // Flag to indicate if it's a Japanese property
}

export const fetchProperties = async (): Promise<Property[]> => {
  // Comment out API call and return mock data for now
  // const response = await axios.get(`${API_URL}/properties`);
  // return response.data;
  
  // Update mock properties with geocoded coordinates
  await updateMockPropertiesWithCoordinates();
  
  console.log('Mock properties data (with geocoded coordinates):', mockProperties);
  return mockProperties;
};

export const fetchPropertyById = async (id: string): Promise<Property> => {
  // Comment out API call and return mock data for now
  // const response = await axios.get(`${API_URL}/properties/${id}`);
  // return response.data;
  const property = mockProperties.find(p => p.id === id);
  if (!property) throw new Error('Property not found');
  return property;
}; 