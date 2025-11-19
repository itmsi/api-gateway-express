#!/bin/bash

# Test script untuk SSO Login endpoint
# Usage: ./test-sso-login.sh

GATEWAY_URL="http://localhost:9588"
SSO_URL="http://localhost:9518"
ENDPOINT="/api/auth/sso/login"

echo "🧪 Testing SSO Login Endpoint"
echo "================================"
echo ""

# Test 1: Check if SSO service is running
echo "1️⃣  Testing SSO Service Direct Access..."
SSO_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 -X POST "$SSO_URL$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}')

if [ "$SSO_RESPONSE" = "000" ] || [ "$SSO_RESPONSE" = "" ]; then
  echo "❌ SSO Service is not running at $SSO_URL"
  echo "   Please start the SSO service first"
  exit 1
else
  echo "✅ SSO Service is running (HTTP $SSO_RESPONSE)"
fi
echo ""

# Test 2: Test through Gateway
echo "2️⃣  Testing through Gateway..."
GATEWAY_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}\nTIME:%{time_total}" --max-time 15 -X POST "$GATEWAY_URL$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "email": "abdulharris@motorsights.net",
    "password": "QwerMSI2025!"
  }')

HTTP_STATUS=$(echo "$GATEWAY_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
TIME_TAKEN=$(echo "$GATEWAY_RESPONSE" | grep "TIME" | cut -d: -f2)
BODY=$(echo "$GATEWAY_RESPONSE" | sed '/HTTP_STATUS/d' | sed '/TIME/d')

echo "Response Body:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""
echo "HTTP Status: $HTTP_STATUS"
echo "Time Taken: ${TIME_TAKEN}s"
echo ""

# Evaluate result
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ]; then
  echo "✅ SUCCESS: Login successful!"
  exit 0
elif [ "$HTTP_STATUS" = "401" ]; then
  echo "⚠️  UNAUTHORIZED: Credentials may be invalid, but gateway is working"
  exit 0
elif [ "$HTTP_STATUS" = "400" ]; then
  echo "⚠️  BAD REQUEST: Request format issue, but gateway is working"
  exit 0
elif [ "$HTTP_STATUS" = "502" ] || [ "$HTTP_STATUS" = "503" ] || [ "$HTTP_STATUS" = "504" ]; then
  echo "❌ GATEWAY ERROR: $HTTP_STATUS"
  echo "   Check gateway logs for details"
  exit 1
elif [ "$HTTP_STATUS" = "404" ]; then
  echo "❌ NOT FOUND: Route not registered"
  exit 1
elif [ "$HTTP_STATUS" = "000" ] || [ "$HTTP_STATUS" = "" ]; then
  echo "❌ TIMEOUT: Gateway did not respond"
  exit 1
else
  echo "⚠️  UNEXPECTED STATUS: $HTTP_STATUS"
  echo "   Response: $BODY"
  exit 1
fi

