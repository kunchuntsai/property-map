import axios from 'axios';
import { mockProperties } from './mockData';

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
}

export const fetchProperties = async (): Promise<Property[]> => {
  // Comment out API call and return mock data for now
  // const response = await axios.get(`${API_URL}/properties`);
  // return response.data;
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