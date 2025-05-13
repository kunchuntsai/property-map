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
      <h2>Validate Extracted Addresses</h2>
      <p>Select valid addresses from the list below or add new ones:</p>
      
      <div className="address-list">
        {addresses.length === 0 ? (
          <p className="no-addresses">No addresses found in the file</p>
        ) : (
          addresses.map((address, index) => (
            <div key={index} className="address-item">
              <label>
                <input 
                  type="checkbox" 
                  checked={selectedAddresses.includes(address)}
                  onChange={() => toggleAddress(address)}
                />
                {address}
              </label>
            </div>
          ))
        )}
      </div>

      <div className="add-address">
        <h3>Add address manually</h3>
        <div className="add-address-input">
          <input
            type="text"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g. 123 Main St, San Francisco, CA 94105"
          />
          <button onClick={addNewAddress}>Add</button>
        </div>
      </div>
      
      <div className="selected-addresses">
        <h3>Selected Addresses ({selectedAddresses.length})</h3>
        <ul>
          {selectedAddresses.map((address, index) => (
            <li key={index}>{address}</li>
          ))}
        </ul>
      </div>
      
      <div className="validation-actions">
        <button 
          className="btn-cancel" 
          onClick={onCancel}
        >
          Cancel
        </button>
        <button 
          className="btn-confirm" 
          onClick={() => onConfirm(selectedAddresses)}
          disabled={selectedAddresses.length === 0}
        >
          Import {selectedAddresses.length} Address{selectedAddresses.length !== 1 ? 'es' : ''}
        </button>
      </div>
    </div>
  );
};

export default AddressValidator; 