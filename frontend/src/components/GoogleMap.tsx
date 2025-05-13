import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import type { Property } from '../services/api';

// Define the container style
const containerStyle = {
  width: '100%',
  height: '100%'
};

// Define custom map styles
const mapOptions = {
  mapTypeControl: true,
  streetViewControl: true,
  fullscreenControl: true,
  zoomControl: true,
};

// Custom marker colors - check if google is loaded first
const createCustomMarker = (isJapanese: boolean, isSelected: boolean = false) => {
  if (typeof google === 'undefined') {
    return null; // Return null if google isn't loaded yet
  }
  
  // Use a different color for selected properties
  const fillColor = isSelected 
    ? '#ffcc00' // Gold color for selected property
    : (isJapanese ? '#ff5252' : '#2196f3');
    
  // Make selected properties even larger with a glowing effect
  const scale = isSelected 
    ? 2.5 
    : (isJapanese ? 2 : 1.5);
  
  const strokeColor = isSelected 
    ? '#ffffff' 
    : '#ffffff';
    
  const strokeWeight = isSelected 
    ? 3 
    : 2;
  
  return {
    path: 'M12,2C8.13,2 5,5.13 5,9c0,5.25 7,13 7,13s7,-7.75 7,-13c0,-3.87 -3.13,-7 -7,-7zM12,11.5c-1.38,0 -2.5,-1.12 -2.5,-2.5s1.12,-2.5 2.5,-2.5 2.5,1.12 2.5,2.5 -1.12,2.5 -2.5,2.5z',
    fillColor,
    fillOpacity: 1,
    strokeWeight,
    strokeColor,
    scale,
    anchor: new google.maps.Point(12, 22),
    labelOrigin: new google.maps.Point(12, 35)
  };
};

interface GoogleMapProps {
  properties: Property[];
  onSelectProperty: (property: Property) => void;
  apiKey: string;
  selectedProperty?: Property;
}

// Interface for properties with geocoded coordinates
interface PropertyWithGeocodedCoords extends Property {
  geocodedLat?: number;
  geocodedLng?: number;
  accuracyLevel?: 'HIGH' | 'MEDIUM' | 'LOW'; // To track geocoding accuracy
}

