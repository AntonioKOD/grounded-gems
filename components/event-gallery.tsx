"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function EventGallery({ images }: { images: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showLightbox, setShowLightbox] = useState(false)

  const nextImage = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  const prevImage = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  return (
    <div className="space-y-2">
      {/* Main Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 h-[400px] md:h-[500px]">
        <div
          className="md:col-span-3 relative rounded-lg overflow-hidden cursor-pointer"
          onClick={() => setShowLightbox(true)}
        >
          <Image
            src={images[0] || "/placeholder.svg"}
            alt="Event main image"
            fill
            className="object-cover hover:scale-105 transition-transform duration-500"
          />
        </div>
        <div className="hidden md:grid grid-rows-2 gap-2">
          <div
            className="relative rounded-lg overflow-hidden cursor-pointer"
            onClick={() => {
              setCurrentIndex(1)
              setShowLightbox(true)
            }}
          >
            <Image
              src={images[1] || "/placeholder.svg"}
              alt="Event gallery image"
              fill
              className="object-cover hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div
            className="relative rounded-lg overflow-hidden cursor-pointer"
            onClick={() => {
              setCurrentIndex(2)
              setShowLightbox(true)
            }}
          >
            <Image
              src={images[2] || "/placeholder.svg"}
              alt="Event gallery image"
              fill
              className="object-cover hover:scale-105 transition-transform duration-500"
            />
            {images.length > 3 && (
              <div
                className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-xl cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowLightbox(true)
                }}
              >
                +{images.length - 3} more
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {showLightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          <div className="relative w-full max-w-4xl h-[80vh]">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white z-10 rounded-full bg-black/50 hover:bg-black/70"
              onClick={() => setShowLightbox(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white z-10 rounded-full bg-black/50 hover:bg-black/70"
              onClick={prevImage}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>

            <div className="relative w-full h-full">
              <Image
                src={images[currentIndex] || "/placeholder.svg"}
                alt={`Gallery image ${currentIndex + 1}`}
                fill
                className="object-contain"
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white z-10 rounded-full bg-black/50 hover:bg-black/70"
              onClick={nextImage}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  className={`w-2 h-2 rounded-full ${index === currentIndex ? "bg-white" : "bg-white/50"}`}
                  onClick={() => setCurrentIndex(index)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
