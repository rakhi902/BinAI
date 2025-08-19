const fs = require('fs');
const http = require('http');
const { CONFIG } = require('../utils/config');

const ML_MODEL_URL = CONFIG.ML_MODEL.BASE_URL;
const IMAGE_PATH = './banana_6.jpg';

console.log('📱 Testing JSON with Base64 Format...');
console.log(`📍 URL: ${ML_MODEL_URL}/predict`);
console.log(`📁 Image: ${IMAGE_PATH}`);
console.log('');

// Read the image file and convert to base64
const imageBuffer = fs.readFileSync(IMAGE_PATH);
const base64Image = imageBuffer.toString('base64');

console.log(`📊 Image size: ${imageBuffer.length} bytes`);
console.log(`📊 Base64 length: ${base64Image.length} characters`);
console.log('');

// Test JSON format with base64 data
console.log('🎯 Testing JSON format with base64 data...');

const jsonData = {
  file: base64Image,
  format: "base64"
};

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
        console.log(`🎉 SUCCESS! JSON with base64 format works!`);
        console.log(`📋 This is perfect for React Native!`);
        
        try {
          const result = JSON.parse(data);
          console.log(`🍌 Identified item: ${result.class_name}`);
          console.log(`♻️ Category: ${result.category}`);
          console.log(`✅ Recyclable: ${result.is_recyclable}`);
          console.log(`🎯 Confidence: ${result.confidence}`);
        } catch (e) {
          console.log(`📝 Raw response (not JSON): ${data}`);
        }
      } else if (res.statusCode === 422) {
        console.log(`❌ Validation error. Let's check the exact error:`);
        try {
          const errorData = JSON.parse(data);
          console.log(`🔍 Error details:`, JSON.stringify(errorData, null, 2));
        } catch (e) {
          console.log(`🔍 Raw error:`, data);
        }
      } else {
        console.log(`⚠️ Unexpected status code: ${res.statusCode}`);
        console.log(`📄 Response: ${data}`);
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

req.setTimeout(15000);

console.log(`📤 Sending JSON with base64 data...`);
console.log(`📊 JSON size: ${JSON.stringify(jsonData).length} characters`);
req.write(JSON.stringify(jsonData));
req.end();

// Test different JSON formats
const testFormats = [
  {
    name: 'Format 1: file field with base64',
    data: { file: base64Image }
  },
  {
    name: 'Format 2: image field with base64',
    data: { image: base64Image }
  },
  {
    name: 'Format 3: data field with base64',
    data: { data: base64Image }
  },
  {
    name: 'Format 4: base64 field directly',
    data: { base64: base64Image }
  },
  {
    name: 'Format 5: file field with format hint',
    data: { file: base64Image, format: "base64" }
  }
];

let currentTest = 0;

function runTest() {
  if (currentTest >= testFormats.length) {
    console.log('\n🏁 All tests completed!');
    console.log('\n🔍 Analysis:');
    console.log('   • All JSON formats are failing');
    console.log('   • The ML model only accepts multipart form data with binary files');
    console.log('\n💡 Solution:');
    console.log('   1. Use a React Native multipart library');
    console.log('   2. Or modify your ML model to accept base64 JSON');
    console.log('   3. Or use the AI service fallback for now');
    return;
  }

  const test = testFormats[currentTest];
  console.log(`\n${currentTest + 1}️⃣ ${test.name}...`);
  
  const req = http.request(`${ML_MODEL_URL}/predict`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  }, (res) => {
    console.log(`✅ Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (data) {
        console.log(`📄 Response: ${data.substring(0, 200)}...`);
        
        if (res.statusCode === 200) {
          console.log(`🎉 SUCCESS! ${test.name} worked!`);
        }
      }
      
      currentTest++;
      setTimeout(runTest, 1000);
    });
  });

  req.on('error', (err) => {
    console.log(`❌ Error: ${err.message}`);
    currentTest++;
    setTimeout(runTest, 1000);
  });

  req.on('timeout', () => {
    console.log('⏰ Timeout');
    req.destroy();
    currentTest++;
    setTimeout(runTest, 1000);
  });

  req.setTimeout(8000);
  
  const jsonData = JSON.stringify(test.data);
  console.log(`📤 Sending: ${jsonData.substring(0, 100)}...`);
  req.write(jsonData);
  req.end();
}

// Start testing
runTest();
