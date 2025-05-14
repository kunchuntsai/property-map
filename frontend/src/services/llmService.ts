import type { Property } from './api';

// Conditionally import Anthropic SDK
let Anthropic: any = null;
try {
  // Dynamic import to prevent build errors if the package isn't installed
  import('@anthropic-ai/sdk').then((module) => {
    Anthropic = module.default;
  }).catch(error => {
    console.warn('Anthropic SDK not available:', error.message);
    console.info('AI-powered extraction disabled. Install with: npm install @anthropic-ai/sdk');
  });
} catch (error) {
  console.warn('Anthropic SDK not available');
  console.info('AI-powered extraction disabled. Install with: npm install @anthropic-ai/sdk');
}

const DEFAULT_MODEL = 'claude-3-haiku-20240307';
const VISION_MODEL = 'claude-3-opus-20240229';

// Replace with your actual API key handling mechanism
// In production, this should be securely managed through environment variables
function getApiKey(): string {
  // For Vite applications, environment variables are exposed through import.meta.env
  // with the VITE_ prefix
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string;

  if (!apiKey) {
    console.warn("No API key found in environment variables. LLM features will be disabled.");
    console.info("To enable LLM features, add VITE_ANTHROPIC_API_KEY to your .env file");
  }

  return apiKey || '';
}

// Initialize Anthropic client with API key
function getAnthropicClient(): any | null {
  if (!Anthropic) {
    console.warn("Anthropic SDK not available. AI-powered extraction disabled.");
    return null;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("No API key available for LLM service");
    return null;
  }

  try {
    return new Anthropic({
      apiKey: apiKey
    });
  } catch (error) {
    console.error("Error initializing Anthropic client:", error);
    return null;
  }
}

export interface LLMPropertyData {
  propertyName: string | null;
  address: string | null;
  floor: string | null;
  size: string | null;
  price: string | null;
  layout: string | null;
  station: string | null;
  description: string | null;
}

/**
 * Extract property data from image using LLM
 * @param imageText - OCR-extracted text from the property image
 * @returns Structured property data
 */
export async function extractPropertyDataWithLLM(imageText: string): Promise<LLMPropertyData> {
  // Skip LLM processing if SDK is not available
  if (!Anthropic) {
    console.warn("Anthropic SDK not available. Skipping LLM extraction.");
    return createEmptyPropertyData();
  }

  try {
    const client = getAnthropicClient();
    if (!client) {
      return createEmptyPropertyData();
    }

    const prompt = createPropertyExtractionPrompt(imageText);

    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    return parsePropertyDataFromLLMResponse(response.content[0].text);
  } catch (error) {
    console.error("Error using LLM for property extraction:", error);
    return createEmptyPropertyData();
  }
}

/**
 * Create a fallback property extraction using LLM from a file
 * This version is used when OCR fails completely
 */
export async function extractPropertyDataFromFileWithLLM(file: File): Promise<LLMPropertyData> {
  // Skip LLM processing if SDK is not available
  if (!Anthropic) {
    console.warn("Anthropic SDK not available. Skipping LLM extraction.");
    return createEmptyPropertyData();
  }

  try {
    // Convert file to base64
    const base64 = await fileToBase64(file);

    const client = getAnthropicClient();
    if (!client) {
      return createEmptyPropertyData();
    }

    // For direct image analysis with Claude, we use the vision API
    const response = await client.messages.create({
      model: VISION_MODEL,
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '以下の不動産広告の画像から、物件情報を抽出してください。物件名、住所、階数、面積、価格の情報を特に抽出してください。日本語で回答してください。'
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: getFileType(file),
                data: base64
              }
            }
          ]
        }
      ]
    });

    return parsePropertyDataFromLLMResponse(response.content[0].text);
  } catch (error) {
    console.error("Error using LLM for direct property extraction:", error);
    return createEmptyPropertyData();
  }
}

/**
 * Extract a list of properties from an image file using LLM
 * @param file - The property image file
 * @returns Array of structured property data
 */
export async function extractPropertyListWithLLM(file: File): Promise<LLMPropertyData[]> {
  // Skip LLM processing if SDK is not available
  if (!Anthropic) {
    console.warn("Anthropic SDK not available. Skipping LLM extraction.");
    return [];
  }

  try {
    // Convert file to base64
    const base64 = await fileToBase64(file);

    const client = getAnthropicClient();
    if (!client) {
      return [];
    }

    // For direct image analysis with Claude, we use the vision API
    const response = await client.messages.create({
      model: VISION_MODEL,
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '以下の不動産広告の画像から、すべての物件情報を抽出してください。画像に複数の物件が含まれている場合は、それぞれの物件ごとに情報を分けて抽出してください。各物件について、物件名、住所、階数、面積、価格の情報を特に抽出してください。結果はJSONリスト形式で返してください。物件が1つの場合も必ずリスト形式で返してください。'
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: getFileType(file),
                data: base64
              }
            }
          ]
        }
      ]
    });

    return parsePropertyListFromLLMResponse(response.content[0].text);
  } catch (error) {
    console.error("Error using LLM for property list extraction:", error);
    return [];
  }
}

// Helper function to create an empty property data object
function createEmptyPropertyData(): LLMPropertyData {
  return {
    propertyName: null,
    address: null,
    floor: null,
    size: null,
    price: null,
    layout: null,
    station: null,
    description: null
  };
}

