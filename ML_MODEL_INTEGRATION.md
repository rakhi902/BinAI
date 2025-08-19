# ML Model Integration Guide

This document explains how to use the ML model integration in the recycling app.

## 🎯 **Current Status**

✅ **ML Model Working**: Your model at `http://10.22.209.65:8000/predict` is working perfectly!
- Successfully identified banana image with 81.9% confidence
- Returns proper JSON responses
- Network connectivity is working

❌ **Integration Issue**: The ML model expects multipart form data with binary files, but React Native doesn't have built-in support for this.

## 🔧 **Solutions (Choose One)**

### **Option 1: Use React Native Multipart Library (Recommended)**

Install libraries to handle multipart form data:

```bash
npm install react-native-fs react-native-blob-util
```

Then update `utils/ai-service.ts` to use these libraries for proper file uploads.

**Pros**: Full ML model integration, better performance
**Cons**: More complex setup, additional dependencies

### **Option 2: Modify Your ML Model (Easier)**

Update your ML model to accept base64 data in JSON format:

```python
# In your ML model API
@app.post("/predict")
async def predict(request: Request):
    data = await request.json()
    base64_image = data.get("file")  # Accept base64 in JSON
    # Process base64 image...
```

**Pros**: Simple integration, no additional dependencies
**Cons**: Requires ML model changes, larger request payloads

### **Option 3: Use AI Service Fallback (Immediate)**

Keep current setup - app automatically falls back to AI service when ML model fails.

**Pros**: Works immediately, no changes needed
**Cons**: No ML model benefits, slower processing

## 📋 **Current Configuration**

```typescript
ML_MODEL: {
  URL: "http://10.22.209.65:8000/predict",
  USE_FIRST: false, // Currently disabled
  FALLBACK_TO_AI: true, // Falls back to AI service
}
```

## 🧪 **Testing Results**

Your ML model successfully processed `banana_6.jpg`:
```json
{
  "class_id": 0,
  "class_name": "banana",
  "category": "trash",
  "confidence": 0.8190134167671204,
  "is_recyclable": false,
  "predictions": [0.819, 0.013, 0.003, ...]
}
```

## 🚀 **Next Steps**

1. **Choose your preferred solution** from the options above
2. **Update the configuration** in `utils/config.ts`
3. **Test the integration** with real images
4. **Monitor performance** and adjust as needed

## 📱 **App Behavior**

- **Current**: Uses AI service first, ML model as backup
- **With ML Model**: Will use ML model first, AI service as fallback
- **Automatic Fallback**: Always available if either service fails

## 🔍 **Debugging**

Check the console for:
- Service selection logs
- Request/response details
- Fallback service usage
- Error details and troubleshooting

## 📞 **Need Help?**

- **ML Model Issues**: Check your FastAPI logs
- **Network Issues**: Verify IP address and firewall settings
- **Integration Issues**: Check the console logs in the app

chmod +x find_ip.sh && ./find_ip.sh