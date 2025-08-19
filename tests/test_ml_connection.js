const http = require('http');
const { CONFIG } = require('../utils/config');

const ML_MODEL_URL = CONFIG.ML_MODEL.BASE_URL;
const TEST_IMAGE = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='; // 1x1 pixel PNG

console.log('🧪 Testing ML Model Connection...');
console.log(`📍 URL: ${ML_MODEL_URL}/predict`);
console.log('');

// Test the file field format that the ML model expects
console.log('🎯 Testing with file field (what the ML model expects)...');

const req = http.request(`${ML_MODEL_URL}/predict`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
}, (res) => {
  console.log(`✅ Connection successful! Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (data) {
      console.log(`📄 Response: ${data}`);
      
      if (res.statusCode === 200) {
        console.log(`🎉 SUCCESS! The file field format worked!`);
        console.log(`📋 Use this format in your ai-service.ts:`);
        console.log(`   body: JSON.stringify({ file: cleanBase64 })`);
      } else if (res.statusCode === 422) {
        console.log(`❌ Still getting validation error. Let's check the exact error:`);
        try {
          const errorData = JSON.parse(data);
          console.log(`🔍 Error details:`, JSON.stringify(errorData, null, 2));
        } catch (e) {
          console.log(`🔍 Raw error:`, data);
        }
      }
    }
  });
});

req.on('error', (err) => {
  console.log(`❌ Connection failed: ${err.message}`);
});

req.on('timeout', () => {
  console.log('⏰ Request timed out');
  req.destroy();
});

req.setTimeout(10000);

// Send request with file field
const testData = JSON.stringify({
  file: TEST_IMAGE
});

console.log(`📤 Sending request with file field...`);
console.log(`📊 Image size: ${TEST_IMAGE.length} characters`);
req.write(testData);
req.end();
