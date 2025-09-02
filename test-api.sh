#!/bin/bash

echo "🧪 Testing WhatsApp MCP SSE API..."

BASE_URL="http://localhost:3000"

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s "$BASE_URL/health" | jq '.' || echo "❌ Health check failed"

echo -e "\n2. Testing QR code endpoint..."
curl -s "$BASE_URL/qr/default" | jq '.' || echo "❌ QR code endpoint failed"

echo -e "\n3. Testing session status..."
curl -s "$BASE_URL/status/default" | jq '.' || echo "❌ Session status failed"

echo -e "\n4. Testing webhooks list..."
curl -s "$BASE_URL/webhooks" | jq '.' || echo "❌ Webhooks list failed"

echo -e "\n5. Testing SSE info..."
curl -s "$BASE_URL/sse/info" | jq '.' || echo "❌ SSE info failed"

echo -e "\n✅ API testing completed!"
