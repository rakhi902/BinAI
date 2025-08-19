import { ScanResult } from "@/hooks/recycling-context";
import { recyclingDatabase } from "@/data/recycling-database";
import { getConfig } from "./config";

// Get configuration
const CONFIG = getConfig();

// Test ML model connectivity
export async function testMLModelConnection(): Promise<boolean> {
  try {
    if (!CONFIG.ML_MODEL.HEALTH_CHECK_URL) {
      // If no health check URL, try a simple ping to the predict endpoint
      const response = await fetch(CONFIG.ML_MODEL.URL, {
        method: "OPTIONS",
        headers: {
          "Content-Type": "application/json",
        },
      });
      return response.status !== 404; // Consider any response other than 404 as "available"
    }
    
    const response = await fetch(CONFIG.ML_MODEL.HEALTH_CHECK_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.ok;
  } catch (error) {
    console.log('ML model health check failed:', error);
    return false;
  }
}

// Get current service status
export async function getServiceStatus() {
  const mlModelAvailable = await testMLModelConnection();
  
  return {
    mlModel: {
      available: mlModelAvailable,
      url: CONFIG.ML_MODEL.URL,
      useFirst: CONFIG.ML_MODEL.USE_FIRST,
      fallbackEnabled: CONFIG.ML_MODEL.FALLBACK_TO_AI,
    },
    aiService: {
      available: true, // Assume AI service is always available as fallback
      url: CONFIG.AI_SERVICE.URL,
    },
    currentStrategy: CONFIG.ML_MODEL.USE_FIRST ? 'ML_FIRST' : 'AI_FIRST',
  };
}

// Switch service priority (useful for testing)
export function switchServicePriority() {
  CONFIG.ML_MODEL.USE_FIRST = !CONFIG.ML_MODEL.USE_FIRST;
  console.log(`Switched to ${CONFIG.ML_MODEL.USE_FIRST ? 'ML model first' : 'AI service first'}`);
  return CONFIG.ML_MODEL.USE_FIRST;
}

interface AIResponse {
  completion: string;
}

interface MLModelResponse {
  class_id: number;
  class_name: string;
  category: string;
  confidence: number;
  is_recyclable: boolean;
  predictions: number[];
}

export async function identifyItemWithML(base64Image: string): Promise<ScanResult> {
  // Try multiple IP addresses if available
  const urlsToTry = (CONFIG.ML_MODEL as any).POSSIBLE_URLS || [CONFIG.ML_MODEL.URL];
  
  for (let i = 0; i < urlsToTry.length; i++) {
    const currentUrl = urlsToTry[i];
    const fullUrl = `${currentUrl}/predict`;
    
    try {
      console.log(`Attempting ML model request ${i + 1}/${urlsToTry.length} to: ${fullUrl}`);
      console.log('Base64 image length:', base64Image.length);
      
      // Clean base64 string (remove data:image/...;base64, prefix if present)
      let cleanBase64 = base64Image;
      if (base64Image.includes(',')) {
        cleanBase64 = base64Image.split(',')[1];
      }
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.ML_MODEL.TIMEOUT);
      
      try {
        // Send request to ML model using JSON with base64 (now supported!)
        const response = await fetch(fullUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            file: cleanBase64,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log(`ML model response from ${fullUrl}:`, response.status, response.ok);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`ML model error from ${fullUrl}:`, response.status, errorText);
          throw new Error(`ML model error: ${response.status} - ${errorText}`);
        }

        const data: MLModelResponse = await response.json();
        console.log('ML model response data:', data);
        
        // Validate required fields
        if (!data.class_name || !data.category || typeof data.is_recyclable !== 'boolean') {
          console.error('Invalid ML model result structure:', data);
          throw new Error('ML model returned invalid result structure');
        }
        
        // Check confidence threshold
        if (data.confidence < CONFIG.APP.CONFIDENCE_THRESHOLD) {
          console.log(`ML model confidence (${data.confidence}) below threshold (${CONFIG.APP.CONFIDENCE_THRESHOLD}), falling back to AI service`);
          throw new Error('Confidence below threshold');
        }
        
        // Get detailed information from our database
        const categoryInfo = recyclingDatabase[data.category] || recyclingDatabase.mixed;
        
        const result: ScanResult = {
          item: data.class_name,
          category: data.category,
          recyclable: data.is_recyclable,
          instructions: getInstructions({ category: data.category, recyclable: data.is_recyclable }),
          alternatives: getAlternatives(data.category),
          impact: categoryInfo.impact,
        };
        
        console.log('Final ML model scan result:', result);
        return result;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.log(`ML model request to ${fullUrl} timed out`);
          throw new Error('ML model request timed out');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error(`ML model attempt ${i + 1} failed for ${fullUrl}:`, error);
      
      // If this is the last attempt, throw the error
      if (i === urlsToTry.length - 1) {
        throw error;
      }
      
      // Otherwise, continue to next URL
      console.log(`Trying next URL...`);
      continue;
    }
  }
  
  // This should never be reached, but just in case
  throw new Error('All ML model URLs failed');
}

