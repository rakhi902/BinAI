const fs = require('fs');
const http = require('http');
const { CONFIG } = require('../utils/config');

const ML_MODEL_URL = CONFIG.ML_MODEL.BASE_URL;
const IMAGE_PATH = './banana_6.jpg';

console.log('🍌 Testing ML Model with Real Banana Image...');
console.log(`📍 URL: ${ML_MODEL_URL}/predict`);
console.log(`📁 Image: ${IMAGE_PATH}`);
console.log('');

// Check if image exists
if (!fs.existsSync(IMAGE_PATH)) {
  console.log(`❌ Image file not found: ${IMAGE_PATH}`);
  process.exit(1);
}

// Read the image file
const imageBuffer = fs.readFileSync(IMAGE_PATH);
const base64Image = imageBuffer.toString('base64');

console.log(`📊 Image size: ${imageBuffer.length} bytes`);
console.log(`📊 Base64 length: ${base64Image.length} characters`);
console.log('');

// Test multipart form data format
console.log('🎯 Testing multipart form data format...');

// Create multipart form data boundary
const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substr(2, 9);

// Build multipart form data with actual binary image data
let formData = Buffer.alloc(0);

// Add the file field header
const header = Buffer.from(
  `--${boundary}\r\n` +
  `Content-Disposition: form-data; name="file"; filename="banana_6.jpg"\r\n` +
  `Content-Type: image/jpeg\r\n\r\n`
);
formData = Buffer.concat([formData, header]);

// Add the actual image binary data
formData = Buffer.concat([formData, imageBuffer]);

// Add the closing boundary
const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
formData = Buffer.concat([formData, footer]);

const req = http.request(`${ML_MODEL_URL}/predict`, {
  method: 'POST',
  headers: {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': formData.length
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
        console.log(`🎉 SUCCESS! The multipart form data format worked!`);
        console.log(`📋 Your ML model is working correctly!`);
        
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
        console.log(`❌ Still getting validation error. Let's check the exact error:`);
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

req.setTimeout(15000); // 15 seconds timeout for larger image

console.log(`📤 Sending multipart form data with binary image...`);
console.log(`🔗 Boundary: ${boundary}`);
console.log(`📊 Form data size: ${formData.length} bytes`);
req.write(formData);
req.end();
