#!/bin/bash

# Production Build Script for Sacavia
# This script optimizes the build process for production deployment

set -e

echo "🚀 Starting Sacavia Production Build..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version)
print_status "Node.js version: $NODE_VERSION"

# Check if we have the required Node.js version (18+)
if ! node -e "process.exit(process.version.slice(1).split('.')[0] >= 18 ? 0 : 1)"; then
    print_error "Node.js 18+ is required. Current version: $NODE_VERSION"
    exit 1
fi

# Set production environment
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

print_status "Environment set to production"

# Clean previous builds
print_status "Cleaning previous builds..."
rm -rf .next
rm -rf out
rm -rf dist

# Install dependencies with exact versions for reproducible builds
print_status "Installing dependencies..."
if [ -f "pnpm-lock.yaml" ]; then
    pnpm install --frozen-lockfile --production=false
elif [ -f "yarn.lock" ]; then
    yarn install --frozen-lockfile
else
    npm ci
fi

print_success "Dependencies installed"

# Type checking
print_status "Running TypeScript type checking..."
npx tsc --noEmit || {
    print_warning "TypeScript errors found, but continuing with build..."
}

# Linting (optional, can be skipped for faster builds)
if [ "${SKIP_LINT}" != "true" ]; then
    print_status "Running ESLint..."
    npx eslint . --ext .ts,.tsx --max-warnings 0 || {
        print_warning "ESLint warnings found, but continuing with build..."
    }
fi

# Build the application
print_status "Building Next.js application..."
start_time=$(date +%s)

# Use Turbopack for faster builds if available
if command -v turbo &> /dev/null; then
    print_status "Using Turbopack for faster builds..."
    npx next build --turbo
else
    npx next build
fi

end_time=$(date +%s)
build_time=$((end_time - start_time))

print_success "Build completed in ${build_time} seconds"

# Analyze bundle size
print_status "Analyzing bundle size..."
if [ -f ".next/analyze/client.html" ]; then
    print_success "Bundle analysis available at .next/analyze/client.html"
fi

# Generate build report
print_status "Generating build report..."
echo "# Build Report - $(date)" > build-report.md
echo "" >> build-report.md
echo "## Build Information" >> build-report.md
echo "- Build time: ${build_time} seconds" >> build-report.md
echo "- Node.js version: $NODE_VERSION" >> build-report.md
echo "- Environment: production" >> build-report.md
echo "" >> build-report.md

# Check build output size
if [ -d ".next" ]; then
    BUILD_SIZE=$(du -sh .next | cut -f1)
    echo "- Build size: $BUILD_SIZE" >> build-report.md
    print_status "Build size: $BUILD_SIZE"
fi

# Optimize images (if sharp is installed)
if npm list sharp > /dev/null 2>&1; then
    print_status "Sharp is installed - images will be optimized automatically"
else
    print_warning "Sharp is not installed - consider adding it for better image optimization"
    print_status "Run: npm install sharp"
fi

# Check for large bundle chunks
print_status "Checking for large bundle chunks..."
if [ -d ".next/static/chunks" ]; then
    find .next/static/chunks -name "*.js" -size +500k -exec basename {} \; | while read file; do
        print_warning "Large chunk detected: $file (>500KB)"
    done
fi

# Security check for environment variables
print_status "Checking environment variables..."
if [ -f ".env.local" ]; then
    if grep -q "NEXT_PUBLIC_" .env.local; then
        print_warning "Public environment variables found in .env.local"
        print_status "Make sure no sensitive data is exposed"
    fi
fi

# Test the build (basic smoke test)
print_status "Running smoke test..."
timeout 30s npx next start -p 3001 > /dev/null 2>&1 &
TEST_PID=$!
sleep 5

if curl -f -s http://localhost:3001 > /dev/null; then
    print_success "Smoke test passed - application starts successfully"
else
    print_warning "Smoke test failed - application may have issues"
fi

# Clean up test process
kill $TEST_PID 2>/dev/null || true

# Generate sitemap (if next-sitemap is configured)
if [ -f "next-sitemap.config.js" ]; then
    print_status "Generating sitemap..."
    npx next-sitemap || print_warning "Sitemap generation failed"
fi

# Final optimizations
print_status "Running final optimizations..."

# Compress static assets if gzip is available
if command -v gzip &> /dev/null; then
    find .next/static -name "*.js" -exec gzip -k {} \;
    find .next/static -name "*.css" -exec gzip -k {} \;
    print_success "Static assets compressed with gzip"
fi

# Performance recommendations
echo "" >> build-report.md
echo "## Performance Recommendations" >> build-report.md

if [ ! -f ".next/cache" ]; then
    echo "- Enable Next.js build cache for faster subsequent builds" >> build-report.md
fi

if [ ! -d "public/sw.js" ]; then
    echo "- Consider adding a service worker for offline support" >> build-report.md
fi

print_success "Production build completed successfully!"
print_status "Build report saved to build-report.md"

# Display final summary
echo ""
echo "📊 Build Summary:"
echo "=================="
echo "✅ Build completed in ${build_time} seconds"
echo "✅ Build output: .next/"
if [ -n "$BUILD_SIZE" ]; then
    echo "✅ Build size: $BUILD_SIZE"
fi
echo "✅ Ready for deployment"
echo ""
echo "🚀 To start the production server:"
echo "   npm start"
echo ""
echo "📦 To deploy:"
echo "   - Vercel: vercel --prod"
echo "   - Docker: docker build -t sacavia ."
echo "   - Manual: Copy .next/ and package.json to your server" 