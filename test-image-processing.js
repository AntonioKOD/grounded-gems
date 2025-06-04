// Test image processing logic
const testPost = {
  id: "test",
  image: {
    url: 'https://groundedgems.com/api/media/file/image_1749001157542.jpg',
    sizes: {
      card: { url: 'https://groundedgems.com/api/media/file/image_1749001157542-768x1024.jpg' },
      thumbnail: { url: 'https://groundedgems.com/api/media/file/image_1749001157542-400x300.jpg' }
    }
  },
  video: {
    url: 'https://groundedgems.com/api/media/file/video.mp4'
  },
  photos: [
    { url: 'https://groundedgems.com/api/media/file/photo1.jpg' },
    { url: 'https://groundedgems.com/api/media/file/photo2.jpg' }
  ]
};

// Simulate our simplified processing logic
function processImage(image) {
  if (image && typeof image === "string" && image.trim() !== "") {
    return image.trim();
  }
  return image?.url || null;
}

function processVideo(video) {
  if (video && typeof video === "string" && video.trim() !== "") {
    return video.trim();
  }
  return video?.url || null;
}

function processPhotos(photos) {
  if (!Array.isArray(photos)) return [];
  return photos.map(photo => {
    if (typeof photo === "string" && photo.trim() !== "") {
      return photo.trim();
    }
    return photo?.url || null;
  }).filter(Boolean);
}

console.log('Testing simplified image processing:');
console.log('Image URL:', processImage(testPost.image));
console.log('Video URL:', processVideo(testPost.video));
console.log('Photos:', processPhotos(testPost.photos));

// Test with string URLs too
const testPostWithStrings = {
  image: 'https://groundedgems.com/api/media/file/string-image.jpg',
  video: 'https://groundedgems.com/api/media/file/string-video.mp4',
  photos: ['https://groundedgems.com/api/media/file/string-photo1.jpg']
};

console.log('\nTesting with string URLs:');
console.log('Image URL:', processImage(testPostWithStrings.image));
console.log('Video URL:', processVideo(testPostWithStrings.video));
console.log('Photos:', processPhotos(testPostWithStrings.photos)); 