// Helper function to create the prompt for property extraction
function createPropertyExtractionPrompt(imageText: string): string {
  return `
以下は日本の不動産広告からOCRで抽出したテキストです。このテキストから物件情報を抽出し、以下の形式で返してください。

テキスト:
${imageText}

抽出して欲しい情報:
1. 物件名: (マンション名や建物名)
2. 住所: (都道府県から番地まで)
3. 階数: (何階部分か)
4. 面積: (専有面積、㎡と坪)
5. 価格: (万円単位の販売価格)
6. 間取り: (1LDKなど)
7. 最寄駅: (路線名と駅名、徒歩時間)
8. 物件説明: (特徴や特筆事項)

JSONフォーマットで結果を返してください。見つからない情報はnullとしてください。
`;
}

// Helper function to parse the LLM response into structured data
function parsePropertyDataFromLLMResponse(responseText: string): LLMPropertyData {
  try {
    // Extract JSON object from response (assumes response contains JSON)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[0];
      return JSON.parse(jsonStr);
    }

    // Fallback parsing if JSON not found - look for key-value patterns
    const data: LLMPropertyData = createEmptyPropertyData();

    if (responseText.includes('物件名:')) {
      const match = responseText.match(/物件名:\s*(.*?)[\n\r]/);
      data.propertyName = match ? match[1].trim() : null;
    }

    if (responseText.includes('住所:')) {
      const match = responseText.match(/住所:\s*(.*?)[\n\r]/);
      data.address = match ? match[1].trim() : null;
    }

    if (responseText.includes('階数:')) {
      const match = responseText.match(/階数:\s*(.*?)[\n\r]/);
      data.floor = match ? match[1].trim() : null;
    }

    if (responseText.includes('面積:')) {
      const match = responseText.match(/面積:\s*(.*?)[\n\r]/);
      data.size = match ? match[1].trim() : null;
    }

    if (responseText.includes('価格:')) {
      const match = responseText.match(/価格:\s*(.*?)[\n\r]/);
      data.price = match ? match[1].trim() : null;
    }

    if (responseText.includes('間取り:')) {
      const match = responseText.match(/間取り:\s*(.*?)[\n\r]/);
      data.layout = match ? match[1].trim() : null;
    }

    if (responseText.includes('最寄駅:')) {
      const match = responseText.match(/最寄駅:\s*(.*?)[\n\r]/);
      data.station = match ? match[1].trim() : null;
    }

    return data;
  } catch (error) {
    console.error("Error parsing LLM response:", error);
    return createEmptyPropertyData();
  }
}

// Helper function to parse the LLM response into a list of structured data
function parsePropertyListFromLLMResponse(responseText: string): LLMPropertyData[] {
  try {
    // Try to extract JSON array from the response
    const jsonMatches = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatches) {
      const jsonArray = jsonMatches[0];
      return JSON.parse(jsonArray);
    }

    // If no JSON array found, look for a single JSON object
    const jsonObjectMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      const jsonObj = jsonObjectMatch[0];
      const parsedObj = JSON.parse(jsonObj);

      // If it's a single object, return it as an array
      if (parsedObj.propertyName || parsedObj.address) {
        return [parsedObj];
      }

      // If it has numbered properties, try to convert to array
      const properties: LLMPropertyData[] = [];
      for (const key in parsedObj) {
        if (parsedObj[key] && typeof parsedObj[key] === 'object') {
          properties.push(parsedObj[key] as LLMPropertyData);
        }
      }

      if (properties.length > 0) {
        return properties;
      }
    }

    // Fallback: Try to parse non-JSON format
    const properties: LLMPropertyData[] = [];
    const propertyBlocks = responseText.split(/物件\s*\d+:|物件情報\s*\d+:|━+|===+|---+/g);

    for (const block of propertyBlocks) {
      if (!block.trim() || !(block.includes('物件名') || block.includes('住所') || block.includes('価格'))) {
        continue;
      }

      const property: LLMPropertyData = createEmptyPropertyData();

      // Extract property name
      const nameMatch = block.match(/物件名[：:]\s*(.+)[\n\r]/);
      if (nameMatch) property.propertyName = nameMatch[1].trim();

      // Extract address
      const addressMatch = block.match(/住所[：:]\s*(.+)[\n\r]/);
      if (addressMatch) property.address = addressMatch[1].trim();

      // Extract floor
      const floorMatch = block.match(/階数[：:]\s*(.+)[\n\r]/);
      if (floorMatch) property.floor = floorMatch[1].trim();

      // Extract size
      const sizeMatch = block.match(/面積[：:]\s*(.+)[\n\r]/);
      if (sizeMatch) property.size = sizeMatch[1].trim();

      // Extract price
      const priceMatch = block.match(/価格[：:]\s*(.+)[\n\r]/);
      if (priceMatch) property.price = priceMatch[1].trim();

      // Add to properties list if it has essential information
      if (property.address || property.propertyName) {
        properties.push(property);
      }
    }

    return properties;
  } catch (error) {
    console.error("Error parsing LLM property list response:", error);
    return [];
  }
}

// Helper function to convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      let base64 = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      base64 = base64.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

// Helper function to get file MIME type
function getFileType(file: File): string {
  return file.type || 'image/jpeg';
}