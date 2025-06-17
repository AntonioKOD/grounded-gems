#!/bin/bash

# Boot simulator if not already running
xcrun simctl boot "iPhone 16 iOS 18.5" 2>/dev/null

# Install the app
xcrun simctl install "iPhone 16 iOS 18.5" "/tmp/SacaviaRun/Build/Products/Debug-iphonesimulator/Sacavia.app"

# Launch the app and capture the output
echo "Launching Sacavia app..."
xcrun simctl launch "iPhone 16 iOS 18.5" com.antonio.Sacavia

# Wait a moment for the app to start
sleep 3

# Check if the app is still running (if it crashes, it won't be in the list)
echo "Checking if app is running..."
xcrun simctl spawn "iPhone 16 iOS 18.5" ps aux | grep Sacavia | grep -v grep

# Capture recent logs
echo "Recent app logs:"
xcrun simctl spawn "iPhone 16 iOS 18.5" log show --predicate 'process == "Sacavia"' --last 30s | tail -20 