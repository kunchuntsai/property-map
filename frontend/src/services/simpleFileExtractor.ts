import type { Property } from './api';

// Extract just the addresses from a file
export const extractAddressesFromFile = async (file: File): Promise<string[]> => {
  try {
    // Read the file as text
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
    
    console.log("File content:", text); // For debugging
    
    // First, try to extract Japanese property addresses
    const japaneseAddresses = extractJapanesePropertyAddresses(text);
    if (japaneseAddresses.length > 0) {
      return japaneseAddresses;
    }
    
    // If no Japanese addresses found, try US-style addresses as fallback
    // Regular expression for extracting US addresses
    const US_ADDRESS_REGEX = /(\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Terrace|Ter|Way),\s+[\w\s]+,\s+[A-Z]{2}\s+\d{5})/gi;
    
    // Extract addresses using regex
    const usAddresses = text.match(US_ADDRESS_REGEX) || [];
    const uniqueAddresses = [...new Set(usAddresses)];
    
    return uniqueAddresses;
  } catch (error) {
    console.error('Error extracting addresses from file:', error);
    return [];
  }
};

// Extract Japanese property addresses from text
const extractJapanesePropertyAddresses = (text: string): string[] => {
  const addresses: string[] = [];
  
  // Check if text contains Japanese characters to avoid excessive processing
  const hasJapaneseChars = /[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\uFF00-\uFF9F\u4E00-\u9FAF]/.test(text);
  if (!hasJapaneseChars) {
    return [];
  }

  // Match pattern: 住所: followed by text until newline
  const ADDRESS_PATTERNS = [
    /住所[\s:：]([^\n]+)/g,    // Standard format
    /所在地[\s:：]([^\n]+)/g,  // Alternative label
    /物件住所[\s:：]([^\n]+)/g // Another alternative
  ];
  
  for (const pattern of ADDRESS_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1] && match[1].trim().length > 0) {
        addresses.push(match[1].trim());
      }
    }
  }
  
  // Also check for addresses without the label (using wards for identification)
  // Common wards and other location identifiers in Tokyo
  const TOKYO_LOCATIONS = [
    '千代田区', '中央区', '港区', '新宿区', '文京区', '台東区', '墨田区',
    '江東区', '品川区', '目黒区', '大田区', '世田谷区', '渋谷区', '中野区',
    '杉並区', '豊島区', '北区', '荒川区', '板橋区', '練馬区', '足立区',
    '葛飾区', '江戸川区', '八王子市', '立川市', '武蔵野市', '三鷹市',
    '府中市', '調布市', '町田市', '小金井市', '国分寺市', '国立市'
  ];
  
  // Find any text that looks like a Tokyo address (between line breaks)
  const tokyoPattern = new RegExp(`(東京都[^\\n]*(?:${TOKYO_LOCATIONS.join('|')})[^\\n]*)`, 'g');
  
  let tokyoMatch;
  while ((tokyoMatch = tokyoPattern.exec(text)) !== null) {
    if (tokyoMatch[1] && !addresses.includes(tokyoMatch[1])) {
      addresses.push(tokyoMatch[1].trim());
    }
  }
  
  // Extract addresses from property list format
  // This pattern looks for blocks like "物件名: XXXX\n住所: YYYY"
  const propertyBlocks = text.split(/物件名[:：]/);
  for (let i = 1; i < propertyBlocks.length; i++) {
    const block = propertyBlocks[i];
    const addressMatch = block.match(/住所[:：]\s*([^\n]+)/);
    if (addressMatch && addressMatch[1] && !addresses.includes(addressMatch[1])) {
      addresses.push(addressMatch[1].trim());
    }
  }
  
  // Sometimes, the text might have property data in table format without clear labels
  // Look for lines that match Tokyo address patterns (contains ward names)
  if (addresses.length === 0) {
    const lines = text.split('\n');
    for (const line of lines) {
      for (const location of TOKYO_LOCATIONS) {
        if (line.includes('東京都') && line.includes(location)) {
          // This line likely contains an address
          if (!addresses.includes(line)) {
            addresses.push(line.trim());
          }
          break;
        }
      }
    }
  }
  
  return [...new Set(addresses)]; // Remove duplicates
};

// For backward compatibility
export const extractPropertiesFromFile = async (file: File): Promise<Property[]> => {
  const addresses = await extractAddressesFromFile(file);
  
  return addresses.map((address, index) => {
    // Check if it's a Japanese address to set appropriate coordinates
    const isJapaneseAddress = /[一-龯]/.test(address) || address.includes('東京');
    
    // Generate appropriate coordinates based on address type
    const lat = isJapaneseAddress
      ? 35.6762 + (Math.random() - 0.5) * 0.1 // Tokyo coordinates
      : 37.7749 + (Math.random() - 0.5) * 0.1; // SF coordinates
      
    const lng = isJapaneseAddress
      ? 139.6503 + (Math.random() - 0.5) * 0.1 // Tokyo coordinates
      : -122.4194 + (Math.random() - 0.5) * 0.1; // SF coordinates
    
    return {
      id: `file-${index + 1}`,
      address,
      price: Math.floor(Math.random() * 1000000) + 500000,
      bedrooms: Math.floor(Math.random() * 4) + 1,
      bathrooms: Math.floor(Math.random() * 3) + 1,
      sqft: Math.floor(Math.random() * 2000) + 800,
      lat,
      lng
    };
  });
}; 