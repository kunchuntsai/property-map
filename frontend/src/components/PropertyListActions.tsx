import { useState } from 'react';
import { exportPropertiesToFile, importPropertiesFromFile, createGoogleMyMap } from '../services/api';
import type { Property } from '../services/api';

interface PropertyListActionsProps {
  properties: Property[];
  onImportProperties: (properties: Property[]) => void;
}

const PropertyListActions: React.FC<PropertyListActionsProps> = ({ properties, onImportProperties }) => {
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showGoogleMapsOptions, setShowGoogleMapsOptions] = useState(false);
  const [listName, setListName] = useState('My Property List');
  const [kmlBlob, setKmlBlob] = useState<Blob | null>(null);
  const [myMapsUrl, setMyMapsUrl] = useState<string | null>(null);

  // Handle property export
  const handleExport = () => {
    if (properties.length === 0) {
      alert('No properties to export');
      return;
    }
    exportPropertiesToFile(properties);
  };

  // Handle property import
  const handleImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError(null);

    try {
      const importedProperties = await importPropertiesFromFile(file);
      onImportProperties(importedProperties);
      alert(`Successfully imported ${importedProperties.length} properties`);
    } catch (error) {
      console.error('Import error:', error);
      setImportError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  // Show Google Maps options dialog
  const handleShowMapOptions = () => {
    setShowGoogleMapsOptions(true);
    setMyMapsUrl(null);
    setKmlBlob(null);
  };
  
  // Create a Google My Maps KML and get URL
  const handleCreateMyMap = async () => {
    if (properties.length === 0) {
      alert('No properties to map');
      return;
    }
    
    try {
      // Create KML content with correct KML tags
      let kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${listName}</name>
    <description>Property list created by PropertyMap</description>`;

      // Add each property as a placemark
      properties.forEach(property => {
        console.log(`Property ${property.propertyName || property.address}: 
          Map coordinates (lat=${property.lat}, lng=${property.lng})
          KML coordinates: ${property.lng},${property.lat},0`);
        
        const name = property.propertyName || property.address;
        const description = [
          property.address,
          property.isJapanese ? (property.floor || '') : `${property.bedrooms} bed, ${property.bathrooms} bath`,
          property.isJapanese ? 
            (property.areaMeters ? `${property.areaMeters}㎡${property.areaTsubo ? ` (約${property.areaTsubo.toFixed(2)}坪)` : ''}` : '') : 
            (property.sqft ? `${property.sqft} sqft` : ''),
          property.price ? `Price: ${property.isJapanese ? (property.price / 10000) + '万円' : '$' + property.price.toLocaleString()}` : ''
        ].filter(Boolean).join('\n');

        kmlContent += `
    <Placemark>
      <name>${name}</name>
      <description><![CDATA[${description}]]></description>
      <Point>
        <coordinates>${property.lng},${property.lat},0</coordinates>
      </Point>
    </Placemark>`;
      });

      // Close KML tags
      kmlContent += `
  </Document>
</kml>`;

      // Create a Blob from the KML content
      const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
      setKmlBlob(blob);
      
      // Get the Google My Maps URL
      const url = await createGoogleMyMap(properties, listName);
      setMyMapsUrl(url);
      
    } catch (error) {
      console.error('Error creating Google My Maps:', error);
      alert('Failed to create Google My Maps data');
    }
  };
  
  // Download the KML file
  const downloadKml = () => {
    if (!kmlBlob) return;
    
    const url = URL.createObjectURL(kmlBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${listName.replace(/\s+/g, '-')}.kml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  // Open Google My Maps
  const openMyMaps = () => {
    if (!myMapsUrl) return;
    window.open(myMapsUrl, '_blank');
  };

  return (
    <div className="property-list-actions">
      <div className="action-buttons">
        <button 
          className="action-button export-button" 
          onClick={handleExport}
          disabled={properties.length === 0}
        >
          Export Properties
        </button>
        
        <label className="action-button import-button">
          Import Properties
          <input 
            type="file" 
            accept=".json" 
            onChange={handleImportChange} 
            style={{ display: 'none' }}
            disabled={importing}
          />
        </label>
        
        <button 
          className="action-button share-button" 
          onClick={handleShowMapOptions}
          disabled={properties.length === 0}
        >
          Create Google Maps List
        </button>
      </div>
      
      {importing && <div className="importing-status">Importing properties...</div>}
      {importError && <div className="import-error">Error: {importError}</div>}
      
      {showGoogleMapsOptions && (
        <div className="google-maps-url-container">
          <h4>Create Google Maps List</h4>
          
          <div className="list-name-input">
            <label htmlFor="listName">List Name:</label>
            <input 
              type="text" 
              id="listName"
              value={listName} 
              onChange={(e) => setListName(e.target.value)}
              placeholder="Enter a name for your property list"
            />
          </div>
          
          <div className="map-creation-options">
            <button 
              className="create-map-button"
              onClick={handleCreateMyMap}
              disabled={properties.length === 0 || !listName.trim()}
            >
              Create Google Maps List
            </button>
          </div>
          
          {myMapsUrl && kmlBlob && (
            <div className="mymaps-instructions">
              <h5>Your Google Maps List is Ready!</h5>
              <p>Follow these simple steps to create your shareable Google Maps list:</p>
              <ol>
                <li>
                  <button 
                    className="download-kml-button"
                    onClick={downloadKml}
                  >
                    1. Download KML File
                  </button>
                </li>
                <li>
                  <button 
                    className="open-mymaps-button"
                    onClick={openMyMaps}
                  >
                    2. Open Google My Maps
                  </button>
                </li>
                <li>In Google My Maps, click <strong>Import</strong> and select the KML file you just downloaded</li>
                <li>Your properties will be imported as a map with all locations</li>
                <li>Click <strong>Share</strong> to get a shareable link</li>
              </ol>
              <div className="share-info">
                <p><strong>Note:</strong> This is the closest way to create a true Google Maps list that can be shared with a short URL.</p>
              </div>
            </div>
          )}
          
          <button 
            className="close-button" 
            onClick={() => setShowGoogleMapsOptions(false)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default PropertyListActions;