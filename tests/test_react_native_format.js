const fs = require('fs');
const http = require('http');
const { CONFIG } = require('../utils/config');

const ML_MODEL_URL = CONFIG.ML_MODEL.BASE_URL;
const IMAGE_PATH = './banana_6.jpg';

console.log('📱 Testing React Native Compatible Format...');
console.log(`📍 URL: ${ML_MODEL_URL}/predict`);
console.log(`📁 Image: ${IMAGE_PATH}`);
console.log('');

// Read the image file and convert to base64 (simulating what React Native would do)
const imageBuffer = fs.readFileSync(IMAGE_PATH);
const base64Image = imageBuffer.toString('base64');

console.log(`📊 Image size: ${imageBuffer.length} bytes`);
console.log(`📊 Base64 length: ${base64Image.length} characters`);
console.log('');

// Simulate the React Native approach
console.log('🎯 Testing React Native compatible format...');

// Convert base64 to binary data (simulating atob in React Native)
const byteCharacters = Buffer.from(base64Image, 'base64');
const byteArray = new Uint8Array(byteCharacters);

// Build multipart form data manually (React Native style)
const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substr(2, 9);

let formData = '';
formData += `--${boundary}\r\n`;
formData += `Content-Disposition: form-data; name="file"; filename="image.jpg"\r\n`;
formData += `Content-Type: image/jpeg\r\n\r\n`;

// Convert binary data to string for the request body
// Use a more memory-efficient approach for large images
let binaryString = '';
for (let i = 0; i < byteArray.length; i++) {
  binaryString += String.fromCharCode(byteArray[i]);
}
formData += binaryString;
formData += `\r\n--${boundary}--\r\n`;

const req = http.request(`${ML_MODEL_URL}/predict`, {
  method: 'POST',
  headers: {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
  }
}, (res) => {
  console.log(`✅ Connection successful! Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (data) {
      console.log(`📄 Response: ${data}`);
      
      if (res.statusCode === 200) {
        console.log(`🎉 SUCCESS! React Native format works!`);
        console.log(`📋 Your ML model integration is ready!`);
        
        try {
          const result = JSON.parse(data);
          console.log(`🍌 Identified item: ${result.class_name}`);
          console.log(`♻️ Category: ${result.category}`);
          console.log(`✅ Recyclable: ${result.is_recyclable}`);
          console.log(`🎯 Confidence: ${result.confidence}`);
        } catch (e) {
          console.log(`📝 Raw response (not JSON): ${data}`);
        }
      } else {
        console.log(`❌ Error: ${res.statusCode}`);
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

console.log(`📤 Sending React Native compatible multipart data...`);
console.log(`🔗 Boundary: ${boundary}`);
console.log(`📊 Form data size: ${formData.length} characters`);
req.write(formData);
req.end();
