"use client";

import { useState } from "react";
import Image from "next/image";

interface FallbackImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fallbackSrc?: string;
}

export default function FallbackImage({ 
  src, 
  alt, 
  width, 
  height, 
  className,
  fallbackSrc = "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200&q=80"
}: FallbackImageProps) {
  // Check if the src is invalid upfront - allow placeholder.svg and other local images
  const isValidSrc = src && 
    src !== '/placeholder.svg' && 
    src.trim() !== '' &&
    (src.startsWith('http') || src.startsWith('/api/') || src.startsWith('/'));
  
  const [imageSrc, setImageSrc] = useState(isValidSrc ? src : fallbackSrc);
  const [hasError, setHasError] = useState(!isValidSrc);

  const handleError = () => {
    if (!hasError) {
      setImageSrc(fallbackSrc);
      setHasError(true);
    }
  };

  return (
    <Image
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={handleError}
      unoptimized
    />
  );
} 