export async function identifyItem(base64Image: string): Promise<ScanResult> {
  try {
    if (CONFIG.ML_MODEL.USE_FIRST) {
      // Try ML model first
      console.log('Attempting ML model identification...');
      try {
        return await identifyItemWithML(base64Image);
      } catch (error) {
        if (CONFIG.ML_MODEL.FALLBACK_TO_AI) {
          console.log('ML model failed, falling back to AI service...');
          return await identifyItemWithAI(base64Image);
        } else {
          throw error;
        }
      }
    } else {
      // Use AI service first
      console.log('Attempting AI service identification...');
      try {
        return await identifyItemWithAI(base64Image);
      } catch (error) {
        if (CONFIG.ML_MODEL.FALLBACK_TO_AI) {
          console.log('AI service failed, falling back to ML model...');
          return await identifyItemWithML(base64Image);
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    console.error("All identification methods failed:", error);
    // Return fallback result
    return {
      item: "Unknown Item",
      category: "mixed",
      recyclable: false,
      instructions: "Unable to identify this item. Please check with your local recycling center for proper disposal instructions.",
      alternatives: ["Consider reusable alternatives", "Reduce consumption when possible"],
      impact: "Proper waste disposal helps protect our environment.",
    };
  }
}

async function identifyItemWithAI(base64Image: string): Promise<ScanResult> {
  try {
    console.log('Starting AI identification request...');
    console.log('Base64 image length:', base64Image.length);
    
    const requestBody = {
      messages: [
        {
          role: "system",
          content: `You are a recycling expert AI. Analyze the image to identify the main item and determine if it's recyclable.
            
            Respond in this exact JSON format:
            {
              "item": "specific item name",
              "category": "one of: plastic, paper, glass, metal, organic, electronic, hazardous, mixed",
              "recyclable": true or false
            }
            
            Be accurate about recycling classification based on common recycling guidelines.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Identify this item and tell me if it's recyclable.",
            },
            {
              type: "image",
              image: base64Image,
            },
          ],
        },
      ],
    };
    
    console.log('Making request to AI service...');
    const response = await fetch("https://toolkit.rork.com/text/llm/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log('AI service response status:', response.status);
    console.log('AI service response ok:', response.ok);

    if (!response.ok) {
      console.error('AI service error:', response.status);
      // Return fallback result instead of throwing
      return {
        item: "Unknown Item",
        category: "mixed",
        recyclable: false,
        instructions: "Unable to identify this item. Please check with your local recycling center for proper disposal instructions.",
        alternatives: ["Consider reusable alternatives", "Reduce consumption when possible"],
        impact: "Proper waste disposal helps protect our environment.",
      };
    }

    const data: AIResponse = await response.json();
    console.log('AI service response data:', data);
    
    if (!data.completion) {
      console.error('No completion in AI response:', data);
      return {
        item: "Unknown Item",
        category: "mixed",
        recyclable: false,
        instructions: "Unable to identify this item. Please check with your local recycling center for proper disposal instructions.",
        alternatives: ["Consider reusable alternatives", "Reduce consumption when possible"],
        impact: "Proper waste disposal helps protect our environment.",
      };
    }
    
    try {
      console.log('Parsing AI completion:', data.completion);
      const aiResult = JSON.parse(data.completion);
      console.log('Parsed AI result:', aiResult);
      
      // Validate required fields
      if (!aiResult.item || !aiResult.category || typeof aiResult.recyclable !== 'boolean') {
        console.error('Invalid AI result structure:', aiResult);
        return {
          item: "Unknown Item",
          category: "mixed",
          recyclable: false,
          instructions: "Unable to identify this item. Please check with your local recycling center for proper disposal instructions.",
          alternatives: ["Consider reusable alternatives", "Reduce consumption when possible"],
          impact: "Proper waste disposal helps protect our environment.",
        };
      }
      
      // Get detailed information from our database
      const categoryInfo = recyclingDatabase[aiResult.category] || recyclingDatabase.mixed;
      
      const result = {
        item: aiResult.item,
        category: aiResult.category,
        recyclable: aiResult.recyclable,
        instructions: getInstructions(aiResult),
        alternatives: getAlternatives(aiResult.category),
        impact: categoryInfo.impact,
      };
      
      console.log('Final scan result:', result);
      return result;
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      console.error("Raw AI completion:", data.completion);
      // Fallback response
      return {
        item: "Unknown Item",
        category: "mixed",
        recyclable: false,
        instructions: "Unable to identify this item. Please check with your local recycling center for proper disposal instructions.",
        alternatives: ["Consider reusable alternatives", "Reduce consumption when possible"],
        impact: "Proper waste disposal helps protect our environment.",
      };
    }
  } catch (error) {
    console.error("Error identifying item:", error);
    // Return fallback instead of throwing
    return {
      item: "Unknown Item",
      category: "mixed",
      recyclable: false,
      instructions: "Unable to identify this item. Please check with your local recycling center for proper disposal instructions.",
      alternatives: ["Consider reusable alternatives", "Reduce consumption when possible"],
      impact: "Proper waste disposal helps protect our environment.",
    };
  }
}

function getInstructions(aiResult: any): string {
  const categoryInfo = recyclingDatabase[aiResult.category];
  
  if (!categoryInfo) {
    return "Check with your local recycling center for proper disposal.";
  }

  if (aiResult.recyclable) {
    return categoryInfo.instructions.recyclable;
  } else {
    return categoryInfo.instructions.nonRecyclable;
  }
}

export async function identifyBarcode(base64Image: string): Promise<ScanResult> {
  try {
    console.log('Starting barcode identification request...');
    console.log('Base64 image length:', base64Image.length);
    
    const requestBody = {
      messages: [
        {
          role: "system",
          content: `You are a barcode scanning expert AI. Analyze the image to detect and read barcodes, then provide recycling information for the product.
            
            Respond in this exact JSON format:
            {
              "item": "product name from barcode",
              "category": "one of: plastic, paper, glass, metal, organic, electronic, hazardous, mixed",
              "material": "specific material type",
              "recyclable": true or false,
              "barcode": "detected barcode number if visible"
            }
            
            If no barcode is detected, analyze the visible product instead.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Scan this barcode and identify the product's recycling information.",
            },
            {
              type: "image",
              image: base64Image,
            },
          ],
        },
      ],
    };
    
    console.log('Making barcode request to AI service...');
    const response = await fetch("https://toolkit.rork.com/text/llm/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Barcode AI service response status:', response.status);
    console.log('Barcode AI service response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Barcode AI service error response:', errorText);
      throw new Error(`AI service error: ${response.status} - ${errorText}`);
    }

    const data: AIResponse = await response.json();
    console.log('Barcode AI service response data:', data);
    
    if (!data.completion) {
      console.error('No completion in barcode AI response:', data);
      throw new Error('AI service returned empty completion');
    }
    
    try {
      console.log('Parsing barcode AI completion:', data.completion);
      const aiResult = JSON.parse(data.completion);
      console.log('Parsed barcode AI result:', aiResult);
      
      // Validate required fields
      if (!aiResult.item || !aiResult.category || typeof aiResult.recyclable !== 'boolean') {
        console.error('Invalid barcode AI result structure:', aiResult);
        throw new Error('AI returned invalid result structure');
      }
      
      const categoryInfo = recyclingDatabase[aiResult.category] || recyclingDatabase.mixed;
      
      const result = {
        item: aiResult.item,
        category: aiResult.category,
        recyclable: aiResult.recyclable,
        instructions: getInstructions(aiResult),
        alternatives: getAlternatives(aiResult.category),
        impact: categoryInfo.impact,
      };
      
      console.log('Final barcode scan result:', result);
      return result;
    } catch (parseError) {
      console.error("Error parsing barcode AI response:", parseError);
      console.error("Raw barcode AI completion:", data.completion);
      return {
        item: "Unknown Product",
        category: "mixed",
        recyclable: false,
        instructions: "Barcode not recognized. Please check the product packaging for recycling symbols.",
        alternatives: ["Look for recycling symbols on packaging", "Check manufacturer's website"],
        impact: "Proper identification helps with correct recycling.",
      };
    }
  } catch (error) {
    console.error("Error scanning barcode:", error);
    console.error("Barcode error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

export async function searchItem(query: string): Promise<ScanResult> {
  try {
    console.log('Starting search request for query:', query);
    
    const requestBody = {
      messages: [
        {
          role: "system",
          content: `You are a comprehensive recycling database AI. Based on the item name provided, give detailed recycling information.
            
            Respond in this exact JSON format:
            {
              "item": "cleaned up item name",
              "category": "one of: plastic, paper, glass, metal, organic, electronic, hazardous, mixed",
              "material": "specific material type",
              "recyclable": true or false,
              "commonVariations": ["list of similar items"]
            }
            
            Be comprehensive and accurate about recycling guidelines.`,
        },
        {
          role: "user",
          content: `What are the recycling guidelines for: ${query}`,
        },
      ],
    };
    
    console.log('Making search request to AI service...');
    const response = await fetch("https://toolkit.rork.com/text/llm/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Search AI service response status:', response.status);
    console.log('Search AI service response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Search AI service error response:', errorText);
      throw new Error(`AI service error: ${response.status} - ${errorText}`);
    }

    const data: AIResponse = await response.json();
    console.log('Search AI service response data:', data);
    
    if (!data.completion) {
      console.error('No completion in search AI response:', data);
      throw new Error('AI service returned empty completion');
    }
    
    try {
      console.log('Parsing search AI completion:', data.completion);
      const aiResult = JSON.parse(data.completion);
      console.log('Parsed search AI result:', aiResult);
      
      // Validate required fields
      if (!aiResult.item || !aiResult.category || typeof aiResult.recyclable !== 'boolean') {
        console.error('Invalid search AI result structure:', aiResult);
        throw new Error('AI returned invalid result structure');
      }
      
      const categoryInfo = recyclingDatabase[aiResult.category] || recyclingDatabase.mixed;
      
      const result = {
        item: aiResult.item,
        category: aiResult.category,
        recyclable: aiResult.recyclable,
        instructions: getInstructions(aiResult),
        alternatives: getAlternatives(aiResult.category),
        impact: categoryInfo.impact,
      };
      
      console.log('Final search result:', result);
      return result;
    } catch (parseError) {
      console.error("Error parsing search AI response:", parseError);
      console.error("Raw search AI completion:", data.completion);
      return {
        item: query,
        category: "mixed",
        recyclable: false,
        instructions: "Unable to find specific recycling information for this item. Please check with your local recycling center.",
        alternatives: ["Contact local recycling center", "Check manufacturer guidelines"],
        impact: "Proper disposal helps protect the environment.",
      };
    }
  } catch (error) {
    console.error("Error searching item:", error);
    console.error("Search error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

function getAlternatives(category: string): string[] {
  const alternatives: Record<string, string[]> = {
    plastic: [
      "Use reusable bags instead of plastic bags",
      "Choose products with minimal packaging",
      "Opt for glass or metal containers",
    ],
    paper: [
      "Go digital when possible",
      "Use both sides of paper",
      "Choose recycled paper products",
    ],
    glass: [
      "Reuse glass jars for storage",
      "Return bottles for deposit where available",
    ],
    metal: [
      "Choose products with refillable options",
      "Donate or sell metal items instead of discarding",
    ],
    electronic: [
      "Repair devices instead of replacing",
      "Donate working electronics",
      "Trade in old devices",
    ],
  };

  return alternatives[category] || [
    "Reduce consumption",
    "Reuse when possible",
    "Choose sustainable alternatives",
  ];
}