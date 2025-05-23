import config from '../config';
import type { Property } from './api';

// Interface for geocoded property with coordinates
export interface GeocodedProperty extends Property {
  geocoded?: boolean;
}

/**
 * Geocodes a single address using Google Maps Geocoding API
 * @param address The address to geocode
 * @returns Promise with lat/lng coordinates
 */
export const geocodeAddress = async (address: string): Promise<{lat: number, lng: number} | null> => {
  try {
    // For Japanese addresses, append Japan to ensure better results
    let searchAddress = address;
    if (!searchAddress.includes('Japan') && !searchAddress.includes('日本')) {
      searchAddress += ', Japan';
    }

    // Use the browser's Geocoder if available (when Google Maps API is loaded)
    if (window.google && window.google.maps && window.google.maps.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();

      return new Promise((resolve, reject) => {
        geocoder.geocode({ address: searchAddress }, (results, status) => {
          if (status === 'OK' && results && results[0] && results[0].geometry) {
            const location = results[0].geometry.location;
            resolve({
              lat: location.lat(),
              lng: location.lng()
            });
          } else {
            console.warn(`Geocoding failed for ${address}: ${status}`);
            reject(new Error(`Geocoding failed: ${status}`));
          }
        });
      });
    }

    // Fallback to using Google Maps Geocoding API directly
    const apiKey = config.googleMapsApiKey;
    const encodedAddress = encodeURIComponent(searchAddress);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results[0]) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng
      };
    }

    console.warn(`Direct geocoding failed for ${address}: ${data.status}`);
    return null;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
};

/**
 * Geocodes multiple properties, adding coordinates to each
 * @param properties Array of properties to geocode
 * @returns Promise with geocoded properties
 */
export const geocodeProperties = async (properties: Property[]): Promise<GeocodedProperty[]> => {
  const geocodedProperties: GeocodedProperty[] = [];

  for (const property of properties) {
    try {
      // Skip if property already has coordinates
      if (isFinite(property.lat) && isFinite(property.lng) &&
          property.lat !== 0 && property.lng !== 0) {
        geocodedProperties.push({
          ...property,
          geocoded: false // Mark that we're using original coordinates
        });
        continue;
      }

      // Geocode the address
      const coordinates = await geocodeAddress(property.address);

      if (coordinates) {
        geocodedProperties.push({
          ...property,
          lat: coordinates.lat,
          lng: coordinates.lng,
          geocoded: true
        });
        console.log(`Geocoded ${property.address} to:`, coordinates);
      } else {
        // If geocoding fails, add property without coordinates
        geocodedProperties.push({
          ...property,
          geocoded: false
        });
        console.warn(`Could not geocode address: ${property.address}`);
      }
    } catch (error) {
      console.error(`Error geocoding property ${property.id}:`, error);
      geocodedProperties.push({
        ...property,
        geocoded: false
      });
    }
  }

  return geocodedProperties;
};

/**
 * Parses a Japanese property listing text and extracts property information
 * @param text The property listing text
 * @returns Extracted property data
 */
export const parseJapanesePropertyListing = (text: string): Partial<Property>[] => {
  console.log('Parsing Japanese property listing text:', text);
  const properties: Partial<Property>[] = [];
  const propertyBlocks = text.split(/\n\s*\n/); // Split by double newlines

  propertyBlocks.forEach(block => {
    if (!block.trim()) return;

    const lines = block.split('\n');
    const property: Partial<Property> = {
      isJapanese: true
    };

    console.log('Processing property block:', block);

    lines.forEach(line => {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('物件名:')) {
        property.propertyName = trimmedLine.replace('物件名:', '').trim();
      } else if (trimmedLine.startsWith('住所:')) {
        property.address = trimmedLine.replace('住所:', '').trim();
      } else if (trimmedLine.startsWith('階数:')) {
        property.floor = trimmedLine.replace('階数:', '').trim();
      } else if (trimmedLine.startsWith('面積:')) {
        // Extract square meters
        const match = trimmedLine.match(/(\d+\.?\d*)㎡/);
        if (match && match[1]) {
          const areaMeters = parseFloat(match[1]);
          property.areaMeters = areaMeters;
          // Convert to sqft (1 sq meter = 10.764 sq ft)
          property.sqft = Math.round(areaMeters * 10.764);

          // Extract tsubo if available
          const tsuboMatch = trimmedLine.match(/\((?:約)?(\d+\.?\d*)坪\)/);
          if (tsuboMatch && tsuboMatch[1]) {
            property.areaTsubo = parseFloat(tsuboMatch[1]);
          } else {
            // Calculate tsubo if not provided (1 tsubo ≈ 3.306 sq meters)
            property.areaTsubo = parseFloat((areaMeters / 3.306).toFixed(2));
          }

          console.log('Extracted area data:', {
            areaMeters: property.areaMeters,
            areaTsubo: property.areaTsubo,
            sqft: property.sqft
          });
        }
      } else if (trimmedLine.startsWith('価格:')) {
        // Extract price in 万円 and convert to JPY
        const match = trimmedLine.match(/(\d+[,\d]*)万円/);
        if (match && match[1]) {
          // Remove commas and convert to number
          const priceInMan = parseFloat(match[1].replace(/,/g, ''));
          // Convert to JPY (1万 = 10,000)
          property.price = priceInMan * 10000;
        }
      }
    });

    // Only add if we have at least an address
    if (property.address) {
      // Generate an ID if not present
      if (!property.id) {
        property.id = Math.random().toString(36).substring(2, 11);
      }

      // Set default values for required fields
      property.bedrooms = property.bedrooms || 1;
      property.bathrooms = property.bathrooms || 1;

      // If sqft is not set but areaMeters is, calculate it
      if (!property.sqft && property.areaMeters) {
        property.sqft = Math.round(property.areaMeters * 10.764);
      }

      // If areaMeters is not set but sqft is, calculate it
      if (!property.areaMeters && property.sqft) {
        property.areaMeters = parseFloat((property.sqft / 10.764).toFixed(2));
        // Calculate tsubo if not provided (1 tsubo ≈ 3.306 sq meters)
        property.areaTsubo = parseFloat((property.areaMeters / 3.306).toFixed(2));
      }

      console.log('Final property object:', property);
      properties.push(property);
    }
  });

  return properties;
};

