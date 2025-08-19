const fs = require('fs');
const http = require('http');
const { CONFIG } = require('../utils/config');

const ML_MODEL_URL = CONFIG.ML_MODEL.BASE_URL;
const IMAGE_PATH = './banana_6.jpg';

console.log('🚀 Testing Updated ML Model with JSON + Base64...');
console.log(`📍 URL: ${ML_MODEL_URL}/predict`);
console.log(`📁 Image: ${IMAGE_PATH}`);
console.log('');

// Check if image exists
if (!fs.existsSync(IMAGE_PATH)) {
  console.log(`❌ Image file not found: ${IMAGE_PATH}`);
  process.exit(1);
}

// Read the image file and convert to base64
const imageBuffer = fs.readFileSync(IMAGE_PATH);
const base64Image = imageBuffer.toString('base64');

console.log(`📊 Image size: ${imageBuffer.length} bytes`);
console.log(`📊 Base64 length: ${base64Image.length} characters`);
console.log('');

// Test the updated ML model with JSON + base64
console.log('🎯 Testing updated ML model with JSON + base64 format...');

const jsonData = {
  file: base64Image
};

const req = http.request(`${ML_MODEL_URL}/predict`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
}, (res) => {
  console.log(`✅ Connection successful! Status: ${res.statusCode}`);
  console.log(`📡 Headers:`, res.headers);
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (data) {
      console.log(`📄 Response: ${data}`);
      
      if (res.statusCode === 200) {
        console.log(`🎉 SUCCESS! Your updated ML model is working with JSON + base64!`);
        console.log(`📱 This means React Native integration will work perfectly!`);
        
        try {
          const result = JSON.parse(data);
          console.log(`🍌 Identified item: ${result.class_name}`);
          console.log(`♻️ Category: ${result.category}`);
          console.log(`✅ Recyclable: ${result.is_recyclable}`);
          console.log(`🎯 Confidence: ${result.confidence}`);
          console.log('');
          console.log(`🚀 Next steps:`);
          console.log(`   1. Replace your current main.py with ml_model_updated.py`);
          console.log(`   2. Restart your ML model server`);
          console.log(`   3. Test the React Native app - it should now use ML model first!`);
        } catch (e) {
          console.log(`📝 Raw response (not JSON): ${data}`);
        }
      } else if (res.statusCode === 422) {
        console.log(`❌ Still getting validation error. The ML model hasn't been updated yet.`);
        console.log(`📋 You need to:`);
        console.log(`   1. Replace your current main.py with ml_model_updated.py`);
        console.log(`   2. Restart your ML model server`);
        console.log(`   3. Run this test again`);
      } else {
        console.log(`⚠️ Unexpected status code: ${res.statusCode}`);
        console.log(`📄 Response: ${data}`);
      }
    }
  });
});

req.on('error', (err) => {
  console.log(`❌ Connection failed: ${err.message}`);
  console.log('');
  console.log('🔧 Troubleshooting tips:');
  console.log('   • Make sure your ML model is running on port 8000');
  console.log('   • Check if your firewall is blocking the connection');
  console.log('   • Ensure your phone and computer are on the same network');
});

req.on('timeout', () => {
  console.log('⏰ Request timed out');
  req.destroy();
});

req.setTimeout(15000);

console.log(`📤 Sending JSON with base64 data...`);
console.log(`📊 JSON size: ${JSON.stringify(jsonData).length} characters`);
req.write(JSON.stringify(jsonData));
req.end();
