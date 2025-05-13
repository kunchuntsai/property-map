interface Config {
  googleMapsApiKey: string;
}

/**
 * Application configuration
 * 
 * To use Google Maps:
 * 1. Create a .env file in the frontend directory
 * 2. Add your Google Maps API key as VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
 * 3. Make sure your API key has the following APIs enabled:
 *    - Maps JavaScript API
 *    - Geocoding API
 *    - Places API (if you're using places functionality)
 */
const config: Config = {
  // Use environment variable for the API key
  googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
};

export default config; 