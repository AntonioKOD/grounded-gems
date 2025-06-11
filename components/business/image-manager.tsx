'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd'
import {
  Upload,
  X,
  Star,
  GripVertical,
  Eye,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Camera,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import Image from 'next/image'
import { getPrimaryImageUrl, getLocationImages, validateLocationImages } from '@/lib/image-utils'

interface GalleryImage {
  id: string
  image: {
    url: string
    alt?: string
  }
  caption?: string
  isPrimary?: boolean
  order?: number
  altText?: string
  tags?: Array<{ tag: string }>
}

interface ImageManagerProps {
  locationId: string
  featuredImage?: {
    url: string
    alt?: string
  }
  gallery?: GalleryImage[]
  onImageUpdate: (images: {
    featuredImage?: any
    gallery: GalleryImage[]
  }) => void
  isEditable?: boolean
}

const imageTagOptions = [
  { value: 'exterior', label: 'Exterior View' },
  { value: 'interior', label: 'Interior' },
  { value: 'food', label: 'Food & Drinks' },
  { value: 'menu', label: 'Menu' },
  { value: 'staff', label: 'Staff' },
  { value: 'atmosphere', label: 'Atmosphere' },
  { value: 'event', label: 'Event Space' },
  { value: 'amenities', label: 'Amenities' },
]

export default function ImageManager({
  locationId,
  featuredImage,
  gallery = [],
  onImageUpdate,
  isEditable = true
}: ImageManagerProps) {
  const [images, setImages] = useState<GalleryImage[]>(gallery)
  const [featuredImg, setFeaturedImg] = useState(featuredImage)
  const [editingImage, setEditingImage] = useState<string | null>(null)
  const [uploadingImages, setUploadingImages] = useState<boolean>(false)
  const [draggedItem, setDraggedItem] = useState<GalleryImage | null>(null)

  // Create location object for validation
  const locationForValidation = {
    id: locationId,
    name: 'Current Location',
    featuredImage: featuredImg,
    gallery: images
  }

  const validation = validateLocationImages(locationForValidation)
  const primaryImageUrl = getPrimaryImageUrl(locationForValidation)
  const allImages = getLocationImages(locationForValidation)

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination || !isEditable) return

    const newImages = Array.from(images)
    const [reorderedItem] = newImages.splice(result.source.index, 1)
    newImages.splice(result.destination.index, 0, reorderedItem)

    // Update order values
    const updatedImages = newImages.map((img, index) => ({
      ...img,
      order: index
    }))

    setImages(updatedImages)
    onImageUpdate({
      featuredImage: featuredImg,
      gallery: updatedImages
    })
  }, [images, featuredImg, onImageUpdate, isEditable])

  const handleSetPrimary = useCallback((imageId: string) => {
    if (!isEditable) return

    const updatedImages = images.map(img => ({
      ...img,
      isPrimary: img.id === imageId
    }))

    // Set the primary image as featured image
    const primaryImage = updatedImages.find(img => img.isPrimary)
    if (primaryImage) {
      setFeaturedImg(primaryImage.image)
    }

    setImages(updatedImages)
    onImageUpdate({
      featuredImage: primaryImage?.image,
      gallery: updatedImages
    })
  }, [images, onImageUpdate, isEditable])

  const handleImageEdit = useCallback((imageId: string, updates: Partial<GalleryImage>) => {
    if (!isEditable) return

    const updatedImages = images.map(img =>
      img.id === imageId ? { ...img, ...updates } : img
    )

    setImages(updatedImages)
    onImageUpdate({
      featuredImage: featuredImg,
      gallery: updatedImages
    })
    setEditingImage(null)
  }, [images, featuredImg, onImageUpdate, isEditable])

  const handleDeleteImage = useCallback((imageId: string) => {
    if (!isEditable) return

    const imageToDelete = images.find(img => img.id === imageId)
    const updatedImages = images.filter(img => img.id !== imageId)
    
    // If deleted image was primary, make first remaining image primary
    if (imageToDelete?.isPrimary && updatedImages.length > 0) {
      updatedImages[0].isPrimary = true
      setFeaturedImg(updatedImages[0].image)
    }

    setImages(updatedImages)
    onImageUpdate({
      featuredImage: updatedImages[0]?.image,
      gallery: updatedImages
    })
  }, [images, onImageUpdate, isEditable])

  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!isEditable) return

    setUploadingImages(true)
    
    try {
      // Here you would implement the actual file upload logic
      // For now, we'll simulate it
      const newImages: GalleryImage[] = Array.from(files).map((file, index) => ({
        id: `temp-${Date.now()}-${index}`,
        image: {
          url: URL.createObjectURL(file), // Temporary URL for preview
          alt: file.name
        },
        caption: '',
        isPrimary: images.length === 0 && index === 0, // First image is primary if no images exist
        order: images.length + index,
        altText: file.name,
        tags: []
      }))

      const updatedImages = [...images, ...newImages]
      
      // If this is the first image, set it as featured
      if (images.length === 0 && newImages.length > 0) {
        setFeaturedImg(newImages[0].image)
      }

      setImages(updatedImages)
      onImageUpdate({
        featuredImage: images.length === 0 ? newImages[0].image : featuredImg,
        gallery: updatedImages
      })
    } catch (error) {
      console.error('Error uploading images:', error)
    } finally {
      setUploadingImages(false)
    }
  }, [images, featuredImg, onImageUpdate, isEditable])

  return (
    <div className="space-y-6">
      {/* Validation Status */}
      {!validation.isValid && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800 mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Image Configuration Issues</span>
            </div>
            <ul className="text-sm text-red-700 space-y-1">
              {validation.errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Primary Image Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Primary Image
          </CardTitle>
          <CardDescription>
            This image will be displayed first across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="aspect-video relative bg-gray-100 rounded-lg overflow-hidden">
            {primaryImageUrl && primaryImageUrl !== '/images/location-placeholder.jpg' ? (
              <Image
                src={primaryImageUrl}
                alt="Primary location image"
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                  <p>No primary image set</p>
                  <p className="text-sm">Upload images below to get started</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      {isEditable && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Images
            </CardTitle>
            <CardDescription>
              Add high-quality images that showcase your location
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                className="hidden"
                id="image-upload"
                disabled={uploadingImages}
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <Camera className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-600 mb-1">
                  {uploadingImages ? 'Uploading...' : 'Click to upload images'}
                </p>
                <p className="text-sm text-gray-500">
                  Supports JPG, PNG, WebP (max 10MB each)
                </p>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Gallery Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GripVertical className="h-5 w-5" />
            Image Gallery ({images.length})
          </CardTitle>
          <CardDescription>
            Drag to reorder • Click star to set as primary • First image is always shown first
          </CardDescription>
        </CardHeader>
        <CardContent>
          {images.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ImageIcon className="h-12 w-12 mx-auto mb-2" />
              <p>No images uploaded yet</p>
              <p className="text-sm">Upload your first image to get started</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="images">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-4"
                  >
                    {images.map((image, index) => (
                      <Draggable
                        key={image.id}
                        draggableId={image.id}
                        index={index}
                        isDragDisabled={!isEditable}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`border rounded-lg p-4 bg-white ${
                              snapshot.isDragging ? 'shadow-lg' : 'shadow-sm'
                            } ${image.isPrimary ? 'ring-2 ring-yellow-400' : ''}`}
                          >
                            <div className="flex items-start gap-4">
                              {/* Drag Handle */}
                              {isEditable && (
                                <div
                                  {...provided.dragHandleProps}
                                  className="mt-2 text-gray-400 hover:text-gray-600 cursor-move"
                                >
                                  <GripVertical className="h-5 w-5" />
                                </div>
                              )}

                              {/* Image Preview */}
                              <div className="w-24 h-24 relative bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                <Image
                                  src={image.image.url}
                                  alt={image.altText || 'Location image'}
                                  fill
                                  className="object-cover"
                                />
                                {image.isPrimary && (
                                  <div className="absolute top-1 left-1">
                                    <Badge className="bg-yellow-500 text-white text-xs">
                                      <Star className="h-3 w-3 mr-1 fill-current" />
                                      Primary
                                    </Badge>
                                  </div>
                                )}
                              </div>

                              {/* Image Details */}
                              <div className="flex-1 min-w-0">
                                {editingImage === image.id ? (
                                  <EditImageForm
                                    image={image}
                                    onSave={(updates) => handleImageEdit(image.id, updates)}
                                    onCancel={() => setEditingImage(null)}
                                  />
                                ) : (
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-sm font-medium">
                                        Image {index + 1}
                                      </span>
                                      {image.tags && image.tags.length > 0 && (
                                        <div className="flex gap-1">
                                          {image.tags.slice(0, 2).map((tag, tagIndex) => (
                                            <Badge key={tagIndex} variant="outline" className="text-xs">
                                              {tag.tag}
                                            </Badge>
                                          ))}
                                          {image.tags.length > 2 && (
                                            <Badge variant="outline" className="text-xs">
                                              +{image.tags.length - 2}
                                            </Badge>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    {image.caption && (
                                      <p className="text-sm text-gray-600 mb-2">{image.caption}</p>
                                    )}
                                    {image.altText && (
                                      <p className="text-xs text-gray-500">Alt: {image.altText}</p>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              {isEditable && editingImage !== image.id && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSetPrimary(image.id)}
                                    disabled={image.isPrimary}
                                    className="text-yellow-600 hover:text-yellow-700"
                                  >
                                    <Star className={`h-4 w-4 ${image.isPrimary ? 'fill-current' : ''}`} />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditingImage(image.id)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteImage(image.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-gray-600">
                Total Images: <span className="font-medium">{validation.imageCount}</span>
              </span>
              <span className="text-gray-600">
                Primary Image: {validation.hasPrimaryImage ? (
                  <span className="text-green-600 font-medium">✓ Set</span>
                ) : (
                  <span className="text-red-600 font-medium">✗ Not Set</span>
                )}
              </span>
            </div>
            {validation.isValid && (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">All Good!</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Edit Image Form Component
function EditImageForm({
  image,
  onSave,
  onCancel
}: {
  image: GalleryImage
  onSave: (updates: Partial<GalleryImage>) => void
  onCancel: () => void
}) {
  const [caption, setCaption] = useState(image.caption || '')
  const [altText, setAltText] = useState(image.altText || '')
  const [selectedTags, setSelectedTags] = useState<string[]>(
    image.tags?.map(t => t.tag) || []
  )

  const handleSave = () => {
    onSave({
      caption: caption.trim() || undefined,
      altText: altText.trim() || undefined,
      tags: selectedTags.map(tag => ({ tag }))
    })
  }

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="caption" className="text-sm">Caption</Label>
        <Textarea
          id="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Describe this image..."
          className="mt-1"
          rows={2}
        />
      </div>
      
      <div>
        <Label htmlFor="altText" className="text-sm">Alt Text (for accessibility)</Label>
        <Input
          id="altText"
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          placeholder="Alternative text for screen readers"
          className="mt-1"
        />
      </div>

      <div>
        <Label className="text-sm">Tags</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {imageTagOptions.map((option) => (
            <Button
              key={option.value}
              variant={selectedTags.includes(option.value) ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (selectedTags.includes(option.value)) {
                  setSelectedTags(prev => prev.filter(tag => tag !== option.value))
                } else {
                  setSelectedTags(prev => [...prev, option.value])
                }
              }}
              className="text-xs"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button onClick={handleSave} size="sm">
          Save
        </Button>
        <Button onClick={onCancel} variant="outline" size="sm">
          Cancel
        </Button>
      </div>
    </div>
  )
} 