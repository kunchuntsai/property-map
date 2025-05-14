import React, { useState } from 'react';
import type { Property } from '../services/api';

interface AddressValidatorProps {
  addresses: string[];
  onConfirm: (addresses: string[]) => void;
  onCancel: () => void;
}

const AddressValidator: React.FC<AddressValidatorProps> = ({
  addresses,
  onConfirm,
  onCancel
}) => {
  const [selectedAddresses, setSelectedAddresses] = useState<string[]>(addresses);
  const [newAddress, setNewAddress] = useState<string>('');

  const toggleAddress = (address: string) => {
    if (selectedAddresses.includes(address)) {
      setSelectedAddresses(selectedAddresses.filter(a => a !== address));
    } else {
      setSelectedAddresses([...selectedAddresses, address]);
    }
  };

  const addNewAddress = () => {
    if (newAddress.trim() && !selectedAddresses.includes(newAddress)) {
      setSelectedAddresses([...selectedAddresses, newAddress]);
      setNewAddress('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addNewAddress();
    }
  };

  return (
    <div className="address-validator">
      <h2 style={{ color: 'black' }}>Validate Extracted Addresses</h2>
      <p style={{ color: 'black' }}>Select valid addresses from the list below or add new ones:</p>

      <div className="address-list">
        {addresses.length === 0 ? (
          <p className="no-addresses" style={{ color: 'black' }}>No addresses found in the file</p>
        ) : (
          addresses.map((address, index) => (
            <div key={index} className="address-item" style={{ color: 'black', margin: '8px 0' }}>
              <label style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={selectedAddresses.includes(address)}
                  onChange={() => toggleAddress(address)}
                  style={{ marginRight: '8px' }}
                />
                <span style={{ color: 'black' }}>{address}</span>
              </label>
            </div>
          ))
        )}
      </div>

      <div className="add-address" style={{ marginTop: '20px' }}>
        <h3 style={{ color: 'black' }}>Add address manually</h3>
        <div className="add-address-input" style={{ display: 'flex', marginTop: '10px' }}>
          <input
            type="text"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g. 123 Main St, San Francisco, CA 94105"
            style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button
            onClick={addNewAddress}
            style={{
              marginLeft: '10px',
              padding: '8px 16px',
              backgroundColor: '#007BFF',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Add
          </button>
        </div>
      </div>

      <div className="selected-addresses" style={{ marginTop: '20px' }}>
        <h3 style={{ color: 'black' }}>Selected Addresses ({selectedAddresses.length})</h3>
        <ul style={{ color: 'black', padding: '0 0 0 20px' }}>
          {selectedAddresses.map((address, index) => (
            <li key={index} style={{ margin: '5px 0' }}>{address}</li>
          ))}
        </ul>
      </div>

      <div className="validation-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn-cancel"
          onClick={onCancel}
          style={{
            padding: '10px 20px',
            backgroundColor: '#f8f9fa',
            color: '#212529',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            marginRight: '10px',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
        <button
          className="btn-confirm"
          onClick={() => onConfirm(selectedAddresses)}
          disabled={selectedAddresses.length === 0}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007BFF',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedAddresses.length === 0 ? 'not-allowed' : 'pointer',
            opacity: selectedAddresses.length === 0 ? 0.65 : 1
          }}
        >
          Import {selectedAddresses.length} Address{selectedAddresses.length !== 1 ? 'es' : ''}
        </button>
      </div>
    </div>
  );
};

export default AddressValidator;