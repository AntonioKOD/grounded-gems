#!/bin/bash

# Test script for robust MP4 streaming implementation
# Tests the Next.js API route with proper Range headers

echo "🎥 Testing Robust MP4 Streaming Implementation"
echo "=============================================="

# Test video URL
VIDEO_URL="https://sacavia.com/api/media/file/masons.steakhouse_1750884150_3663003369217883913_65761546932-11.mp4"

echo ""
echo "1. Testing HEAD request (check headers)"
echo "--------------------------------------"
curl -I "$VIDEO_URL" 2>/dev/null | grep -E "(HTTP|Accept-Ranges|Content-Type|Content-Length)"

echo ""
echo "2. Testing Range request (first 1024 bytes)"
echo "-------------------------------------------"
curl -i -H "Range: bytes=0-1023" "$VIDEO_URL" 2>/dev/null | head -20

echo ""
echo "3. Testing Range request (middle chunk)"
echo "--------------------------------------"
curl -i -H "Range: bytes=1024-2047" "$VIDEO_URL" 2>/dev/null | head -20

echo ""
echo "4. Testing invalid range (should return 416)"
echo "--------------------------------------------"
curl -i -H "Range: bytes=999999999-" "$VIDEO_URL" 2>/dev/null | head -10

echo ""
echo "5. Testing without Range header (should return 200)"
echo "--------------------------------------------------"
curl -i "$VIDEO_URL" 2>/dev/null | head -10

echo ""
echo "✅ Testing completed!"
echo ""
echo "Expected results:"
echo "- HEAD request should show Accept-Ranges: bytes and Content-Type: video/mp4"
echo "- Range requests should return 206 Partial Content with Content-Range header"
echo "- Invalid range should return 416 Range Not Satisfiable"
echo "- Full request should return 200 OK"

