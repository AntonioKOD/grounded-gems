# Vercel Blob Setup Guide

## 1. Install Vercel Blob

```bash
npm install @vercel/blob
```

## 2. Add Environment Variables

Add these to your `.env.local` and Vercel environment variables:

```env
BLOB_READ_WRITE_TOKEN=your_blob_token_here
```

## 3. Get Your Blob Token

1. Go to your Vercel dashboard
2. Navigate to Storage > Blob
3. Create a new Blob store if you don't have one
4. Copy the `BLOB_READ_WRITE_TOKEN`

## 4. Deploy to Vercel

The blob upload endpoint will automatically work once you:
- Add the environment variable to Vercel
- Deploy your code

## 5. How It Works

- Files > 5MB automatically use Vercel Blob
- Files < 5MB use regular upload
- Vercel Blob bypasses the 4.5MB serverless function limit
- Files are stored in Vercel's global CDN

## 6. Benefits

✅ **No size limits** - Upload files up to 500MB
✅ **Global CDN** - Fast delivery worldwide  
✅ **Automatic optimization** - Images are optimized
✅ **Cost effective** - Pay only for storage used
✅ **Built-in security** - Files are automatically secured

## 7. Usage

The system automatically detects file size and chooses the best upload method:

- **Small files (< 5MB)**: Regular upload to your server
- **Large files (> 5MB)**: Direct upload to Vercel Blob

No changes needed in your frontend code - it's all handled automatically! 