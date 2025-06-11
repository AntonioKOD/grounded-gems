import { NextRequest, NextResponse } from 'next/server'
import { getPayloadHMR } from '@payloadcms/next/utilities'
import configPromise from '@payload-config'
import { validateLocationImages } from '@/lib/image-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await getPayloadHMR({ config: configPromise })
    
    const location = await payload.findByID({
      collection: 'locations',
      id: params.id,
      depth: 2
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Validate and return image data
    const validation = validateLocationImages({
      id: location.id,
      name: location.name,
      featuredImage: location.featuredImage,
      gallery: location.gallery
    })

    return NextResponse.json({
      featuredImage: location.featuredImage,
      gallery: location.gallery || [],
      validation,
    })
  } catch (error) {
    console.error('Error fetching location images:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await getPayloadHMR({ config: configPromise })
    const body = await request.json()
    
    const { featuredImage, gallery, action } = body

    // Get current location
    const location = await payload.findByID({
      collection: 'locations',
      id: params.id,
      depth: 1
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    let updateData: any = {}

    switch (action) {
      case 'reorder':
        // Handle image reordering
        if (gallery && Array.isArray(gallery)) {
          const sortedGallery = gallery.map((item, index) => ({
            ...item,
            order: index
          }))
          updateData.gallery = sortedGallery
          
          // Update featured image if first gallery item is primary
          const primaryImage = sortedGallery.find(item => item.isPrimary)
          if (primaryImage) {
            updateData.featuredImage = primaryImage.image
          }
        }
        break

      case 'set_primary':
        // Handle setting primary image
        const { imageId } = body
        if (gallery && Array.isArray(gallery) && imageId) {
          const updatedGallery = gallery.map(item => ({
            ...item,
            isPrimary: item.id === imageId
          }))
          
          const newPrimaryImage = updatedGallery.find(item => item.id === imageId)
          if (newPrimaryImage) {
            updateData.gallery = updatedGallery
            updateData.featuredImage = newPrimaryImage.image
          }
        }
        break

      case 'update_metadata':
        // Handle updating image metadata (captions, alt text, tags)
        const { imageId, metadata } = body
        if (gallery && Array.isArray(gallery) && imageId && metadata) {
          const updatedGallery = gallery.map(item => 
            item.id === imageId 
              ? { ...item, ...metadata }
              : item
          )
          updateData.gallery = updatedGallery
        }
        break

      case 'delete_image':
        // Handle deleting an image
        const { imageId: deleteImageId } = body
        if (gallery && Array.isArray(gallery) && deleteImageId) {
          const imageToDelete = gallery.find(item => item.id === deleteImageId)
          const updatedGallery = gallery.filter(item => item.id !== deleteImageId)
          
          // If deleted image was primary, make first remaining image primary
          if (imageToDelete?.isPrimary && updatedGallery.length > 0) {
            updatedGallery[0].isPrimary = true
            updateData.featuredImage = updatedGallery[0].image
          } else if (updatedGallery.length === 0) {
            updateData.featuredImage = null
          }
          
          updateData.gallery = updatedGallery
        }
        break

      case 'bulk_update':
        // Handle bulk update of images
        if (featuredImage !== undefined) {
          updateData.featuredImage = featuredImage
        }
        if (gallery && Array.isArray(gallery)) {
          updateData.gallery = gallery
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action specified' },
          { status: 400 }
        )
    }

    // Apply automatic image management rules
    if (updateData.gallery && Array.isArray(updateData.gallery)) {
      // Ensure proper ordering
      updateData.gallery.sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
      
      // If no primary image is set, make first image primary
      const hasPrimary = updateData.gallery.some((item: any) => item.isPrimary)
      if (!hasPrimary && updateData.gallery.length > 0) {
        updateData.gallery[0].isPrimary = true
        updateData.featuredImage = updateData.gallery[0].image
      }
      
      // Update order values to be sequential
      updateData.gallery = updateData.gallery.map((item: any, index: number) => ({
        ...item,
        order: index
      }))
    }

    // Update the location
    const updatedLocation = await payload.update({
      collection: 'locations',
      id: params.id,
      data: updateData
    })

    // Validate the updated images
    const validation = validateLocationImages({
      id: updatedLocation.id,
      name: updatedLocation.name,
      featuredImage: updatedLocation.featuredImage,
      gallery: updatedLocation.gallery
    })

    return NextResponse.json({
      success: true,
      featuredImage: updatedLocation.featuredImage,
      gallery: updatedLocation.gallery || [],
      validation,
    })
  } catch (error) {
    console.error('Error updating location images:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to upload and process images
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await getPayloadHMR({ config: configPromise })
    const formData = await request.formData()
    
    const files = formData.getAll('images') as File[]
    const insertPosition = formData.get('position') // 'start', 'end', or specific index
    
    if (!files.length) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      )
    }

    // Get current location
    const location = await payload.findByID({
      collection: 'locations',
      id: params.id,
      depth: 1
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Upload images to media collection
    const uploadedImages = []
    for (const file of files) {
      const mediaDoc = await payload.create({
        collection: 'media',
        data: {
          alt: `${location.name} - ${file.name}`
        },
        file
      })
      
      uploadedImages.push({
        id: `gallery-${Date.now()}-${Math.random()}`,
        image: mediaDoc.id,
        caption: '',
        isPrimary: false,
        order: 0,
        altText: `${location.name} - ${file.name}`,
        tags: []
      })
    }

    // Add to gallery
    const currentGallery = location.gallery || []
    let newGallery = [...currentGallery]

    if (insertPosition === 'start') {
      // Insert at beginning and update order
      newGallery = [...uploadedImages, ...currentGallery]
    } else if (insertPosition === 'end' || !insertPosition) {
      // Insert at end
      newGallery = [...currentGallery, ...uploadedImages]
    } else {
      // Insert at specific position
      const position = parseInt(insertPosition as string, 10)
      if (!isNaN(position)) {
        newGallery.splice(position, 0, ...uploadedImages)
      } else {
        newGallery = [...currentGallery, ...uploadedImages]
      }
    }

    // Update order values
    newGallery = newGallery.map((item, index) => ({
      ...item,
      order: index
    }))

    // If this is the first image(s), set as primary and featured
    let updateData: any = { gallery: newGallery }
    if (currentGallery.length === 0 && uploadedImages.length > 0) {
      newGallery[0].isPrimary = true
      updateData.featuredImage = newGallery[0].image
    }

    // Update location
    const updatedLocation = await payload.update({
      collection: 'locations',
      id: params.id,
      data: updateData
    })

    // Validate the updated images
    const validation = validateLocationImages({
      id: updatedLocation.id,
      name: updatedLocation.name,
      featuredImage: updatedLocation.featuredImage,
      gallery: updatedLocation.gallery
    })

    return NextResponse.json({
      success: true,
      uploadedImages,
      featuredImage: updatedLocation.featuredImage,
      gallery: updatedLocation.gallery || [],
      validation,
    })
  } catch (error) {
    console.error('Error uploading location images:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 