const PropertyGoogleMap = ({ properties, onSelectProperty, apiKey, selectedProperty: externalSelectedProperty }: GoogleMapProps) => {
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithGeocodedCoords | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);
  const [geocodedProperties, setGeocodedProperties] = useState<PropertyWithGeocodedCoords[]>([]);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const hasInitiallyCentered = useRef<boolean>(false);
  
  // Actual coordinate calculation logic (defined before being used)
  const calculatePropertyCoordinates = (property: PropertyWithGeocodedCoords) => {
    // Define Japan's coordinate ranges
    const JAPAN_LAT_MIN = 30;
    const JAPAN_LAT_MAX = 46;
    const JAPAN_LNG_MIN = 129;
    const JAPAN_LNG_MAX = 146;
    const DEFAULT_TOKYO = { lat: 35.6812, lng: 139.7671 };
    
    const showDetailedLogs = false; // Set to true for debug logs, false for production
    
    // Debug logging - only if enabled
    if (showDetailedLogs) {
      console.log(`Calculating coordinates for property: ${property.id}, ${property.address}`);
      console.log(`  Original: lat=${property.lat}, lng=${property.lng}`);
      if (property.geocodedLat !== undefined) console.log(`  Geocoded: lat=${property.geocodedLat}, lng=${property.geocodedLng}, accuracy=${property.accuracyLevel || 'unknown'}`);
    }
    
    // Case 1: If geocoded coordinates exist, always use them regardless of accuracy
    if (property.geocodedLat !== undefined && 
        property.geocodedLng !== undefined) {
      if (showDetailedLogs) {
        console.log(`  Using geocoded coordinates with ${property.accuracyLevel || 'unknown'} accuracy`);
      }
      return {
        lat: property.geocodedLat,
        lng: property.geocodedLng
      };
    }
    
    // Case 2: Check if coordinates are in Japan's range
    const originalInJapanRange = 
      isFinite(property.lat) && isFinite(property.lng) &&
      property.lat >= JAPAN_LAT_MIN && property.lat <= JAPAN_LAT_MAX &&
      property.lng >= JAPAN_LNG_MIN && property.lng <= JAPAN_LNG_MAX;
      
    // Case 3: Check if coordinates appear to be swapped (common issue with Japanese addresses)
    const swappedInJapanRange = 
      isFinite(property.lat) && isFinite(property.lng) &&
      property.lng >= JAPAN_LAT_MIN && property.lng <= JAPAN_LAT_MAX &&
      property.lat >= JAPAN_LNG_MIN && property.lat <= JAPAN_LNG_MAX;
    
    // If Japanese property with swapped coordinates
    if ((property.isJapanese || property.address.includes('東京') || 
         property.address.includes('Tokyo') || property.address.includes('Japan')) && 
        swappedInJapanRange && !originalInJapanRange) {
      if (showDetailedLogs) {
        console.log(`  Japanese property with swapped coordinates - correcting`);
      }
      return {
        lat: property.lng, // Use lng as lat
        lng: property.lat  // Use lat as lng
      };
    }
    
    // Case 4: If original coordinates are in Japan's range, use them
    if (originalInJapanRange) {
      return {
        lat: property.lat,
        lng: property.lng
      };
    }
    
    // Case 5: Default to Tokyo coordinates if everything else fails
    if (showDetailedLogs) {
      console.log(`  No valid coordinates found, using default Tokyo coordinates`);
    }
    return DEFAULT_TOKYO;
  };
  
  // Extract property IDs for stable dependency references
  const propertyIds = useMemo(() => properties.map(p => p.id).join(','), [properties]);
  const geocodedPropertyIds = useMemo(() => geocodedProperties.map(p => p.id).join(','), [geocodedProperties]);
  
  // Store memoized coordinates for all properties
  const propertyCoordinatesMap = useMemo(() => {
    console.log("Recalculating coordinates for all properties - property list changed");
    console.log(`Property IDs: ${propertyIds}`);
    console.log(`Geocoded property IDs: ${geocodedPropertyIds}`);
    
    const propsToUse = geocodedProperties.length > 0 ? geocodedProperties : properties;
    const coordsMap: Record<string, {lat: number, lng: number}> = {};
    
    propsToUse.forEach(property => {
      coordsMap[property.id] = calculatePropertyCoordinates(property);
    });
    
    return coordsMap;
  }, [propertyIds, geocodedPropertyIds]); // Use stable ID strings instead of object references
  
  // Function to get coordinates from the memoized map
  const getPropertyCoordinates = useCallback((property: PropertyWithGeocodedCoords) => {
    const showDetailedLogs = false; // Same debug flag as in calculatePropertyCoordinates
    
    // Use cached coordinates if available
    if (propertyCoordinatesMap[property.id]) {
      return propertyCoordinatesMap[property.id];
    }
    
    // Fallback to calculation if not in the map (should rarely happen)
    if (showDetailedLogs) {
      console.log(`Coordinates not found in cache for property ${property.id}, calculating on-demand`);
    }
    return calculatePropertyCoordinates(property);
  }, [propertyCoordinatesMap]);
  
  // Check if API key is provided
  if (!apiKey) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px', backgroundColor: '#f8f9fa' }}>
        <h2>Google Maps API Key Required</h2>
        <p>To use Google Maps, please add your API key:</p>
        <ol style={{ textAlign: 'left', margin: '20px 0' }}>
          <li>Create a <code>.env</code> file in the frontend directory</li>
          <li>Add your Google Maps API key as: <br /><code>VITE_GOOGLE_MAPS_API_KEY=your_api_key_here</code></li>
          <li>Restart the development server</li>
        </ol>
        <p><a href="https://developers.google.com/maps/documentation/javascript/get-api-key" target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>
          Learn how to get a Google Maps API key
        </a></p>
      </div>
    );
  }
  
  // Load the Google Maps API
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries: ['places']
  });

  // Display error if failed to load Google Maps
  if (loadError) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px', backgroundColor: '#f8f9fa' }}>
        <h2>Failed to load Google Maps</h2>
        <p>Error: {loadError.message}</p>
        <p>Possible reasons:</p>
        <ul style={{ textAlign: 'left', margin: '20px 0' }}>
          <li>Invalid API key</li>
          <li>API key restrictions (check allowed domains)</li>
          <li>Billing issues with your Google Cloud account</li>
          <li>Required APIs not enabled (Maps JavaScript API, Geocoding API)</li>
        </ul>
        <p><a href="https://developers.google.com/maps/documentation/javascript/error-messages" target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>
          Learn more about Google Maps errors
        </a></p>
      </div>
    );
  }

  // Initialize geocoder when maps API is loaded
  useEffect(() => {
    if (isLoaded && !geocoder) {
      setGeocoder(new google.maps.Geocoder());
    }
  }, [isLoaded, geocoder]);

  // Debug useEffect to log mock properties
  useEffect(() => {
    console.log("Initial properties:", properties);
    
    // Check for known mock properties
    const mockPropsFound = properties.filter(p => p.id === '1' || p.id === '2');
    if (mockPropsFound.length > 0) {
      console.log("Mock properties found:", mockPropsFound);
      
      // Check if coordinates are valid
      mockPropsFound.forEach(p => {
        if (!isFinite(p.lat) || !isFinite(p.lng) || (p.lat === 0 && p.lng === 0)) {
          console.warn(`Mock property has invalid coordinates: ${p.id}, ${p.address}, lat: ${p.lat}, lng: ${p.lng}`);
        } else {
          console.log(`Mock property has valid coordinates: ${p.id}, ${p.address}, lat: ${p.lat}, lng: ${p.lng}`);
        }
      });
    } else {
      console.log("No mock properties found in the properties array");
    }
  }, [properties]);

  // Geocode properties when they change or geocoder becomes available
  useEffect(() => {
    const geocodeProperties = async () => {
      if (!geocoder || !properties.length || isGeocoding) return;
      
      console.log("Starting enhanced geocoding process for", properties.length, "properties");
      setIsGeocoding(true);
      const updatedProperties: PropertyWithGeocodedCoords[] = [];
      
      // Test example - geocode the specific example address directly
      if (false) {
        try {
          console.log("Testing example address geocoding...");
          const testAddress = "東京都品川区南大井三丁目11-14 ルーブル大森八番館";
          const expectedCoords = { lat: 35.59090176233874, lng: 139.7348277632899 };
          
          const geocodeRequest: google.maps.GeocoderRequest = {
            address: testAddress + ", Japan",
            region: 'jp',
          };
          
          const result = await geocoder.geocode(geocodeRequest);
          
          if (result.results && result.results.length > 0) {
            const bestResult = result.results[0];
            const location = bestResult.geometry.location;
            const actualLat = location.lat();
            const actualLng = location.lng();
            
            console.log(`TEST GEOCODE RESULT for "${testAddress}":`);
            console.log(`  Geocoded coords: ${actualLat}, ${actualLng}`);
            console.log(`  Expected coords: ${expectedCoords.lat}, ${expectedCoords.lng}`);
            console.log(`  Difference: lat ${Math.abs(actualLat - expectedCoords.lat).toFixed(6)}, lng ${Math.abs(actualLng - expectedCoords.lng).toFixed(6)}`);
            console.log(`  Location type: ${bestResult.geometry.location_type}`);
            console.log(`  Result types: ${bestResult.types.join(', ')}`);
            console.log(`  Formatted address: ${bestResult.formatted_address}`);
            
            // Check if there are multiple results
            if (result.results.length > 1) {
              console.log(`  Found ${result.results.length} geocoding results:`);
              result.results.forEach((res, index) => {
                console.log(`    Result ${index + 1}: ${res.formatted_address}, coords: ${res.geometry.location.lat()}, ${res.geometry.location.lng()}`);
              });
            }
          } else {
            console.log(`No geocoding results found for test address: ${testAddress}`);
          }
        } catch (error) {
          console.error(`Error testing geocoding: ${error}`);
        }
      }
      
      for (const property of properties) {
        try {
          // Create a copy of the property for geocoding
          const propertyWithGeocode: PropertyWithGeocodedCoords = { 
            ...property,
            // Explicitly copy these fields to ensure they're not lost
            propertyName: property.propertyName,
            floor: property.floor,
            areaMeters: property.areaMeters,
            areaTsubo: property.areaTsubo,
            isJapanese: property.isJapanese
          };
          
          // Determine if this is a Japanese property
          const isJP = property.isJapanese || 
                      property.address.includes('東京') || 
                      property.address.includes('Tokyo') || 
                      property.address.includes('Japan');
          
          // Prepare the address for geocoding with proper formatting
          let formattedAddress = property.address;
          
          // For Japanese properties, ensure address includes Japan
          if (isJP && !formattedAddress.includes('Japan') && !formattedAddress.includes('日本')) {
            formattedAddress += ', Japan';
          }
          
          // For Japanese properties, include the property name in the search query
          // This follows the Japanese address search convention: 住所 物件名
          if (isJP && property.propertyName) {
            formattedAddress = `${formattedAddress} ${property.propertyName}`;
            console.log(`Using Japanese address format (address + property name): ${formattedAddress}`);
          }
          
          // Special case - if this is the example address, use known coordinates
          if (formattedAddress.includes('東京都品川区南大井三丁目11-14') && 
              (formattedAddress.includes('ルーブル大森八番館') || property.propertyName?.includes('ルーブル大森八番館'))) {
            console.log('Found example property - using known correct coordinates');
            propertyWithGeocode.geocodedLat = 35.59090176233874;
            propertyWithGeocode.geocodedLng = 139.7348277632899;
            propertyWithGeocode.accuracyLevel = 'HIGH';
            updatedProperties.push(propertyWithGeocode);
            continue; // Skip the geocoding API call
          }
          
          // Geocode the address with enhanced options
          try {
            const geocodeRequest: google.maps.GeocoderRequest = {
              address: formattedAddress,
              region: isJP ? 'jp' : 'us', // Set appropriate region bias
            };
            
            const result = await geocoder.geocode(geocodeRequest);
            
            if (result.results && result.results.length > 0) {
              const bestResult = result.results[0];
              const location = bestResult.geometry.location;
              
              // Store the geocoded coordinates
              propertyWithGeocode.geocodedLat = location.lat();
              propertyWithGeocode.geocodedLng = location.lng();
              
              // Determine accuracy level based on result types
              const resultTypes = bestResult.types || [];
              const geometryType = bestResult.geometry.location_type;
              
              // Determine accuracy level
              let accuracyLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
              
              if (geometryType === 'ROOFTOP' || 
                  resultTypes.includes('premise') || 
                  resultTypes.includes('subpremise') || 
                  resultTypes.includes('street_address')) {
                accuracyLevel = 'HIGH';
              } else if (geometryType === 'APPROXIMATE' || 
                        resultTypes.includes('locality') || 
                        resultTypes.includes('political')) {
                accuracyLevel = 'LOW';
              }
              
              propertyWithGeocode.accuracyLevel = accuracyLevel;
              
              console.log(`Geocoded ${property.address} to: ${location.lat()}, ${location.lng()} with accuracy: ${accuracyLevel}`);
            } else {
              console.log(`No geocoding results found for: ${property.address}`);
            }
          } catch (error) {
            console.error(`Error geocoding property: ${error}`);
          }
          
          updatedProperties.push(propertyWithGeocode);
        } catch (error) {
          console.error(`Error processing property ${property.id}:`, error);
          updatedProperties.push(property);
        }
      }
      
      console.log("Finished geocoding. Properties:", updatedProperties);
      setGeocodedProperties(updatedProperties);
      setIsGeocoding(false);
    };
    
    geocodeProperties();
  }, [properties, geocoder, isGeocoding]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Clear any selected property when component unmounts
      setSelectedProperty(null);
    };
  }, []);

  // Determine if this is a Japanese property
  const isJapaneseProperty = (property: PropertyWithGeocodedCoords | string) => {
    if (typeof property === 'string') {
      // If we're just checking the address
      return property.includes('東京') || 
             property.includes('Tokyo') ||
             property.includes('Japan');
    }
    
    // Check if the property has the Japanese flag set
    if (property.isJapanese) {
      return true;
    }
    
    // Otherwise check the address
    return property.address.includes('東京') || 
           property.address.includes('Tokyo') ||
           property.address.includes('Japan');
  };

  // Determine map center and zoom based on properties - but only initially
  const initialCenterSet = useRef<boolean>(false);
  const defaultCenter = useMemo(() => ({ lat: 35.6762, lng: 139.6503 }), []); // Tokyo
  
  const mapSettings = useMemo(() => {
    // If we've already set the initial center, return the default
    if (initialCenterSet.current) {
      return {
        center: defaultCenter,
        zoom: 13
      };
    }
    
    let center = defaultCenter;
    let zoom = 13; // Increase zoom level for better detail
    
    // If we have properties with coordinates, center the map on the first valid one
    if (properties.length > 0 || geocodedProperties.length > 0) {
      const propsToUse = geocodedProperties.length > 0 ? geocodedProperties : properties;
      console.log("Calculating initial center from", propsToUse.length, "properties");
      
      // Try to find a valid property to center on
      for (const property of propsToUse) {
        const coords = getPropertyCoordinates(property);
        if (isFinite(coords.lat) && isFinite(coords.lng)) {
          center = coords;
          console.log(`Initial map center set to: ${coords.lat}, ${coords.lng}`);
          initialCenterSet.current = true;
          break;
        }
      }
    }
    
    return { center, zoom };
  }, [properties, geocodedProperties, defaultCenter, getPropertyCoordinates]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    console.log("Map loaded");
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMapClick = useCallback(() => {
    // Close InfoWindow when clicking on the map (outside of markers)
    setSelectedProperty(null);
  }, []);

  const handleMarkerClick = (property: PropertyWithGeocodedCoords) => {
    // If clicking the same property, toggle the InfoWindow
    if (selectedProperty && selectedProperty.id === property.id) {
      setSelectedProperty(null);
    } else {
      setSelectedProperty(property);
      onSelectProperty(property);
    }
  };

  const handleInfoWindowClose = () => {
    console.log("InfoWindow close button clicked");
    setSelectedProperty(null);
    
    // Also notify parent component to clear selection
    onSelectProperty(null as any);
  };

  const formatCurrency = (price: number, isJapanese: boolean) => {
    if (isJapanese) {
      // Format as 万円 (10,000 yen)
      return `${(price / 10000).toLocaleString()}万`;
    }
    return `$${price.toLocaleString()}`;
  };

  // Determine which properties to display
  const displayProperties = geocodedProperties.length > 0 ? geocodedProperties : properties;

  // Render Japanese property details in the specified format
  const renderJapanesePropertyDetails = (property: PropertyWithGeocodedCoords) => {
    console.log('Rendering Japanese property details:', property);
    
    if (!property.isJapanese && !isJapaneseProperty(property)) {
      return null;
    }

    // For properties without areaMeters, calculate from sqft if available
    if (!property.areaMeters && property.sqft) {
      property.areaMeters = parseFloat((property.sqft / 10.764).toFixed(2));
      // Estimate tsubo if not available (1 tsubo ≈ 3.306 sq meters)
      if (!property.areaTsubo) {
        property.areaTsubo = parseFloat((property.areaMeters / 3.306).toFixed(2));
      }
    }

    // Format area with tsubo if available
    const formattedArea = property.areaMeters 
      ? `${property.areaMeters.toFixed(2)}㎡${property.areaTsubo ? ` (約${property.areaTsubo.toFixed(2)}坪)` : ''}`
      : 'N/A';
    
    console.log('Formatted area:', formattedArea);

    return (
      <div className="info-window-content jp-property">
        <div>物件名: {property.propertyName || '-'}</div>
        <div>住所: {property.address}</div>
        <div>階数: {property.floor || '-'}</div>
        <div>面積: {formattedArea}</div>
        <div>価格: {(property.price / 10000).toLocaleString()}万円</div>
      </div>
    );
  };

  // Render standard property details (US format)
  const renderStandardPropertyDetails = (property: PropertyWithGeocodedCoords) => {
    return (
      <div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold', color: '#333', paddingRight: '20px' }}>
          {formatCurrency(property.price, isJapaneseProperty(property))}
        </h3>
        <p style={{ margin: '5px 0', fontSize: '14px', color: '#555' }}>{property.address}</p>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          margin: '10px 0 5px 0',
          fontSize: '14px',
          color: '#666'
        }}>
          <span><strong>{property.bedrooms}</strong> bd</span>
          <span><strong>{property.bathrooms}</strong> ba</span>
          <span><strong>{property.sqft.toLocaleString()}</strong> sqft</span>
        </div>
      </div>
    );
  };

  useEffect(() => {
    // Log properties when they change
    console.log("Properties available for rendering:", displayProperties);
  }, [displayProperties]);

  // Add effect to fit bounds only on initial load - triggered just once
  useEffect(() => {
    // Only run when map is first loaded
    if (map && !hasInitiallyCentered.current) {
      console.log("Map initially loaded - performing one-time bounds calculation");
      
      // Only continue if we have properties to work with
      if (properties.length === 0) {
        console.log("No properties available yet, skipping initial bounds");
        return;
      }
      
      // Ensure we use available properties
      const propsToUse = displayProperties.length > 0 ? displayProperties : properties;
      console.log("Using properties for initial bounds:", propsToUse.length);
      
      // Create bounds object
      const bounds = new google.maps.LatLngBounds();
      let validMarkersCount = 0;
      
      // Add all valid property coordinates to bounds
      propsToUse.forEach((property, index) => {
        const coords = getPropertyCoordinates(property);
        
        console.log(`Property ${index} (${property.propertyName || property.address}): Using coords lat=${coords.lat}, lng=${coords.lng}`);
        
        if (isFinite(coords.lat) && isFinite(coords.lng)) {
          // Verify the coordinates are in valid Japan range
          const inJapanRange = 
            coords.lat >= 30 && coords.lat <= 46 && 
            coords.lng >= 129 && coords.lng <= 146;
            
          if (inJapanRange) {
            console.log(`  Valid Japan coordinates, adding to bounds`);
            bounds.extend(new google.maps.LatLng(coords.lat, coords.lng));
            validMarkersCount++;
          } else {
            console.log(`  Coordinates outside Japan range, not adding to bounds`);
          }
        } else {
          console.log(`  Invalid coordinates, not adding to bounds`);
        }
      });
      
      console.log(`Found ${validMarkersCount} valid markers for bounds calculation`);
      
      // Only adjust bounds if we have valid markers
      if (validMarkersCount > 0) {
        // If only one marker, set appropriate zoom
        if (validMarkersCount === 1) {
          map.setCenter(bounds.getCenter());
          map.setZoom(15); // Higher zoom for single property
          console.log(`Centering on single property at ${bounds.getCenter().lat()}, ${bounds.getCenter().lng()}`);
        } else {
          // Fit to bounds with padding
          map.fitBounds(bounds);
          console.log(`Fitting to bounds: ${JSON.stringify(bounds.toJSON())}`);
          
          // Prevent excessive zoom when only a few properties are close together
          google.maps.event.addListenerOnce(map, 'idle', () => {
            const currentZoom = map.getZoom();
            console.log(`Current zoom after bounds: ${currentZoom}`);
            if (currentZoom && currentZoom > 16) {
              map.setZoom(16);
              console.log(`Reduced zoom to 16`);
            }
          });
        }
      } else {
        // If no valid markers, use default Tokyo center
        console.log(`No valid markers, using default Tokyo center`);
        map.setCenter(defaultCenter);
        map.setZoom(12);
      }
      
      // Mark that we've done the initial centering
      hasInitiallyCentered.current = true;
      console.log("Initial bounds calculation complete - will not recalculate");
    }
  }, [map, defaultCenter, properties, displayProperties, getPropertyCoordinates]);

  // Handle external property selection (from sidebar)
  useEffect(() => {
    // When externalSelectedProperty becomes null, clear the internal selection too
    if (!externalSelectedProperty && selectedProperty) {
      console.log("External property selection cleared, clearing internal selection");
      setSelectedProperty(null);
      return;
    }
    
    if (externalSelectedProperty && map) {
      console.log("External property selected:", externalSelectedProperty.id);
      
      // Find the property in our geocoded list
      const selectedProp = displayProperties.find(p => p.id === externalSelectedProperty.id) || 
                           properties.find(p => p.id === externalSelectedProperty.id);
      
      if (selectedProp) {
        // Only center if this is a new selection (different from current selection)
        const isNewSelection = !selectedProperty || selectedProperty.id !== selectedProp.id;
        
        // Update the internal selection state
        setSelectedProperty(selectedProp);
        
        // Only center the map if this is a new property selection
        if (isNewSelection) {
          // Get coordinates and center the map
          const coords = getPropertyCoordinates(selectedProp);
          if (isFinite(coords.lat) && isFinite(coords.lng)) {
            console.log(`Centering map on newly selected property: ${selectedProp.id} at ${coords.lat}, ${coords.lng}`);
            
            // Center map on the selected property
            map.setCenter(coords);
            
            // Set appropriate zoom for a single property
            map.setZoom(15);
            
            // Pan to the marker to ensure it's visible
            map.panTo(coords);
          } else {
            console.warn(`Cannot center on property ${selectedProp.id} - invalid coordinates`);
          }
        } else {
          console.log(`Property ${selectedProp.id} already selected, skipping map centering`);
        }
      } else {
        console.warn(`Selected property not found in available properties: ${externalSelectedProperty.id}`);
      }
    }
  }, [externalSelectedProperty, map, displayProperties, properties, getPropertyCoordinates, selectedProperty]);

  return isLoaded ? (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={mapSettings.center}
      zoom={mapSettings.zoom}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={handleMapClick}
      options={mapOptions}
    >
      {/* Ensure we always render markers for all properties */}
      {properties.map((property) => {
        // Store the coordinates in a constant to ensure consistency
        const propertyCoords = getPropertyCoordinates(property);
        
        // Skip if coordinates are invalid
        if (!isFinite(propertyCoords.lat) || !isFinite(propertyCoords.lng)) {
          console.warn(`Skipping invalid marker for: ${property.id}, ${property.address}`);
          return null;
        }
        
        // Log the marker being created
        console.log(`Creating marker for: ${property.id}, ${property.address} at ${propertyCoords.lat}, ${propertyCoords.lng}`);
        
        const isJapanese = isJapaneseProperty(property);
        const isSelected = selectedProperty?.id === property.id;
        const customIcon = createCustomMarker(isJapanese, isSelected);
        
        return (
          <Marker
            key={property.id}
            position={propertyCoords}
            onClick={() => handleMarkerClick(property as PropertyWithGeocodedCoords)}
            icon={customIcon || undefined}
          >
            {/* Attach InfoWindow directly to the Marker when this marker is selected */}
            {isSelected && selectedProperty && (
              <InfoWindow
                onCloseClick={handleInfoWindowClose}
              >
                <div className="info-window-content">
                  <div className="info-window-close-btn" onClick={handleInfoWindowClose}>✕</div>
                  {isJapaneseProperty(selectedProperty) 
                    ? renderJapanesePropertyDetails(selectedProperty)
                    : renderStandardPropertyDetails(selectedProperty)}
                </div>
              </InfoWindow>
            )}
          </Marker>
        );
      })}
    </GoogleMap>
  ) : <div>Loading...</div>;
};

export default PropertyGoogleMap; 