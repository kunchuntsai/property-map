import { useState, useEffect } from 'react'
import './App.css'
import PropertyMap from './components/Map'
import PropertyList from './components/PropertyList'
import PropertyDetail from './components/PropertyDetail'
import UnifiedFileUploader from './components/UnifiedFileUploader'
import { fetchProperties } from './services/api'
import type { Property } from './services/api'

function App() {
  const [properties, setProperties] = useState<Property[]>([])
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProperties = async () => {
      try {
        setLoading(true)
        const data = await fetchProperties()
        setProperties(data)
        setError(null)
      } catch (err) {
        setError('Failed to load properties')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadProperties()
  }, [])

  const handleSelectProperty = (property: Property) => {
    setSelectedProperty(property)
  }

  const handlePropertiesExtracted = (extractedProperties: Property[]) => {
    setProperties(prev => [...extractedProperties, ...prev])
  }

  const handlePropertyExtracted = (property: Property) => {
    setProperties(prev => [property, ...prev])
  }

  const handleRemoveProperty = (propertyId: string) => {
    setProperties(prev => prev.filter(property => property.id !== propertyId))
    if (selectedProperty?.id === propertyId) {
      setSelectedProperty(null)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Property Map</h1>
      </header>
      <main className="app-main">
        <div className="sidebar">
          <UnifiedFileUploader 
            onPropertiesExtracted={handlePropertiesExtracted}
            onPropertyExtracted={handlePropertyExtracted}
          />
          
          <PropertyList 
            properties={properties} 
            onSelectProperty={handleSelectProperty}
            onRemoveProperty={handleRemoveProperty}
            selectedProperty={selectedProperty || undefined}
          />
          <PropertyDetail property={selectedProperty} />
        </div>
        <div className="map-container">
          {loading ? (
            <div className="loading">Loading properties...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : (
            <PropertyMap 
              properties={properties} 
              onSelectProperty={handleSelectProperty} 
            />
          )}
        </div>
      </main>
    </div>
  )
}

export default App
