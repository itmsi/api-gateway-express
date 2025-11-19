#!/bin/bash

# Test script untuk SSO Login melalui API Gateway
# Usage: ./test-sso-login.sh

GATEWAY_URL="http://localhost:9588"
DESTINATION_URL="http://localhost:9518"
ENDPOINT="/api/auth/sso/login"

# Colors untuk output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Test SSO Login - API Gateway${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test 1: Test langsung ke API destinasi (tanpa gateway)
echo -e "${YELLOW}Test 1: Test langsung ke API destinasi${NC}"
echo -e "${YELLOW}URL: ${DESTINATION_URL}${ENDPOINT}${NC}"
echo ""

RESPONSE_DIRECT=$(curl -s -w "\n%{http_code}" --location "${DESTINATION_URL}${ENDPOINT}" \
  --header 'accept: application/json' \
  --header 'Content-Type: application/json' \
  --data-raw '{
  "email": "abdulharris@motorsights.net",
  "password": "QwerMSI2025!",
  "client_id": "string",
  "redirect_uri": "string"
}')

HTTP_CODE_DIRECT=$(echo "$RESPONSE_DIRECT" | tail -n1)
BODY_DIRECT=$(echo "$RESPONSE_DIRECT" | sed '$d')

echo -e "HTTP Status: ${HTTP_CODE_DIRECT}"
echo -e "Response Body:"
echo "$BODY_DIRECT" | jq '.' 2>/dev/null || echo "$BODY_DIRECT"
echo ""
echo -e "${BLUE}----------------------------------------${NC}"
echo ""

# Test 2: Test melalui API Gateway
echo -e "${YELLOW}Test 2: Test melalui API Gateway${NC}"
echo -e "${YELLOW}URL: ${GATEWAY_URL}${ENDPOINT}${NC}"
echo ""

RESPONSE_GATEWAY=$(curl -s -w "\n%{http_code}" --location "${GATEWAY_URL}${ENDPOINT}" \
  --header 'Accept: application/json, text/plain, */*' \
  --header 'Accept-Language: en-US,en;q=0.9' \
  --header 'Connection: keep-alive' \
  --header 'Content-Type: application/json' \
  --header 'Origin: http://localhost:9549' \
  --header 'Referer: http://localhost:9549/' \
  --header 'Sec-Fetch-Dest: empty' \
  --header 'Sec-Fetch-Mode: cors' \
  --header 'Sec-Fetch-Site: cross-site' \
  --header 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36' \
  --header 'sec-ch-ua: "Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"' \
  --header 'sec-ch-ua-mobile: ?0' \
  --header 'sec-ch-ua-platform: "macOS"' \
  --data-raw '{
    "email": "abdulharris@motorsights.net",
    "password": "QwerMSI2025!"
}')

HTTP_CODE_GATEWAY=$(echo "$RESPONSE_GATEWAY" | tail -n1)
BODY_GATEWAY=$(echo "$RESPONSE_GATEWAY" | sed '$d')

echo -e "HTTP Status: ${HTTP_CODE_GATEWAY}"
echo -e "Response Body:"
echo "$BODY_GATEWAY" | jq '.' 2>/dev/null || echo "$BODY_GATEWAY"
echo ""
echo -e "${BLUE}----------------------------------------${NC}"
echo ""

# Test 3: Test static proxy endpoint
echo -e "${YELLOW}Test 3: Test static proxy endpoint${NC}"
echo -e "${YELLOW}URL: ${GATEWAY_URL}/test/proxy-static${ENDPOINT}${NC}"
echo ""

RESPONSE_STATIC=$(curl -s -w "\n%{http_code}" --location "${GATEWAY_URL}/test/proxy-static${ENDPOINT}" \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "email": "abdulharris@motorsights.net",
    "password": "QwerMSI2025!"
}')

HTTP_CODE_STATIC=$(echo "$RESPONSE_STATIC" | tail -n1)
BODY_STATIC=$(echo "$RESPONSE_STATIC" | sed '$d')

echo -e "HTTP Status: ${HTTP_CODE_STATIC}"
echo -e "Response Body:"
echo "$BODY_STATIC" | jq '.' 2>/dev/null || echo "$BODY_STATIC"
echo ""
echo -e "${BLUE}----------------------------------------${NC}"
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$HTTP_CODE_DIRECT" = "200" ] || [ "$HTTP_CODE_DIRECT" = "201" ]; then
  echo -e "Test 1 (Direct API): ${GREEN}✓ PASS${NC} (HTTP $HTTP_CODE_DIRECT)"
else
  echo -e "Test 1 (Direct API): ${RED}✗ FAIL${NC} (HTTP $HTTP_CODE_DIRECT)"
fi

if [ "$HTTP_CODE_GATEWAY" = "200" ] || [ "$HTTP_CODE_GATEWAY" = "201" ]; then
  echo -e "Test 2 (Gateway): ${GREEN}✓ PASS${NC} (HTTP $HTTP_CODE_GATEWAY)"
else
  echo -e "Test 2 (Gateway): ${RED}✗ FAIL${NC} (HTTP $HTTP_CODE_GATEWAY)"
fi

if [ "$HTTP_CODE_STATIC" = "200" ] || [ "$HTTP_CODE_STATIC" = "201" ]; then
  echo -e "Test 3 (Static Proxy): ${GREEN}✓ PASS${NC} (HTTP $HTTP_CODE_STATIC)"
else
  echo -e "Test 3 (Static Proxy): ${RED}✗ FAIL${NC} (HTTP $HTTP_CODE_STATIC)"
fi

echo ""

