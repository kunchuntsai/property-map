import { geocodeAddress } from './geocodingService';
import { mockProperties } from './mockData';

const API_URL = '/api';

// Define Property interface
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
  // Display fields for the formatted data
  sizeDisplay?: string;   // Display format of size (e.g., "30.31㎡ (約9.16坪)")
  priceDisplay?: string;  // Display format of price (e.g., "3,780万円")
  // Optional geocoded coordinates
  geocodedLat?: number;
  geocodedLng?: number;
  accuracyLevel?: 'HIGH' | 'MEDIUM' | 'LOW'; // To track geocoding accuracy
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

// Export properties to a JSON file for download
export const exportPropertiesToFile = (properties: Property[]): void => {
  try {
    // Create a JSON blob from the properties
    const data = JSON.stringify(properties, null, 2);
    const blob = new Blob([data], { type: 'application/json' });

    // Create a URL for the blob
    const url = URL.createObjectURL(blob);

    // Create a link element to trigger the download
    const link = document.createElement('a');
    link.href = url;
    link.download = `property-map-export-${new Date().toISOString().split('T')[0]}.json`;

    // Append the link to the body, click it, and remove it
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revoke the URL to free memory
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting properties:', error);
    throw new Error('Failed to export properties');
  }
};

// Import properties from a JSON file
export const importPropertiesFromFile = async (file: File): Promise<Property[]> => {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          if (!event.target || !event.target.result) {
            reject(new Error('Failed to read file'));
            return;
          }

          const properties = JSON.parse(event.target.result as string) as Property[];

          // Validate the imported data
          if (!Array.isArray(properties)) {
            reject(new Error('Invalid file format: data is not an array'));
            return;
          }

          // Check if each item has required property fields
          const isValid = properties.every(property => {
            return property.id && property.address &&
                  typeof property.lat === 'number' &&
                  typeof property.lng === 'number';
          });

          if (!isValid) {
            reject(new Error('Invalid property data format'));
            return;
          }

          // Generate new IDs to avoid conflicts with existing properties
          const importedProperties = properties.map(property => ({
            ...property,
            id: `imported-${property.id}-${Date.now()}`
          }));

          resolve(importedProperties);
        } catch (error) {
          console.error('Error parsing JSON:', error);
          reject(new Error('Invalid JSON file'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };

      reader.readAsText(file);
    } catch (error) {
      console.error('Error importing properties:', error);
      reject(new Error('Failed to import properties'));
    }
  });
};

// Generate a Google Maps URL with markers for all properties
export const generateGoogleMapsUrl = async (properties: Property[], listName: string = "Property List"): Promise<string> => {
  try {
    if (properties.length === 0) {
      return 'https://www.google.com/maps';
    }

    console.log("Generating Google Maps URL for properties:", properties.length);

    // Helper function to get valid coordinates, identical to the one used in createGoogleMyMap
    const getValidCoordinates = (property: Property) => {
      // Define Japan's coordinate ranges
      const JAPAN_LAT_MIN = 30;
      const JAPAN_LAT_MAX = 46;
      const JAPAN_LNG_MIN = 129;
      const JAPAN_LNG_MAX = 146;

      // Check if original coordinates are in Japan's range
      const originalInJapanRange =
        isFinite(property.lat) && isFinite(property.lng) &&
        property.lat >= JAPAN_LAT_MIN && property.lat <= JAPAN_LAT_MAX &&
        property.lng >= JAPAN_LNG_MIN && property.lng <= JAPAN_LNG_MAX;

      // Check if swapped coordinates would be in Japan's range
      const swappedInJapanRange =
        isFinite(property.lat) && isFinite(property.lng) &&
        property.lng >= JAPAN_LAT_MIN && property.lng <= JAPAN_LAT_MAX &&
        property.lat >= JAPAN_LNG_MIN && property.lat <= JAPAN_LNG_MAX;

      // If it's a Japanese property and coordinates appear swapped, swap them
      if ((property.isJapanese ||
           property.address.includes('東京') ||
           property.address.includes('Tokyo') ||
           property.address.includes('Japan')) &&
          swappedInJapanRange && !originalInJapanRange) {
        return { lat: property.lng, lng: property.lat };
      }

      // Otherwise use original coordinates
      return { lat: property.lat, lng: property.lng };
    };

    // Let's create a URL that uses Google Maps directions with multiple stops
    // This is more reliable for showing multiple locations than the search URL
    let url = 'https://www.google.com/maps/dir/';

    // Add origin (first property)
    const firstProperty = properties[0];
    const firstCoords = getValidCoordinates(firstProperty);

    // Google Maps URL format is "latitude,longitude" for coordinates
    url += `${firstCoords.lat.toFixed(6)},${firstCoords.lng.toFixed(6)}/`;

    console.log(`First property coordinates: lat=${firstCoords.lat}, lng=${firstCoords.lng}`);

    // Add all other properties as waypoints
    // Skip the first one as it's already the origin
    for (let i = 1; i < properties.length; i++) {
      const property = properties[i];
      const coords = getValidCoordinates(property);

      console.log(`Property ${i} coordinates: lat=${coords.lat}, lng=${coords.lng}`);
      url += `${coords.lat.toFixed(6)},${coords.lng.toFixed(6)}/`;
    }

    // Add the list name as a query parameter
    url += `?title=${encodeURIComponent(listName)}`;

    // Add optimization parameter (avoid optimizing the route to preserve order)
    url += '&travelmode=driving&dir_action=navigate&optimize=false';

    console.log("Generated URL:", url);
    return url;
  } catch (error) {
    console.error('Error generating Google Maps URL:', error);
    return 'https://www.google.com/maps';
  }
};

