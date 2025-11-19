#!/bin/bash

# Test script untuk SSO Login - Complete Test
# Test sesuai dengan curl command yang diberikan user
# Usage: ./test-sso-login-complete.sh

GATEWAY_URL="http://localhost:9588"
DESTINATION_URL="http://localhost:9518"
ENDPOINT="/api/auth/sso/login"

# Colors untuk output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Test SSO Login - Complete Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test 1: Test langsung ke API destinasi (seperti yang user minta)
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test 1: Test langsung ke API Destinasi${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "URL: ${GREEN}${DESTINATION_URL}${ENDPOINT}${NC}"
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

echo -e "HTTP Status: ${GREEN}${HTTP_CODE_DIRECT}${NC}"
echo -e "Response Body:"
if command -v jq &> /dev/null; then
  echo "$BODY_DIRECT" | jq '.' 2>/dev/null || echo "$BODY_DIRECT"
else
  echo "$BODY_DIRECT"
fi
echo ""

# Test 2: Test melalui API Gateway (seperti yang user minta)
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Test 2: Test melalui API Gateway${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "URL: ${GREEN}${GATEWAY_URL}${ENDPOINT}${NC}"
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

echo -e "HTTP Status: ${GREEN}${HTTP_CODE_GATEWAY}${NC}"
echo -e "Response Body:"
if command -v jq &> /dev/null; then
  echo "$BODY_GATEWAY" | jq '.' 2>/dev/null || echo "$BODY_GATEWAY"
else
  echo "$BODY_GATEWAY"
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test 1 Result
if [ "$HTTP_CODE_DIRECT" = "200" ] || [ "$HTTP_CODE_DIRECT" = "201" ]; then
  echo -e "Test 1 (Direct API): ${GREEN}✓ PASS${NC} (HTTP $HTTP_CODE_DIRECT)"
elif [ "$HTTP_CODE_DIRECT" = "401" ] || [ "$HTTP_CODE_DIRECT" = "400" ]; then
  echo -e "Test 1 (Direct API): ${YELLOW}⚠ PARTIAL${NC} (HTTP $HTTP_CODE_DIRECT) - API is reachable but request may be invalid"
elif [ "$HTTP_CODE_DIRECT" = "000" ] || [ "$HTTP_CODE_DIRECT" = "" ]; then
  echo -e "Test 1 (Direct API): ${RED}✗ FAIL${NC} - Service tidak berjalan atau timeout"
else
  echo -e "Test 1 (Direct API): ${YELLOW}⚠ UNEXPECTED${NC} (HTTP $HTTP_CODE_DIRECT)"
fi

# Test 2 Result
if [ "$HTTP_CODE_GATEWAY" = "200" ] || [ "$HTTP_CODE_GATEWAY" = "201" ]; then
  echo -e "Test 2 (Gateway): ${GREEN}✓ PASS${NC} (HTTP $HTTP_CODE_GATEWAY)"
elif [ "$HTTP_CODE_GATEWAY" = "401" ] || [ "$HTTP_CODE_GATEWAY" = "400" ]; then
  echo -e "Test 2 (Gateway): ${YELLOW}⚠ PARTIAL${NC} (HTTP $HTTP_CODE_GATEWAY) - Gateway bekerja, tapi request mungkin invalid"
elif [ "$HTTP_CODE_GATEWAY" = "502" ] || [ "$HTTP_CODE_GATEWAY" = "503" ] || [ "$HTTP_CODE_GATEWAY" = "504" ]; then
  echo -e "Test 2 (Gateway): ${RED}✗ FAIL${NC} (HTTP $HTTP_CODE_GATEWAY) - Gateway tidak bisa connect ke service"
elif [ "$HTTP_CODE_GATEWAY" = "404" ]; then
  echo -e "Test 2 (Gateway): ${RED}✗ FAIL${NC} (HTTP $HTTP_CODE_GATEWAY) - Route tidak terdaftar"
elif [ "$HTTP_CODE_GATEWAY" = "000" ] || [ "$HTTP_CODE_GATEWAY" = "" ]; then
  echo -e "Test 2 (Gateway): ${RED}✗ FAIL${NC} - Gateway tidak merespons atau timeout"
else
  echo -e "Test 2 (Gateway): ${YELLOW}⚠ UNEXPECTED${NC} (HTTP $HTTP_CODE_GATEWAY)"
fi

echo ""
echo -e "${BLUE}========================================${NC}"

# Exit code based on results
if [ "$HTTP_CODE_GATEWAY" = "200" ] || [ "$HTTP_CODE_GATEWAY" = "201" ]; then
  exit 0
elif [ "$HTTP_CODE_GATEWAY" = "401" ] || [ "$HTTP_CODE_GATEWAY" = "400" ]; then
  exit 0  # Gateway bekerja, hanya request yang mungkin invalid
else
  exit 1
fi

