#!/bin/bash

echo "🔍 Finding your computer's IP address..."
echo ""

# For macOS/Linux
if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "📱 Your computer's IP addresses:"
    echo ""
    
    # Get all network interfaces
    ifconfig | grep -E "inet " | grep -v 127.0.0.1 | while read -r line; do
        ip=$(echo $line | awk '{print $2}')
        interface=$(echo $line | awk '{print $1}' | sed 's/://')
        echo "  🌐 $interface: $ip"
    done
    
    echo ""
    echo "💡 Use one of these IP addresses in your config.ts file"
    echo "   Replace '192.168.1.100' with your actual IP address"
    
# For Windows
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    echo "📱 Your computer's IP addresses:"
    echo ""
    ipconfig | findstr "IPv4"
    echo ""
    echo "💡 Use one of these IP addresses in your config.ts file"
    echo "   Replace '192.168.1.100' with your actual IP address"
else
    echo "❌ Unsupported operating system"
    echo "💡 Please run 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux) manually"
fi

echo ""
echo "📋 Steps to fix the network issue:"
echo "1. Find your IP address above"
echo "2. Update utils/config.ts with your actual IP"
echo "3. Make sure your phone and computer are on the same WiFi network"
echo "4. Ensure your ML model is running on port 8000"
echo "5. Test the connection"
echo ""
echo "🔧 Example config update:"
echo "   URL: \"http://YOUR_ACTUAL_IP:8000/predict\""
