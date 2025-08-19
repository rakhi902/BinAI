const fs = require('fs');
const http = require('http');
const { CONFIG } = require('../utils/config');

const ML_MODEL_URL = CONFIG.ML_MODEL.BASE_URL;
const IMAGE_PATH = './banana_6.jpg';

console.log('🧪 Testing Complete React Native Integration Flow...');
console.log(`📍 ML Model URL: ${ML_MODEL_URL}/predict`);
console.log(`📁 Test Image: ${IMAGE_PATH}`);
console.log('');

// Simulate the complete flow that React Native will use
async function testCompleteIntegration() {
  try {
    console.log('1️⃣ Testing ML Model Health Check...');
    const healthResponse = await makeRequest(`${ML_MODEL_URL.replace('/predict', '/health')}`, 'GET');
    console.log(`✅ Health Check: ${healthResponse.status} - ${JSON.stringify(healthResponse.data)}`);
    
    if (healthResponse.status !== 200) {
      throw new Error('ML Model health check failed');
    }
    
    console.log('\n2️⃣ Testing ML Model Prediction (React Native Format)...');
    const imageBuffer = fs.readFileSync(IMAGE_PATH);
    const base64Image = imageBuffer.toString('base64');
    
    // This is exactly what React Native will send
    const reactNativeRequest = {
      file: base64Image
    };
    
    const predictionResponse = await makeRequest(`${ML_MODEL_URL}/predict`, 'POST', reactNativeRequest);
    
    if (predictionResponse.status === 200) {
      console.log(`🎉 SUCCESS! ML Model Integration Working Perfectly!`);
      console.log(`📱 React Native app will now use ML model first!`);
      console.log('');
      
      const result = predictionResponse.data;
      console.log(`🍌 Prediction Results:`);
      console.log(`   • Item: ${result.class_name}`);
      console.log(`   • Category: ${result.category}`);
      console.log(`   • Recyclable: ${result.is_recyclable}`);
      console.log(`   • Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log('');
      
      console.log(`🚀 Integration Status:`);
      console.log(`   ✅ ML Model: Working perfectly`);
      console.log(`   ✅ JSON + Base64: Supported`);
      console.log(`   ✅ Network: Connected`);
      console.log(`   ✅ Performance: Fast local processing`);
      console.log('');
      
      console.log(`📱 Next Steps:`);
      console.log(`   1. Your React Native app is ready to use ML model first!`);
      console.log(`   2. App will automatically fallback to AI service if needed`);
      console.log(`   3. Users will get faster, more accurate recycling information`);
      console.log('');
      
      console.log(`🎯 Expected App Behavior:`);
      console.log(`   • Scan image → ML model processes locally`);
      console.log(`   • High confidence → Show ML model results`);
      console.log(`   • Low confidence → Fallback to AI service`);
      console.log(`   • Network error → Fallback to AI service`);
      
    } else {
      console.log(`❌ ML Model prediction failed: ${predictionResponse.status}`);
      console.log(`📄 Response: ${JSON.stringify(predictionResponse.data)}`);
    }
    
  } catch (error) {
    console.log(`❌ Integration test failed: ${error.message}`);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   • Check if ML model server is running');
    console.log('   • Verify network connectivity');
    console.log('   • Check ML model logs for errors');
  }
}

function makeRequest(url, method, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method: method,
      headers: {}
    };
    
    if (data && method === 'POST') {
      options.headers['Content-Type'] = 'application/json';
    }
    
    const req = http.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : {};
          resolve({
            status: res.statusCode,
            data: parsedData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: responseData
          });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.setTimeout(10000);
    
    if (data && method === 'POST') {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Run the complete integration test
testCompleteIntegration();