// Direct integration with Google My Maps
export const createGoogleMyMap = async (properties: Property[], listName: string = "Property List"): Promise<string> => {
  try {
    // Create the KML content directly without saving to file first
    let kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <n>${listName}</n>
    <description>Property list created by PropertyMap</description>`;

    // Helper function to get valid coordinates, similar to the one in GoogleMap component
    const getValidCoordinates = (property: Property) => {
      // Define Japan's coordinate ranges
      const JAPAN_LAT_MIN = 30;
      const JAPAN_LAT_MAX = 46;
      const JAPAN_LNG_MIN = 129;
      const JAPAN_LNG_MAX = 146;

      // Check if original coordinates are in Japan's range
      const originalInJapanRange =
        isFinite(property.lat) && isFinite(property.lng) &&
        property.lat >= JAPAN_LAT_MIN && property.lat <= JAPAN_LAT_MAX &&
        property.lng >= JAPAN_LNG_MIN && property.lng <= JAPAN_LNG_MAX;

      // Check if swapped coordinates would be in Japan's range
      const swappedInJapanRange =
        isFinite(property.lat) && isFinite(property.lng) &&
        property.lng >= JAPAN_LAT_MIN && property.lng <= JAPAN_LAT_MAX &&
        property.lat >= JAPAN_LNG_MIN && property.lat <= JAPAN_LNG_MAX;

      // If it's a Japanese property and coordinates appear swapped, swap them
      if ((property.isJapanese ||
           property.address.includes('東京') ||
           property.address.includes('Tokyo') ||
           property.address.includes('Japan')) &&
          swappedInJapanRange && !originalInJapanRange) {
        return { lat: property.lng, lng: property.lat };
      }

      // Otherwise use original coordinates
      return { lat: property.lat, lng: property.lng };
    };

    // Add each property as a placemark
    properties.forEach(property => {
      // Get the correct coordinates
      const coords = getValidCoordinates(property);

      // Log coordinates for debugging
      console.log(`KML export: Property ${property.propertyName || property.address}: lat=${coords.lat}, lng=${coords.lng}`);

      const name = property.propertyName || property.address;
      const description = [
        property.address,
        property.isJapanese ? (property.floor || '') : `${property.bedrooms} bed, ${property.bathrooms} bath`,
        property.isJapanese ?
          (property.areaMeters ? `${property.areaMeters}㎡${property.areaTsubo ? ` (約${property.areaTsubo.toFixed(2)}坪)` : ''}` : '') :
          (property.sqft ? `${property.sqft} sqft` : ''),
        property.price ? `Price: ${property.isJapanese ? (property.price / 10000) + '万円' : '$' + property.price.toLocaleString()}` : ''
      ].filter(Boolean).join('\n');

      kmlContent += `\n    <Placemark>\n      <n>${name}</n>\n      <description>${description}</description>\n      <Point>\n        <coordinates>${coords.lng},${coords.lat},0</coordinates>\n      </Point>\n    </Placemark>`;
    });

    // Close KML tags
    kmlContent += `
  </Document>
</kml>`;

    // Create a Blob from the KML content
    const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });

    // Create a URL for the blob
    const blobUrl = URL.createObjectURL(blob);

    // Create the Google My Maps URL with import parameters
    const encodedName = encodeURIComponent(listName);

    // This URL format will open Google My Maps
    const myMapsUrl = `https://www.google.com/maps/d/u/0/`;

    // Since direct file import via URL isn't possible due to browser security,
    // we'll use a simpler approach - open My Maps and guide the user
    return myMapsUrl;
  } catch (error) {
    console.error('Error creating Google My Maps URL:', error);
    return 'https://www.google.com/maps/d/u/0/';
  }
};

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