// Configuration for the recycling app
export const CONFIG = {
  // ML Model Configuration
  ML_MODEL: {
    BASE_URL: "http://192.168.1.70:8000",
    // Use your computer's local IP address instead of localhost
    // Find this by running 'ipconfig' on Windows or 'ifconfig' on Mac/Linux
    // URL: "http://10.22.209.65:8000/predict", // Your actual IP address
    URL: "http://192.168.1.70:8000/predict", // Your actual IP address
    HEALTH_CHECK_URL: "http://192.168.1.70:8000/health", // Optional health check endpoint
    TIMEOUT: 30000, // 30 seconds timeout
    USE_FIRST: true, // Now enabled - ML model supports JSON with base64!
    FALLBACK_TO_AI: true, // Whether to fallback to AI service if ML model fails
  },
  
  // AI Service Configuration
  AI_SERVICE: {
    URL: "https://toolkit.rork.com/text/llm/",
    TIMEOUT: 30000, // 30 seconds timeout
  },
  
  // App Configuration
  APP: {
    MAX_SCAN_HISTORY: 50,
    CONFIDENCE_THRESHOLD: 0.7, // Minimum confidence for ML model results
    IMAGE_QUALITY: 0.7, // Image quality for camera captures
  }
};

// Environment-specific overrides
export const getConfig = () => {
  // You can add environment-specific logic here
  // For example, use different URLs for development vs production
  
  if (__DEV__) {
    // Development environment - try multiple IP addresses
    const possibleIPs = [
      "http://192.168.1.70:8000", // Your actual IP address
      "http://10.22.209.65:8000", 
      "http://10.0.0.100:8000",   // Common router IP
      "http://172.16.0.100:8000", // Common local network IP
      "http://localhost:8000",    // Fallback to localhost
    ];
    
    return {
      ...CONFIG,
      ML_MODEL: {
        ...CONFIG.ML_MODEL,
        URL: possibleIPs[0], // Use first IP by default
        HEALTH_CHECK_URL: possibleIPs[0].replace('/predict', '/health'),
        // Add all possible IPs for testing
        POSSIBLE_URLS: possibleIPs,
      }
    };
  } else {
    // Production environment
    return {
      ...CONFIG,
      ML_MODEL: {
        ...CONFIG.ML_MODEL,
        URL: "https://your-production-ml-endpoint.com/predict",
      }
    };
  }
};
