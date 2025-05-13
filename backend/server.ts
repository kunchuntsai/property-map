import express from 'express';
import cors from 'cors';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Sample property data
const properties = [
  {
    id: '1',
    address: '123 Main St, San Francisco, CA',
    price: 1250000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1850,
    lat: 37.7749,
    lng: -122.4194
  },
  {
    id: '2',
    address: '456 Market St, San Francisco, CA',
    price: 980000,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1200,
    lat: 37.7835,
    lng: -122.4079
  },
  {
    id: '3',
    address: '789 Valencia St, San Francisco, CA',
    price: 1450000,
    bedrooms: 4,
    bathrooms: 3,
    sqft: 2100,
    lat: 37.7598,
    lng: -122.4214
  }
];

// Routes
app.get('/api/properties', (req, res) => {
  res.json(properties);
});

app.get('/api/properties/:id', (req, res) => {
  const property = properties.find(p => p.id === req.params.id);
  if (!property) {
    return res.status(404).json({ error: 'Property not found' });
  }
  res.json(property);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 