/**
 * Process a text block of Japanese property listings, parse and geocode them
 * @param text Block of property listing text
 * @returns Promise with geocoded properties
 */
export const processJapanesePropertyListings = async (text: string): Promise<Property[]> => {
  // Parse properties from text
  const parsedProperties = parseJapanesePropertyListing(text);

  // Convert to Property type array with default values for required fields
  const properties: Property[] = parsedProperties.map(prop => ({
    id: prop.id || Math.random().toString(36).substring(2, 11),
    address: prop.address || '',
    price: prop.price || 0,
    bedrooms: prop.bedrooms || 1,
    bathrooms: prop.bathrooms || 1,
    sqft: prop.sqft || 0,
    lat: 0, // Will be set by geocoding
    lng: 0, // Will be set by geocoding
    propertyName: prop.propertyName,
    floor: prop.floor,
    areaMeters: prop.areaMeters,
    areaTsubo: prop.areaTsubo,
    isJapanese: true
  }));

  console.log("Properties before geocoding:", properties);

  // Geocode all properties
  const geocodedProperties = await geocodeProperties(properties);

  // Validate coordinates to ensure they're in the right range for Japan
  const validatedProperties = geocodedProperties.map(prop => {
    console.log(`Validating coordinates for ${prop.propertyName || prop.address}`);
    console.log(`Current coords: lat=${prop.lat}, lng=${prop.lng}`);

    // Check if coordinates appear to be in the wrong order
    // Japan is roughly between 30-46°N latitude and 129-146°E longitude
    const japanLatRange = prop.lat >= 30 && prop.lat <= 46;
    const japanLngRange = prop.lng >= 129 && prop.lng <= 146;
    const reversedJapanLatRange = prop.lng >= 30 && prop.lng <= 46;
    const reversedJapanLngRange = prop.lat >= 129 && prop.lat <= 146;

    // Check for coordinates likely swapped
    const possiblySwapped =
      isFinite(prop.lat) && isFinite(prop.lng) &&
      !japanLatRange && !japanLngRange && // Current values not in Japan's ranges
      reversedJapanLatRange && reversedJapanLngRange; // But they would be if swapped

    if (possiblySwapped) {
      console.log("Coordinates appear to be swapped, correcting order");
      // Swap coordinates to correct order
      const tempLat = prop.lat;
      prop.lat = prop.lng;
      prop.lng = tempLat;

      console.log(`Swapped coords: lat=${prop.lat}, lng=${prop.lng}`);
    }

    // If coordinates are still invalid, use approximate based on Tokyo area
    if (!isFinite(prop.lat) || !isFinite(prop.lng) ||
        !(prop.lat >= 30 && prop.lat <= 46) || // Outside Japan latitude range
        !(prop.lng >= 129 && prop.lng <= 146)) { // Outside Japan longitude range

      console.log("Setting default Tokyo area coordinates");
      // Use coordinates in central Tokyo with slight randomization
      prop.lat = 35.6762 + (Math.random() - 0.5) * 0.05;
      prop.lng = 139.6503 + (Math.random() - 0.5) * 0.05;
    }

    console.log(`Final coords: lat=${prop.lat}, lng=${prop.lng}`);
    return prop;
  });

  return validatedProperties;
};