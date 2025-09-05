#!/bin/bash

# Test script for the new profile feed API
# This script tests the complete end-to-end implementation

echo "🧪 Testing Profile Feed API Implementation"
echo "=========================================="

# Configuration
BASE_URL="http://localhost:3000"
USERNAME="testuser"  # Replace with actual username

echo "📱 Testing Profile Feed API: /api/profile/$USERNAME/feed"
echo ""

# Test 1: Basic profile feed request
echo "1️⃣ Testing basic profile feed request..."
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -H "Accept: application/json" \
  "$BASE_URL/api/profile/$USERNAME/feed?page=1&limit=5" | jq '.' 2>/dev/null || echo "Response received (not JSON)"

echo ""
echo "2️⃣ Testing profile feed pagination..."
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -H "Accept: application/json" \
  "$BASE_URL/api/profile/$USERNAME/feed?page=2&limit=3" | jq '.' 2>/dev/null || echo "Response received (not JSON)"

echo ""
echo "3️⃣ Testing profile feed with invalid username..."
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -H "Accept: application/json" \
  "$BASE_URL/api/profile/nonexistentuser/feed" | jq '.' 2>/dev/null || echo "Response received (not JSON)"

echo ""
echo "4️⃣ Testing profile feed without pagination parameters..."
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -H "Accept: application/json" \
  "$BASE_URL/api/profile/$USERNAME/feed" | jq '.' 2>/dev/null || echo "Response received (not JSON)"

echo ""
echo "✅ Profile Feed API Tests Complete!"
echo ""
echo "Expected Results:"
echo "- Test 1: Should return 200 with user data and posts array"
echo "- Test 2: Should return 200 with pagination info (hasNext, hasPrev)"
echo "- Test 3: Should return 404 for non-existent user"
echo "- Test 4: Should return 200 with default pagination (page=1, limit=20)"
echo ""
echo "Key Features to Verify:"
echo "✅ Normalized cover images for posts"
echo "✅ Video thumbnail support"
echo "✅ Pagination with hasNext/hasPrev"
echo "✅ User stats (postsCount, followersCount, followingCount)"
echo "✅ Media arrays (images, videos, totalCount)"
echo "✅ Proper error handling (404 for missing users)"

