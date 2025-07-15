'use server'
import { getPayload } from "payload";
import config from '@payload-config';
import haversine from "haversine-distance";
import {logout} from '@payloadcms/next/auth'
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { connect } from "http2";
import { Comment, User } from "@/types/feed";
import { Post } from "@/types/feed";
import { Notification } from "@/types/notification";
import {Where} from "payload";
import { PayloadRequest } from "payload";
import { getServerSideUser } from "@/lib/auth-server";

// Extend the Post interface to include shareCount
declare module "@/types/feed" {
  interface Post {
    shareCount: number;
  }
}

declare global {
  // Add a type for the follow cache
  // eslint-disable-next-line no-var
  var _followCache: Map<string, { data: any; timestamp: number }> | undefined;
}

export async function getReviewsbyId(id: string) {
  const payload = await getPayload({ config: config })
  const result = await payload.find({
    collection: "reviews",
    depth: 2,
    where: {
      location: {
        equals: id,
      },
    },
    overrideAccess: true,
  })
  return result
}




export async function getLocations() {
  try {
    const payload = await getPayload({ config: config })

    // Fetch locations with categories and other related fields
    const result = await payload.find({
      collection: "locations",
      depth: 2, // Increase depth to get related fields like categories
      limit: 100,
      overrideAccess: true,
    })

    console.log(`Fetched ${result.docs?.length || 0} locations from Payload CMS`)

    // Process the locations to ensure they have the required fields
    const processedLocations = result.docs.map((location) => {
      // Extract coordinates
      const latitude = location.coordinates?.latitude || null
      const longitude = location.coordinates?.longitude || null

      // Log coordinates for debugging
      if (latitude && longitude) {
        console.log(`Location "${location.name}" coordinates: [${latitude}, ${longitude}]`)
      } else {
        console.warn(`Location "${location.name}" is missing coordinates`)
      }

      // Format the address
      let formattedAddress = ""
      if (location.address) {
        const addressParts = [
          location.address.street,
          location.address.city,
          location.address.state,
          location.address.zip,
          location.address.country,
        ].filter(Boolean)
        formattedAddress = addressParts.join(", ")
      }

      // Get image URL
      let imageUrl = null
      if (location.featuredImage) {
        if (typeof location.featuredImage === "string") {
          imageUrl = location.featuredImage
        } else if (location.featuredImage.url) {
          imageUrl = location.featuredImage.url
        }
      }

      return {
        ...location,
        latitude,
        longitude,
        address: formattedAddress || location.address,
        imageUrl,
      }
    })

    // Filter out locations without valid coordinates and required fields
    const validLocations = processedLocations.filter(
      (loc: any) =>
        loc.latitude !== null &&
        loc.longitude !== null &&
        !isNaN(loc.latitude) &&
        !isNaN(loc.longitude) &&
        !!loc.name &&
        !!loc.status
    )

    console.log(`Returning ${validLocations.length} valid locations`)

    return validLocations
  } catch (error) {
    console.error("Error fetching locations:", error)
    return []
  }
}

// Your other server actions...

// Add the getCategories export to your actions file if it's not already there
export async function getCategories() {
  const payload = await getPayload({ config: config })
  
  console.log('🔄 getCategories action: Fetching categories...')
  
  const result = await payload.find({
    collection: "categories",
    depth: 1,
    where: {
      isActive: {
        equals: true,
      },
    },
    sort: "order",
    limit: 1000, // Increased limit to ensure we get all categories
    overrideAccess: true,
  })
  
  console.log(`📊 getCategories action: Found ${result.docs.length} categories`)
  
  return result
}


  export type DayOfWeek =
  | 'Sunday'
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday';

export interface LocationFormData {
  // Basic
  name: string;
  slug: string;
  description: string; // richText value from your editor
  shortDescription?: string;

  // Media
  featuredImage?: string; // media document ID
  gallery?: { image: string; caption?: string }[];

  // Taxonomy
  categories?: string[];              // category document IDs
  tags?: { tag: string }[];

  // Address
  address: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  neighborhood?: string;

  // Contact & Business
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
    socialMedia?: {
      facebook?: string;
      twitter?: string;
      instagram?: string;
      linkedin?: string;
    };
  };

  businessHours?: Array<{
    day: DayOfWeek;
    open?: string;    // e.g. "09:00"
    close?: string;   // e.g. "17:00"
    closed?: boolean;
  }>;

  priceRange?: 'free' | 'budget' | 'moderate' | 'expensive' | 'luxury';

  // Visitor Info
  bestTimeToVisit?: { season: string }[];
  insiderTips?: string; // richText

  accessibility?: {
    wheelchairAccess?: boolean;
    parking?: boolean;
    other?: string;
  };

  // Creator & Status
  createdBy?: string; // user document ID
  status: 'draft' | 'review' | 'published' | 'archived';
  isFeatured?: boolean;
  isVerified?: boolean;

  // Monetization & Analytics
  visitVerificationCount?: number;
  hasBusinessPartnership?: boolean;
  partnershipDetails?: {
    partnerName?: string;
    partnerContact?: string;
    details?: string;
  };

  // SEO & Metadata
  meta?: {
    title?: string;
    description?: string;
    keywords?: string;
  };

  // Privacy settings
  privacy?: 'public' | 'private';
  privateAccess?: string[]; // Array of user IDs who can access private locations
}

/**
 * Server Action: create a Location in Payload,
 * automatically geocoding the address via Mapbox.
 */
export async function createLocation(data: LocationFormData) {
  // 1. Build full address string
  const { street, city, state, zip, country } = data.address;
  const fullAddress = [street, city, state, zip, country]
    .filter(Boolean)
    .join(', ');

  // 2. Forward-geocode via Mapbox
  const geoRes = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
      `${encodeURIComponent(fullAddress)}.json` +
      `?access_token=${process.env.NEXT_SECRET_MAPBOX_ACCESS_TOKEN}`
  );
  if (!geoRes.ok) {
    throw new Error(`Mapbox geocoding failed: ${geoRes.status} ${geoRes.statusText}`);
  }
  const geoJson = await geoRes.json();
  const [longitude = 0, latitude = 0] =
    geoJson.features?.[0]?.geometry?.coordinates || [];

  // 3. Clean and validate data before creating
  const cleanData: any = {
    ...data,
    coordinates: { latitude, longitude },
  };

  // Remove or clean relationship fields that might have invalid ObjectIds
  if (cleanData.featuredImage === '' || cleanData.featuredImage === null || cleanData.featuredImage === undefined) {
    delete cleanData.featuredImage;
  }

  // Also remove featuredImage if it's a blob URL or invalid ObjectId
  if (cleanData.featuredImage && (
    typeof cleanData.featuredImage !== 'string' || 
    cleanData.featuredImage.startsWith('blob:') ||
    cleanData.featuredImage.length !== 24 || 
    !/^[0-9a-fA-F]{24}$/.test(cleanData.featuredImage)
  )) {
    delete cleanData.featuredImage;
  }

  if (cleanData.categories) {
    // Filter out invalid category IDs
    cleanData.categories = cleanData.categories.filter((id: string) => 
      id && typeof id === 'string' && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)
    );
    if (cleanData.categories.length === 0) {
      delete cleanData.categories;
    }
  }

  if (cleanData.createdBy === '' || cleanData.createdBy === null || cleanData.createdBy === undefined) {
    delete cleanData.createdBy;
  }

  // Validate createdBy ObjectId if present
  if (cleanData.createdBy && (typeof cleanData.createdBy !== 'string' || cleanData.createdBy.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(cleanData.createdBy))) {
    delete cleanData.createdBy;
  }

  // Clean gallery data if present
  if (cleanData.gallery && Array.isArray(cleanData.gallery)) {
    cleanData.gallery = cleanData.gallery.filter((item: any) => {
      // Keep only items with valid image ObjectIds
      return item.image && 
             typeof item.image === 'string' && 
             item.image.length === 24 && 
             /^[0-9a-fA-F]{24}$/.test(item.image);
    });
    if (cleanData.gallery.length === 0) {
      delete cleanData.gallery;
    }
  }

  // Ensure insiderTips is always an array (never string or undefined)
  if (cleanData.insiderTips !== undefined) {
    if (!Array.isArray(cleanData.insiderTips)) {
      // If it's not an array, remove it entirely
      delete cleanData.insiderTips;
    } else {
      // If it's an empty array, remove it (optional)
      if (cleanData.insiderTips.length === 0) {
        delete cleanData.insiderTips;
      }
    }
  }

  // 4. Create the document in Payload
  const payload = await getPayload({config: config});
  
  try {
    console.log('Creating location with cleaned data:', {
      name: cleanData.name,
      hasCoordinates: !!cleanData.coordinates,
      hasFeaturedImage: !!cleanData.featuredImage,
      featuredImageValue: cleanData.featuredImage,
      categoriesCount: cleanData.categories?.length || 0,
      categories: cleanData.categories,
      hasCreatedBy: !!cleanData.createdBy,
      createdByValue: cleanData.createdBy,
      galleryCount: cleanData.gallery?.length || 0
    });

    const created = await payload.create({
      collection: 'locations',
      data: cleanData,
    });

    console.log('Location created successfully:', created.id);
    return created;
  } catch (error) {
    console.error('Failed to create location:', error);
    console.error('Data that failed:', JSON.stringify(cleanData, null, 2));
    // Additional debugging for ObjectId validation
    if (error instanceof Error && error.message.includes('BSON')) {
      console.error('BSON Error - checking field types:', {
        featuredImageType: typeof cleanData.featuredImage,
        featuredImageValid: cleanData.featuredImage ? /^[0-9a-fA-F]{24}$/.test(cleanData.featuredImage) : 'not present',
        categoriesType: typeof cleanData.categories,
        categoriesValid: cleanData.categories ? cleanData.categories.every((id: string) => /^[0-9a-fA-F]{24}$/.test(id)) : 'not present',
        createdByType: typeof cleanData.createdBy,
        createdByValid: cleanData.createdBy ? /^[0-9a-fA-F]{24}$/.test(cleanData.createdBy) : 'not present'
      });
    }
    throw error;
  }
}

export async function updateLocation(locationId: string, data: Partial<LocationFormData>) {
  const payload = await getPayload({config: config});
  
  // If address data is provided, re-geocode to get new coordinates
  let coordinates;
  if (data.address) {
    const { street, city, state, zip, country } = data.address;
    const fullAddress = [street, city, state, zip, country]
      .filter(Boolean)
      .join(', ');

    if (fullAddress.trim()) {
      try {
        const geoRes = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
            `${encodeURIComponent(fullAddress)}.json` +
            `?access_token=${process.env.NEXT_SECRET_MAPBOX_ACCESS_TOKEN}`
        );
        
        if (geoRes.ok) {
          const geoJson = await geoRes.json();
          const [longitude = 0, latitude = 0] =
            geoJson.features?.[0]?.geometry?.coordinates || [];
          coordinates = { latitude, longitude };
        }
      } catch (error) {
        console.error('Geocoding failed during update:', error);
        // Continue without updating coordinates if geocoding fails
      }
    }
  }

  // Update the document in Payload
  const updateData = coordinates ? { ...data, coordinates } : data;
  
  const updated = await payload.update({
    collection: 'locations',
    id: locationId,
    data: updateData,
  });

  return updated;
}


interface SignupInput {
  email: string;
  password: string;
  name: string;
  coords?: {
    latitude: number;
    longitude: number;
  };
  additionalData?: {
    username?: string;
    interests?: string[];
    onboardingData?: {
      primaryUseCase?: string;
      travelRadius?: string;
      budgetPreference?: string;
      onboardingCompleted?: boolean;
      signupStep?: number;
    };
  };
}



export async function signupUser(data: SignupInput){
  const payload = await getPayload({ config: config });
  try{
    console.log('SignupUser - Input data:', {
      email: data.email,
      name: data.name,
      username: data.additionalData?.username,
      hasCoords: !!data.coords?.latitude
    });

    // Prepare user data with additional fields
    const userData: any = {
      email: data.email,
      password: data.password,
      name: data.name,
    };

    // Add location if provided
    if (data.coords?.latitude && data.coords?.longitude) {
      userData.location = {
        coordinates: {
          latitude: data.coords.latitude,
          longitude: data.coords.longitude,
        }
      }
    }

    // Add additional data if provided
    if (data.additionalData) {
      if (data.additionalData.username) {
        // Validate username one more time on server side
        const username = data.additionalData.username.toLowerCase().replace(/[^a-z0-9_-]/g, '');
        if (username.length < 3 || username.length > 30) {
          throw new Error(`Invalid username length: ${username.length}. Must be 3-30 characters.`);
        }
        userData.username = username;
        console.log('Setting username:', username);
      }
      if (data.additionalData.interests) {
        userData.interests = data.additionalData.interests;
      }
      if (data.additionalData.onboardingData) {
        userData.onboardingData = data.additionalData.onboardingData;
      }
    }

    console.log('SignupUser - Final userData:', {
      email: userData.email,
      name: userData.name,
      username: userData.username,
      hasLocation: !!userData.location?.coordinates
    });

    const user = await payload.create({
      collection: 'users',
      data: userData,
    });
    
    return user;
  } catch (error) { 
    console.error('Error creating user:', error);
    throw new Error('User creation failed');
  }
}


export async function logoutUser(){
  try{
    return await logout({config: config})

  }catch(err){
    console.error('Error logging out:', err);
    throw new Error('Logout failed');
  }
}



interface CategoryRating {
  category: string
  rating: number
}

interface ReviewPro {
  pro: string
}

interface ReviewCon {
  con: string
}

interface ReviewCategory {
  category: string
}

interface Review {
  title: string
  content: string
  rating: number
  reviewType: 'location' | 'event' | 'special'
  location?: string
  event?: string
  special?: string
  visitDate?: Date
  pros?: ReviewPro[]
  cons?: ReviewCon[]
  tips?: string
  categories?: ReviewCategory[]
  categoryRatings?: CategoryRating[]
  recommendationLevel?: 'none' | 'maybe' | 'yes' | 'strong'
  author?: string
  isVerifiedVisit?: boolean
  status?: 'pending' | 'published' | 'rejected' | 'reported'
}

export async function createReview(data: FormData) {
  const payload = await getPayload({ config: config })
  try {
    // Extract basic fields from FormData
    const reviewData: Partial<Review> = {
      title: data.get("title") as string,
      content: data.get("content") as string,
      rating: Number.parseInt(data.get("rating") as string, 10),
      reviewType: data.get("reviewType") as "location" | "event" | "special",
      tips: (data.get("tips") as string) || undefined,
      recommendationLevel: (data.get("recommendationLevel") as "none" | "maybe" | "yes" | "strong") || undefined,
      isVerifiedVisit: data.get("isVerifiedVisit") === "true",
    }

    // Handle target relationship (location, event, special)
    if (reviewData.reviewType === "location" && data.get("location")) {
      reviewData.location = data.get("location") as string
    } else if (reviewData.reviewType === "event" && data.get("event")) {
      reviewData.event = data.get("event") as string
    } else if (reviewData.reviewType === "special" && data.get("special")) {
      reviewData.special = data.get("special") as string
    }

    // Handle visit date
    const visitDateStr = data.get("visitDate") as string
    if (visitDateStr) {
      reviewData.visitDate = new Date(visitDateStr)
    }

    // Handle arrays (pros, cons, categories, categoryRatings)
    // These are sent as JSON strings in the FormData
    if (data.get("pros")) {
      try {
        reviewData.pros = JSON.parse(data.get("pros") as string)
      } catch (e) {
        console.error("Error parsing pros:", e)
      }
    }

    if (data.get("cons")) {
      try {
        reviewData.cons = JSON.parse(data.get("cons") as string)
      } catch (e) {
        console.error("Error parsing cons:", e)
      }
    }

    if (data.get("categories")) {
      try {
        reviewData.categories = JSON.parse(data.get("categories") as string)
      } catch (e) {
        console.error("Error parsing categories:", e)
      }
    }

    if (data.get("categoryRatings")) {
      try {
        reviewData.categoryRatings = JSON.parse(data.get("categoryRatings") as string)
      } catch (e) {
        console.error("Error parsing categoryRatings:", e)
      }
    }

    // Handle author if present
    if (data.get("author")) {
      reviewData.author = data.get("author") as string
    }

    // Set default status
    reviewData.status = "published"

   

  

    // Add photos to review data if any were successfully uploaded

    // Create the review in Payload CMS with all data including photos
    const review = await payload.create({
      collection: "reviews",
      data: {
        ...reviewData,
        createdAt: new Date().toISOString(),
      },
    })

    // Notify location creator about the new review (if it's for a location)
    if (reviewData.reviewType === 'location' && reviewData.location && reviewData.author) {
      try {
        // Get the location details to find the creator
        const location = await payload.findByID({
          collection: 'locations',
          id: reviewData.location,
        })

        if (location) {
          const creatorId = typeof location.createdBy === 'string' 
            ? location.createdBy 
            : location.createdBy?.id

          // Only notify if the reviewer is not the location creator
          if (creatorId && creatorId !== reviewData.author) {
            // Get reviewer details for the notification
            const reviewer = await payload.findByID({
              collection: 'users',
              id: reviewData.author,
            })

            console.log('Creating review notification for location creator:', {
              creatorId,
              locationName: location.name,
              reviewTitle: reviewData.title,
              reviewRating: reviewData.rating,
              reviewedBy: reviewer?.name
            })
            
            const notification = await payload.create({
              collection: 'notifications',
              data: {
                recipient: creatorId,
                type: 'location_reviewed',
                title: `New review for ${location.name}`,
                message: `${reviewer?.name || 'Someone'} left a ${reviewData.rating || 'unrated'}-star review: "${reviewData.title}"`,
                actionBy: reviewData.author,
                priority: (reviewData.rating && reviewData.rating >= 4) ? 'normal' : 'high', // Higher priority for negative reviews
                relatedTo: {
                  relationTo: 'locations',
                  value: reviewData.location,
                },
                metadata: {
                  locationName: location.name,
                  reviewTitle: reviewData.title,
                  reviewRating: reviewData.rating,
                  reviewId: review.id,
                },
                read: false,
              },
            })
            
            console.log('Review notification created successfully:', notification.id)
          }
        }
      } catch (notificationError) {
        console.error('Error creating review notification:', notificationError)
        // Don't fail the review creation if notification fails
      }
    }

    // Check and notify milestones after review creation
    if (reviewData.reviewType === 'location' && reviewData.location) {
      try {
        await checkAndNotifyMilestones(reviewData.location, 'review')
      } catch (milestoneError) {
        console.error('Error checking review milestones:', milestoneError)
        // Don't fail the review creation
      }
    }

    return review
  } catch (error) {
    console.error("Error creating review:", error)
    throw new Error("Review creation failed")
  }
}





export async function getUserbyId(id: string) {
  try {
    console.log("getUserbyId called with ID:", id)
    
    if (!id || id.trim() === '') {
      console.error("getUserbyId called with empty or invalid id")
      return null
    }

    // Validate basic ID format - must be at least 12 characters
    const cleanId = id.trim()
    if (cleanId.length < 12) {
      console.error("getUserbyId called with invalid id format (too short):", id)
      return null
    }

    // More flexible ID validation - allow ObjectId (24 hex), UUID, or other formats
    const isValidId = (
      // ObjectId format (24 hex characters)
      /^[a-fA-F0-9]{24}$/.test(cleanId) ||
      // UUID format (with or without hyphens)
      /^[a-fA-F0-9]{8}-?[a-fA-F0-9]{4}-?[a-fA-F0-9]{4}-?[a-fA-F0-9]{4}-?[a-fA-F0-9]{12}$/i.test(cleanId) ||
      // Other alphanumeric IDs (12+ characters)
      /^[a-zA-Z0-9_-]{12,}$/.test(cleanId)
    )
    
    if (!isValidId) {
      console.error("getUserbyId called with invalid ID format:", id)
      return null
    }
    
    const payload = await getPayload({ config: config })
    
    try {
      const result = await payload.findByID({
        collection: "users",
        id: cleanId,
        depth: 2,
        overrideAccess: true,
      })
      
      if (result) {
        console.log(`Found user: ${result.name || 'Unknown'} (ID: ${result.id})`)
        return result
      } else {
        console.log(`No user found with ID: ${id}`)
        return null
      }
    } catch (error: any) {
      // Handle specific Payload CMS errors
      if (error.status === 404 || error.message?.includes('Not Found') || error.message?.includes('No Users found')) {
        console.log(`User with ID ${id} not found (404)`)
        return null
      }
      
      // Handle validation errors
      if (error.message?.includes('Invalid ID') || error.message?.includes('Cast to ObjectId failed')) {
        console.error(`Invalid user ID format for Payload: ${id}`)
        return null
      }

      // Handle network or database connection issues
      if (error.code === 'ECONNREFUSED' || error.message?.includes('connection')) {
        console.error(`Database connection error for user ID ${id}:`, error.message)
        return null
      }
      
      // Log other errors but don't throw
      console.error("Error fetching user from Payload:", {
        error: error.message,
        stack: error.stack,
        userId: id,
        errorType: typeof error,
        errorCode: error.code || 'unknown'
      })
      return null
    }
  } catch (error) {
    console.error("Error in getUserbyId:", {
      error: error instanceof Error ? error.message : String(error),
      userId: id
    })
    return null
  }
}

export async function getFeedPostsByUser(id: string, category?: string, currentUserId?: string) {
  const payload = await getPayload({ config })
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ") 

  // Build query based on user ID and optional category
  const query: any = {
    author: {
      equals: id,
    },
    status: {
      equals: "published"
    }
  }
  
  // Add category filter if provided
  if (category && category !== 'all') {
    // If using a categories array field
    query.categories = {
      contains: category
    }
    
    // If category is a tag field instead, uncomment this:
    // query.tags = {
    //   some: {
    //     tag: {
    //       equals: category
    //     }
    //   }
    // }
  }

  const { docs } = await payload.find({
    collection: 'posts',
    depth: 2,
    where: query,
    sort: '-createdAt', // optional: most recent first
  })

  // Use the centralized formatting function
  return await formatPostsForFrontend(docs, currentUserId)
}



export async function followUser(userId: string, currentUserId: string) {
  const payload = await getPayload({ config });

  try {
    // 1) Read the raw user documents (depth: 0 returns scalar + relationship ID arrays)
    const currentUserDoc = await payload.findByID({
      collection: 'users',
      id: currentUserId,
      depth: 0,
    });
    const userToFollowDoc = await payload.findByID({
      collection: 'users',
      id: userId,
      depth: 0,
    });

    // 2) Merge in the new IDs (use Set to prevent duplicates)
    const updatedFollowing = Array.from(
      new Set([...(currentUserDoc.following ?? []), userId])
    );
    const updatedFollowers = Array.from(
      new Set([...(userToFollowDoc.followers ?? []), currentUserId])
    );

    // 3) Write back the merged arrays, returning one level of relationship data
    const currentUser = await payload.update({
      collection: 'users',
      id: currentUserId,
      depth: 1,
      data: { following: updatedFollowing },
    });
    const userToFollow = await payload.update({
      collection: 'users',
      id: userId,
      depth: 1,
      data: { followers: updatedFollowers },
    });

    return { currentUser, userToFollow };
  } catch (error) {
    console.error('Error following user:', error);
    throw error;
  }
}


export async function unfollowUser(userId: string, currentUserId: string) {
  const payload = await getPayload({ config });

  try {
    // 1) Read the raw user documents (depth: 0 returns scalar + relationship ID arrays)
    const currentUserDoc = await payload.findByID({
      collection: 'users',
      id: currentUserId,
      depth: 0,
    });
    const userToUnfollowDoc = await payload.findByID({
      collection: 'users',
      id: userId,
      depth: 0,
    });

    // 2) Remove the IDs from the arrays
    const updatedFollowing = (currentUserDoc.following ?? []).filter(
      (id: string) => id !== userId
    );
    const updatedFollowers = (userToUnfollowDoc.followers ?? []).filter(
      (id: string) => id !== currentUserId
    );

    // 3) Write back the updated arrays, returning one level of relationship data
    const currentUser = await payload.update({
      collection: 'users',
      id: currentUserId,
      depth: 1,
      data: { following: updatedFollowing },
    });
    const userToUnfollow = await payload.update({
      collection: 'users',
      id: userId,
      depth: 1,
      data: { followers: updatedFollowers },
    });

    return { currentUser, userToUnfollow };
  } catch (error) {
    console.error('Error unfollowing user:', error);
    throw error;
  }
}

export async function getFollowing(userId: string) {
  // Simple cache to prevent rapid repeated calls
  const cacheKey = `following-${userId}`
  if (typeof globalThis !== 'undefined' && globalThis._followCache) {
    const cached = globalThis._followCache.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < 30000) { // 30 second cache
      console.log('Using cached following data for', userId)
      return cached.data
    }
  }

  const payload = await getPayload({ config });

  try {
    console.log('Fetching following data for user:', userId)
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
      depth: 1,
    });

    const result = user?.following || [];
    
    // Cache the result
    if (typeof globalThis !== 'undefined') {
      if (!globalThis._followCache) {
        globalThis._followCache = new Map()
      }
      globalThis._followCache.set(cacheKey, { data: result, timestamp: Date.now() })
    }

    return result;
  } catch (error) {
    console.error('Error fetching following:', error);
    throw error;
  }
}

export async function getFollowers(userId: string) {
  // Simple cache to prevent rapid repeated calls
  const cacheKey = `followers-${userId}`
  if (typeof globalThis !== 'undefined' && globalThis._followCache) {
    const cached = globalThis._followCache.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < 30000) { // 30 second cache
      console.log('Using cached followers data for', userId)
      return cached.data
    }
  }

  const payload = await getPayload({ config });

  try {
    console.log('Fetching followers data for user:', userId)
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
      depth: 1,
    });

    const result = user?.followers || [];
    
    // Cache the result
    if (typeof globalThis !== 'undefined') {
      if (!globalThis._followCache) {
        globalThis._followCache = new Map()
      }
      globalThis._followCache.set(cacheKey, { data: result, timestamp: Date.now() })
    }

    return result;
  } catch (error) {
    console.error('Error fetching followers:', error);
    throw error;
  }
}

/**
 * Like or unlike a post
 */
export async function likePost(postId: string, shouldLike: boolean, userId: string) {
  try {
    const payload = await getPayload({ config })

    // Get the current post and user
    const post = await payload.findByID({
      collection: 'posts',
      id: postId,
      depth: 0,
    })

    const user = await payload.findByID({
      collection: 'users',
      id: userId,
      depth: 0,
    })

    if (!post || !user) {
      throw new Error('Post or user not found')
    }

    // Get current likes arrays
    const currentPostLikes = post.likes || []
    const currentUserLikedPosts = user.likedPosts || []

    let updatedPostLikes: string[]
    let updatedUserLikedPosts: string[]

    if (shouldLike) {
      // Add like
      updatedPostLikes = Array.from(new Set([...currentPostLikes, userId]))
      updatedUserLikedPosts = Array.from(new Set([...currentUserLikedPosts, postId]))
    } else {
      // Remove like
      updatedPostLikes = currentPostLikes.filter((id: string) => id !== userId)
      updatedUserLikedPosts = currentUserLikedPosts.filter((id: string) => id !== postId)
    }

    // Update both post and user
    await Promise.all([
      payload.update({
        collection: 'posts',
        id: postId,
        data: {
          likes: updatedPostLikes,
          likeCount: updatedPostLikes.length,
        },
      }),
      payload.update({
        collection: 'users',
        id: userId,
        data: {
          likedPosts: updatedUserLikedPosts,
        },
      })
    ])

    // Revalidate relevant paths
    revalidatePath('/feed')
    revalidatePath(`/post/${postId}`)
    revalidatePath(`/profile/${userId}`)

    return { 
      success: true, 
      isLiked: shouldLike,
      likeCount: updatedPostLikes.length 
    }
  } catch (error) {
    console.error('Error liking post:', error)
    throw error
  }
}

/**
 * Save or unsave a post
 */
export async function savePost(postId: string, userId: string, shouldSave: boolean) {
  try {
    const payload = await getPayload({ config })

    // Get the current post and user
    const post = await payload.findByID({
      collection: 'posts',
      id: postId,
      depth: 0,
    })

    const user = await payload.findByID({
      collection: 'users',
      id: userId,
      depth: 0,
    })

    if (!post || !user) {
      throw new Error('Post or user not found')
    }

    // Get current saved arrays
    const currentPostSavedBy = post.savedBy || []
    const currentUserSavedPosts = user.savedPosts || []

    let updatedPostSavedBy: string[]
    let updatedUserSavedPosts: string[]

    if (shouldSave) {
      // Add save
      updatedPostSavedBy = currentPostSavedBy.includes(userId) 
        ? currentPostSavedBy 
        : [...currentPostSavedBy, userId]
      
      updatedUserSavedPosts = currentUserSavedPosts.includes(postId)
        ? currentUserSavedPosts
        : [...currentUserSavedPosts, postId]
    } else {
      // Remove save
      updatedPostSavedBy = currentPostSavedBy.filter((id: string) => id !== userId)
      updatedUserSavedPosts = currentUserSavedPosts.filter((id: string) => id !== postId)
    }

    // Update post
    await payload.update({
      collection: 'posts',
      id: postId,
      data: {
        savedBy: updatedPostSavedBy,
        saveCount: updatedPostSavedBy.length,
      },
    })

    // Update user
    await payload.update({
      collection: 'users',
      id: userId,
      data: {
        savedPosts: updatedUserSavedPosts,
      },
    })

    console.log(`Post ${shouldSave ? 'saved' : 'unsaved'} successfully:`, {
      postId,
      userId,
      newSaveCount: updatedPostSavedBy.length
    })

    return {
      success: true,
      isSaved: shouldSave,
      saveCount: updatedPostSavedBy.length,
    }
  } catch (error) {
    console.error('Error saving post:', error)
    throw error
  }
}

/**
 * Check if a post is liked by a user
 */
export async function isPostLiked(postId: string, userId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/posts/${postId}/isLiked?userId=${userId}`)
    if (!response.ok) {
      throw new Error('Failed to check if post is liked')
    }
    const data = await response.json()
    return data.isLiked
  } catch (error) {
    console.error('Error checking if post is liked:', error)
    return false
  }
}

/**
 * Check if a post is saved by a user
 */
export async function isPostSaved(postId: string, userId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/posts/${postId}/isSaved?userId=${userId}`)
    if (!response.ok) {
      throw new Error('Failed to check if post is saved')
    }
    const data = await response.json()
    return data.isSaved
  } catch (error) {
    console.error('Error checking if post is saved:', error)
    return false
  }
}

export async function unLikePost(postId: string, liked: boolean, currentUserId: string) {
  const payload = await getPayload({ config });

  try {
    // 1. Read user & post documents (raw ID arrays)
    const userDoc = await payload.findByID({
      collection: 'users',
      id: currentUserId,
      depth: 0,
    });
    const postDoc = await payload.findByID({
      collection: 'posts',
      id: postId,
      depth: 0,
    });

    if (!userDoc || !postDoc) {
      throw new Error('User or Post not found');
    }

    // 2. Merge in or remove the post ID
    const updatedLikedPosts = Array.from(
      new Set([...(userDoc.likedPosts ?? []), ...(liked ? [postId] : [])])
    );
    const updatedLikes = Array.from(
      new Set([...(postDoc.likes ?? []), ...(liked ? [currentUserId] : [])])
    );

    // 3. Update both sides of the relationship
    const updatedUser = await payload.update({
      collection: 'users',
      id: currentUserId,
      depth: 1,
      data: { likedPosts: updatedLikedPosts },
    });
    const updatedPost = await payload.update({
      collection: 'posts',
      id: postId,
      depth: 1,
      data: { likes: updatedLikes },
    });

    return { updatedUser, updatedPost };
  } catch (err) {
    console.error('Error unliking post:', err);
    throw err;
  }
}


export async function sharePost(postId: string, userId: string) {
  try {
    const payload = await getPayload({ config })

    // Get the current post
    const post = await payload.findByID({
      collection: 'posts',
      id: postId,
      depth: 0,
    })

    if (!post) {
      throw new Error('Post not found')
    }

    // Increment share count
    const newShareCount = (post.shareCount || 0) + 1

    // Update post
    await payload.update({
      collection: 'posts',
      id: postId,
      data: {
        shareCount: newShareCount,
      },
    })

    console.log(`Post shared successfully:`, {
      postId,
      userId,
      newShareCount
    })

    return {
      success: true,
      shareCount: newShareCount,
    }
  } catch (error) {
    console.error('Error sharing post:', error)
    throw error
  }
}




export async function getPersonalizedFeed(currentUserId: string, pageSize = 20, offset = 0, category?: string) {
  console.log(`Getting personalized feed for user ${currentUserId}, pageSize: ${pageSize}, offset: ${offset}${category ? ', category=' + category : ''}`)
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ") 

  try {
    const payload = await getPayload({ config })

    // 1. Load user & followees
    const user = await payload.findByID({ collection: "users", id: currentUserId, depth: 0 })
    if (!user) {
      console.error("User not found:", currentUserId)
      return []
    }

    console.log(`User found: ${user.id}, following: ${user.following?.length || 0} users`)
    const followees = user.following || []

    // If user doesn't follow anyone, return mock data
    if (followees.length === 0) {
      console.log("User doesn't follow anyone, returning mock data")
      return []
    }

    // 2. Fetch candidate posts
    const { docs: posts } = await payload.find({
      collection: "posts",
      where: {
        author: { in: followees },
        status: { equals: "published" },
      },
      depth: 1,
      limit: 100, // Fetch more than we need for ranking
    })

    console.log(`Found ${posts.length} posts from followed users`)

    // If no posts found, return mock data
    if (posts.length === 0) {
      console.log("No posts found from followed users, returning mock data")
      return []
    }

    // 3. Score each post
    // Define constants for scoring weights
    const THETA1 = 0.5 // Adjust this value as needed
    const THETA2 = 0.3 // Adjust this value as needed
    const THETA3 = 0.2 // Adjust this value as needed

    const scored = posts.map((post) => {
      // Recency
      const ageHrs = (Date.now() - new Date(post.createdAt).getTime()) / 3600e3
      const ALPHA = 0.1 // Example value
      const recencyScore = 1 / (1 + ALPHA * ageHrs)

      // Engagement
      const W_L = 1 // Define a weight for likes
      const W_C = 1 // Define a weight for comments
      const engagementScore = W_L * (post.likes?.length || 0) + W_C * (post.commentCount || 0)

      // Location
      const BETA = 0.1 // Define a suitable value for BETA
      let locationScore = 1
      if (user.location && post.location) {
        const distKm =
          haversine(
            { latitude: user.location.lat, longitude: user.location.lng },
            { latitude: post.location.lat, longitude: post.location.lng },
          ) / 1000
        locationScore = 1 / (1 + BETA * distKm)
      }

      // Composite
      const finalScore =
        THETA1 * recencyScore + THETA2 * (engagementScore / (1 + engagementScore)) + THETA3 * locationScore

      return { post, finalScore }
    })

    // 4. Sort & paginate
    const sortedPosts = scored
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(offset, offset + pageSize)
      .map((item) => item.post)

    // Use the centralized formatting function
    const feed = await formatPostsForFrontend(sortedPosts, currentUserId)

    console.log(`Returning ${feed.length} personalized posts`)
    return feed
  } catch (error) {
    console.error('Error fetching personalized feed:', error)
    return []
  }
}

// Haversine formula to calculate distance between two points on Earth

export async function getFeedPosts(feedType: string, sortBy: string, page: number, category?: string, currentUserId?: string): Promise<Post[]> {
  // Getting feed posts
  
  try {
    const payload = await getPayload({ config })
    
    // Define pageSize for pagination
    const pageSize = 10
    
    // Build query object for filtering
    const query: any = {
      status: {
        equals: "published"
      }
    }
    
    // Add category filter if specified
    if (category && category !== 'all') {
      // If using a categories array field
      query.categories = {
        contains: category
      }
    }
    
    // Add feed type filters
    if (feedType === 'recommendations') {
      query.type = { equals: 'recommendation' }
    } else if (feedType === 'reviews') {
      query.type = { equals: 'review' }
    }
    
    // Determine sort order
    let sort = '-createdAt' // Default to newest first
    
    if (sortBy === 'popular') {
      sort = '-likeCount'
    } else if (sortBy === 'trending') {
      sort = '-trendingScore'
    }

    // Fetch posts from Payload CMS with error handling
    let posts: any[] = []
    let totalDocs = 0
    
    try {
      const result = await payload.find({
        collection: "posts",
        where: query,
        sort,
        limit: pageSize,
        page: page,
        depth: 2, // Load author and other relations with deeper nesting
      })
      
      posts = result.docs || []
      totalDocs = result.totalDocs || 0
    } catch (dbError) {
      console.error("Database error fetching posts:", dbError)
      // Return empty array on database error
      return []
    }

    // Found posts

    // Use the centralized formatting function
    return await formatPostsForFrontend(posts, currentUserId)
  } catch (error) {
    console.error("Error fetching feed posts:", error)
    return [] // Return an empty array in case of any error
  }
}

export async function getPostById(postId: string, currentUserId?: string): Promise<Post | null> {
  console.log(`Getting post by ID: ${postId}`);
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ") 

  try {
    const payload = await getPayload({ config });

    // Fetch post from Payload CMS
    const post = await payload.findByID({
      collection: "posts",
      id: postId,
      depth: 2, // Load author, location, and other relations
    });

    if (!post) {
      console.log(`Post with ID ${postId} not found`);
      return null;
    }

    // Use the centralized formatting function
    const formattedPosts = await formatPostsForFrontend([post], currentUserId);
    
    return (formattedPosts.length > 0 && formattedPosts[0] ? formattedPosts[0] : null) as Post | null;
  } catch (error) {
    console.error("Error fetching post by ID:", error);
    return null;
  }
}

// Update the getCommentsByPostId function to retrieve comments from the post's comments array
export async function getCommentsByPostId(postId: string): Promise<Comment[]> {
  console.log(`Getting comments for post ID: ${postId}`)

  try {
    const payload = await getPayload({ config })

    // Fetch the post with its comments
    const post = await payload.findByID({
      collection: "posts",
      id: postId,
      depth: 2, // Load comment authors
    })

    if (!post || !post.comments || !Array.isArray(post.comments)) {
      return []
    }

    // Format comments for the frontend
    const formattedComments = post.comments.map((comment: any) => ({
      id: comment.id || `comment-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      author: {
        id: typeof comment.author === "object" ? comment.author.id : comment.author,
        name: typeof comment.author === "object" ? comment.author.name : "Unknown User",
        avatar:
          typeof comment.author === "object" && comment.author.profileImage
            ? comment.author.profileImage.url
            : undefined,
      },
      content: comment.content || "",
      createdAt: comment.createdAt || new Date().toISOString(),
      likeCount: comment.likeCount || 0,
      isLiked: comment.isLiked || false,
    }))

    // Sort by newest first
    return formattedComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch (error) {
    console.error("Error fetching comments:", error)

    // Return an empty array in case of an error
    return []
  }
}

// Update the addComment function to add a comment to the post's comments array
export async function addComment(postId: string, content: string, userId: string) {
  console.log(`Adding comment to post ${postId} by user ${userId}`)

  try {
    const payload = await getPayload({ config })

    // Get the post
    const post = await payload.findByID({
      collection: "posts",
      id: postId,
    })

    if (!post) {
      throw new Error(`Post with ID ${postId} not found`)
    }

    // Create a new comment object
    const newComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      content,
      author: userId,
      createdAt: new Date().toISOString(),
      likeCount: 0,
      isLiked: false,
    }

    // Add the comment to the post's comments array
    const updatedComments = Array.isArray(post.comments) ? [...post.comments, newComment] : [newComment]

    // Update the post with the new comment
    await payload.update({
      collection: "posts",
      id: postId,
      data: {
        comments: updatedComments,
        commentCount: updatedComments.length,
      },
    })

    // Revalidate relevant paths
    revalidatePath('/feed')
    revalidatePath(`/post/${postId}`)

    return newComment
  } catch (error) {
    console.error("Error adding comment:", error)
    throw error
  }
}

// Update the likeComment function to handle liking comments within the post's comments array
export async function likeComment(commentId: string, isLiking: boolean, userId: string) {
  console.log(`${isLiking ? "Liking" : "Unliking"} comment ${commentId} by user ${userId}`)

  try {
    const payload = await getPayload({ config })

    // First, find which post contains this comment
    const { docs: posts } = await payload.find({
      collection: "posts",
      where: {
        "comments.id": { equals: commentId },
      },
      depth: 0,
    })

    if (!posts || posts.length === 0) {
      throw new Error(`Comment with ID ${commentId} not found in any post`)
    }

    const post = posts[0]

    // Find the comment in the post's comments array
    const comments = post?.comments || []
    const commentIndex = comments.findIndex((c: any) => c.id === commentId)

    if (commentIndex === -1) {
      throw new Error(`Comment with ID ${commentId} not found in post ${post?.id ?? 'unknown'}`)
    }

    // Update the comment's like count
    const comment = comments[commentIndex]
    const updatedComment = {
      ...comment,
      likeCount: isLiking ? (comment.likeCount || 0) + 1 : Math.max((comment.likeCount || 0) - 1, 0),
      isLiked: isLiking,
    }

    // Replace the comment in the array
    const updatedComments = [...comments]
    updatedComments[commentIndex] = updatedComment

    // Update the post with the modified comments array
    if (post && post.id) {
      await payload.update({
        collection: "posts",
        id: post.id,
        data: {
          comments: updatedComments,
        },
      })
    }

    return { success: true, likeCount: updatedComment.likeCount }
  } catch (error) {
    console.error("Error updating comment like status:", error)
    // For development/demo, simulate success
    return { success: true }
  }
}
export async function isFollowing(userId: string, currentUserId: string): Promise<boolean> {
  console.log(`Checking if user ${currentUserId} is following user ${userId}`)

  try {
    const payload = await getPayload({ config })

    // Get the current user with their following list
    const user = await payload.findByID({
      collection: "users",
      id: currentUserId,
      depth: 0,
    })

    if (!user || !user.following) {
      return false
    }

    // Check if userId is in the following array
    return Array.isArray(user.following) && user.following.includes(userId)
  } catch (error) {
    console.error("Error checking if user is following:", error)
    return false
  }
}
export async function getSuggestedUsers(currentUserId?: string): Promise<User[]> {
  console.log(`Getting suggested users${currentUserId ? ` for user ${currentUserId}` : ""}`)

  try {
    const payload = await getPayload({ config })

    // Find users to suggest
    const { docs: users } = await payload.find({
      collection: "users",
      limit: 10,
      depth: 0,
    })

    // Format users for the frontend
    const formattedUsers = await Promise.all(
      users.map(async (user) => {
        // Skip the current user
        if (currentUserId && user.id === currentUserId) {
          return null
        }

        // Check if the current user is already following this user
        let isAlreadyFollowing = false
        if (currentUserId) {
          isAlreadyFollowing = await isFollowing(String(user.id), currentUserId)
        }

        return {
          id: user.id,
          name: user.name || "Unknown User",
          avatar: user.profileImage?.url,
          bio: user.bio,
          followerCount: user.followers?.length || 0,
          followingCount: user.following?.length || 0,
          isFollowing: isAlreadyFollowing,
        }
      }),
    )

    // Filter out null values (current user) and users that are already being followed
    return formattedUsers.filter((user) => user !== null && (currentUserId ? !user.isFollowing : true)) as User[]
  } catch (error) {
    console.error("Error fetching suggested users:", error)

    // For development/demo, return mock data on error
    return [
      {
        id: "user1",
        name: "Jane Cooper",
        avatar: "/diverse-group-avatars.png",
        bio: "Food enthusiast and travel blogger",
        followerCount: 1243,
        followingCount: 567,
        isFollowing: false,
      },
      {
        id: "user2",
        name: "Alex Morgan",
        avatar: "/diverse-group-avatars.png",
        bio: "Photographer and nature lover",
        followerCount: 892,
        followingCount: 312,
        isFollowing: false,
      },
      {
        id: "user3",
        name: "Taylor Swift",
        avatar: "/diverse-group-avatars.png",
        bio: "Music lover and coffee addict",
        followerCount: 2451,
        followingCount: 128,
        isFollowing: false,
      },
    ]
  }
}


// Fetch notifications for the current user
export async function getNotifications(userId: string, limit = 10): Promise<Notification[]> {
  console.log(`Fetching notifications for user ${userId}`)

  try {
    const payload = await getPayload({ config })

    const { docs: notifications } = await payload.find({
      collection: "notifications",
      where: {
        recipient: { equals: userId },
      },
      sort: "-createdAt",
      limit,
      depth: 2, // Load related entities
    })

    // For journey reminders, fetch invite status
    const enhancedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        let inviteStatus: 'pending' | 'accepted' | 'declined' | undefined = undefined
        let journeyTitle: string | undefined = undefined
        let journeyOwner: string | undefined = undefined
        if (
          notification.type === 'reminder' &&
          notification.relatedTo &&
          notification.relatedTo.relationTo === 'journeys'
        ) {
          try {
            let journeyId = undefined;
            if (typeof notification.relatedTo === 'object') {
              if (typeof notification.relatedTo.id === 'string') {
                journeyId = notification.relatedTo.id;
              } else if (
                notification.relatedTo.value &&
                typeof notification.relatedTo.value === 'string'
              ) {
                journeyId = notification.relatedTo.value;
              } else if (
                notification.relatedTo.value &&
                typeof notification.relatedTo.value === 'object' &&
                typeof notification.relatedTo.value.id === 'string'
              ) {
                journeyId = notification.relatedTo.value.id;
              }
            } else {
              journeyId = notification.relatedTo;
            }
            if (!journeyId) throw new Error('No journey ID found in notification.relatedTo');
            const journey = await payload.findByID({
              collection: 'journeys',
              id: journeyId,
            })
            if (journey) {
              const invitee = (journey.invitees || []).find((inv: any) => String(inv.user) === String(userId))
              inviteStatus = invitee?.status || 'pending'
              journeyTitle = journey.title
              journeyOwner = journey.owner?.name || journey.owner?.email || ''
            }
          } catch (err: any) {
            if (err?.status === 404 || err?.message?.includes('Not Found')) {
              // Journey not found, skip setting journey fields
              // Optionally log at debug level
              if (process.env.NODE_ENV !== 'production') {
                console.debug('Journey not found for notification:', notification.relatedTo)
              }
            } else {
              console.error('Error fetching journey for notification:', err)
            }
          }
        }
        return {
          id: String(notification.id),
          recipient: notification.recipient,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          relatedTo: notification.relatedTo
            ? {
                id:
                  typeof notification.relatedTo === "object"
                    ? (notification.relatedTo.id || notification.relatedTo.value)
                    : notification.relatedTo,
                collection:
                  notification.relatedTo.relationTo || notification.relatedTo.collection,
              }
            : undefined,
          read: notification.read,
          createdAt: notification.createdAt,
          inviteStatus,
          journeyTitle,
          journeyOwner,
        }
      })
    )
    return enhancedNotifications
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return []
  }
}

// Get unread notification count
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const payload = await getPayload({ config })

    const { totalDocs } = await payload.find({
      collection: "notifications",
      where: {
        recipient: { equals: userId },
        read: { equals: false },
      },
      limit: 0, // We only need the count
    })

    return totalDocs
  } catch (error) {
    console.error("Error fetching unread notification count:", error)
    return 0
  }
}

// Mark a notification as read
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const payload = await getPayload({ config })

    await payload.update({
      collection: "notifications",
      id: notificationId,
      data: {
        read: true,
      },
    })

    return true
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return false
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    const payload = await getPayload({ config })

    // Find all unread notifications for the user
    const { docs: notifications } = await payload.find({
      collection: "notifications",
      where: {
        recipient: { equals: userId },
        read: { equals: false },
      },
    })

    // Update each notification
    await Promise.all(
      notifications.map((notification) =>
        payload.update({
          collection: "notifications",
          id: notification.id,
          data: {
            read: true,
          },
        }),
      ),
    )

    return true
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    return false
  }
}

// Delete a notification
export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    const payload = await getPayload({ config })

    await payload.delete({
      collection: "notifications",
      id: notificationId,
    })

    return true
  } catch (error) {
    console.error("Error deleting notification:", error)
    return false
  }
}


export async function createPost(formData: FormData) {
  try {
    console.log('📝 CreatePost: Starting post creation...')
    const payload = await getPayload({ config })

    // Get current user
    const userId = formData.get("userId") as string
    
    if (!userId) {
      console.error('📝 CreatePost: No user ID provided')
      return {
        success: false,
        message: "User ID is required",
      }
    }

    console.log('📝 CreatePost: Finding user with ID:', userId)
    const user = await payload.findByID({
      collection: "users",
      id: userId,
      depth: 0,
    });

    if (!user) {
      console.error('📝 CreatePost: User not found:', userId)
      return {
        success: false,
        message: "User not found",
      };
    }

    // Extract form data
    const content = formData.get("content") as string
    const title = formData.get("title") as string
    const type = (formData.get("type") as "post" | "review" | "recommendation") || "post"
    const rating = formData.get("rating") as string
    const locationId = formData.get("locationId") as string
    const locationName = formData.get("locationName") as string

    console.log('📝 CreatePost: Form data extracted:', { 
      contentLength: content?.length, 
      title, 
      type, 
      rating, 
      locationId,
      locationName
    })

    // Debug: Log all form data keys
    console.log('📝 CreatePost: All FormData keys:', Array.from(formData.keys()))
    
    // Get tags array
    const tags: string[] = []
    const tagEntries = formData.getAll("tags[]")
    tagEntries.forEach(tag => {
      if (typeof tag === 'string' && tag.trim()) {
        tags.push(tag.trim())
      }
    })

    // Validate required fields
    if (!content?.trim()) {
      console.error('📝 CreatePost: Content is required')
      return {
        success: false,
        message: "Content is required",
      }
    }

    // Handle multiple media uploads - get all file fields
    const mediaFiles = formData.getAll("media") as File[]
    const videoFiles = formData.getAll("videos") as File[]
    
    // Also check legacy field names for backward compatibility
    const legacyImageFiles = formData.getAll("image") as File[]
    const legacyVideoFiles = formData.getAll("video") as File[]
    
    // Combine files from all possible field names
    const allImageFiles = [...mediaFiles, ...legacyImageFiles].filter(file => 
      file instanceof File && file.size > 0 && file.type.startsWith('image/')
    )
    const allVideoFiles = [...videoFiles, ...legacyVideoFiles].filter(file => 
      file instanceof File && file.size > 0 && file.type.startsWith('video/')
    )
    
    console.log('📝 CreatePost: Media files count:', {
      mediaField: mediaFiles.length,
      videosField: videoFiles.length,
      legacyImageField: legacyImageFiles.length,
      legacyVideoField: legacyVideoFiles.length,
      totalImages: allImageFiles.length,
      totalVideos: allVideoFiles.length
    })
    
    // Debug: Log file details
    allImageFiles.forEach((file, index) => {
      console.log(`📝 CreatePost: Image ${index + 1}: ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`)
    })
    
    allVideoFiles.forEach((file, index) => {
      console.log(`📝 CreatePost: Video ${index + 1}: ${file.name} (${file.type}, ${(file.size / 1024 / 1024).toFixed(2)}MB)`)
    })
    
    let imageId: string | null = null
    let videoId: string | null = null
    let videoThumbnailId: string | null = null
    const photoIds: string[] = []

    // Define file size limits
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB for images
    const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB for videos

    // Process image files
    if (allImageFiles && allImageFiles.length > 0) {
      console.log('📝 CreatePost: Processing image files...')
      for (const file of allImageFiles) {
        if (file instanceof File && file.size > 0) {
          console.log(`📝 CreatePost: Processing image - ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
          
          // Validate file size
          if (file.size > MAX_IMAGE_SIZE) {
            console.error(`📝 CreatePost: Image file too large: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
            return {
              success: false,
              message: `Image file "${file.name}" is too large. Maximum size is 10MB.`,
            }
          }

          // Validate file type - comprehensive support for modern and legacy formats
          const allowedImageTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
            'image/avif', 'image/heic', 'image/heif', 'image/bmp', 'image/tiff', 'image/tif',
            'image/ico', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/jp2', 'image/jpx',
            'image/jpm', 'image/psd', 'image/raw', 'image/x-portable-bitmap', 'image/x-portable-pixmap'
          ]
          if (!allowedImageTypes.includes(file.type.toLowerCase())) {
            console.error(`📝 CreatePost: Invalid image type: ${file.type}`)
            return {
              success: false,
              message: `Unsupported image format: ${file.type}. Supported formats: JPEG, PNG, WebP, GIF, SVG, AVIF, HEIC, BMP, TIFF, ICO, and more.`,
            }
          }

          try {
            // Convert file to buffer
            const bytes = await file.arrayBuffer()
            const buffer = Buffer.from(bytes)

            console.log(`📝 CreatePost: Uploading image to Payload CMS...`)
            // Create media document in Payload
            const mediaDoc = await payload.create({
              collection: 'media',
              data: {
                alt: `Image for ${title || 'post'} by ${user.name}`,
                uploadedBy: user.id,
                uploadSource: 'web',
              },
              file: {
                data: buffer,
                mimetype: file.type,
                name: file.name,
                size: file.size,
              },
            })

            if (mediaDoc?.id) {
              console.log(`📝 CreatePost: Image uploaded successfully - ID: ${mediaDoc.id}`)
              if (!imageId) {
                // Set first image as main image
                imageId = String(mediaDoc.id)
              }
              // Add all images to photos array
              photoIds.push(String(mediaDoc.id))
            } else {
              console.error('📝 CreatePost: Media document creation failed - no ID returned')
              return {
                success: false,
                message: "Failed to upload image. Please try again.",
              }
            }
          } catch (error) {
            console.error('📝 CreatePost: Error uploading image:', error)
            return {
              success: false,
              message: `Failed to upload image "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`,
            }
          }
        }
      }
    }

    // Process video files
    if (allVideoFiles && allVideoFiles.length > 0) {
      console.log('📝 CreatePost: Processing video files...')
      for (const file of allVideoFiles) {
        if (file instanceof File && file.size > 0) {
          console.log(`📝 CreatePost: Processing video - ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
          
          // Validate file size
          if (file.size > MAX_VIDEO_SIZE) {
            console.error(`📝 CreatePost: Video file too large: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`)
            return {
              success: false,
              message: `Video file "${file.name}" is too large. Maximum size is 50MB.`,
            }
          }

          // Validate file type
          const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/mov', 'video/avi', 'video/quicktime']
          if (!allowedVideoTypes.includes(file.type.toLowerCase())) {
            console.error(`📝 CreatePost: Invalid video type: ${file.type}`)
            return {
              success: false,
              message: `Unsupported video format: ${file.type}. Please use MP4, WebM, OGG, MOV, or AVI.`,
            }
          }

          try {
            // Convert file to buffer
            const bytes = await file.arrayBuffer()
            const buffer = Buffer.from(bytes)

            console.log(`📝 CreatePost: Uploading video to Payload CMS...`)
            // Create video media document
            const videoDoc = await payload.create({
              collection: 'media',
              data: {
                alt: `Video for ${title || 'post'} by ${user.name}`,
                uploadedBy: user.id,
                uploadSource: 'web',
              },
              file: {
                data: buffer,
                mimetype: file.type,
                name: file.name,
                size: file.size,
              },
            })

            if (videoDoc?.id && !videoId) {
              console.log(`📝 CreatePost: Video uploaded successfully - ID: ${videoDoc.id}`)
              // Set first video as main video
              videoId = String(videoDoc.id)
              
              // For video posts, also set the first image as thumbnail if available
              if (imageId) {
                videoThumbnailId = imageId
              }
            } else if (!videoDoc?.id) {
              console.error('📝 CreatePost: Video document creation failed - no ID returned')
              return {
                success: false,
                message: "Failed to upload video. Please try again.",
              }
            }
          } catch (error) {
            console.error('📝 CreatePost: Error uploading video:', error)
            return {
              success: false,
              message: `Failed to upload video "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`,
            }
          }
        }
      }
    }

    // Handle location creation if locationName or locationId is provided
    let locationRelationId: string | null = null
    if (locationId) {
      try {
        // Verify location exists
        const existingLocation = await payload.findByID({
          collection: 'locations',
          id: locationId,
          depth: 0,
        })
        
        if (existingLocation) {
          locationRelationId = String(existingLocation.id)
          console.log('📝 CreatePost: Found existing location:', locationRelationId)
        } else {
          console.log('📝 CreatePost: Location not found, continuing without location')
        }
      } catch (error) {
        console.error('Error finding location:', error)
        // Continue without location if not found
      }
    } else if (locationName?.trim()) {
      try {
        // Search for existing location by name
        const existingLocation = await payload.find({
          collection: 'locations',
          where: {
            name: {
              like: locationName.trim()
            }
          },
          limit: 1,
        })
        
        if (existingLocation.docs.length > 0 && existingLocation.docs[0]?.id) {
          locationRelationId = String(existingLocation.docs[0].id)
          console.log('📝 CreatePost: Found existing location:', locationRelationId)
        } else {
          console.log('📝 CreatePost: Location not found, continuing without location')
        }
      } catch (error) {
        console.error('Error searching for location:', error)
        // Continue without location if search fails
      }
    }

    // Create post data
    const postData: any = {
      content: content.trim(),
      author: user.id,
      type: type, // Use the original type from form instead of overriding to 'video'
      status: "published",
    }

    // Add optional fields
    if (title?.trim()) {
      postData.title = title.trim()
    }

    if (type === "review" && rating) {
      const numRating = parseInt(rating, 10)
      if (numRating >= 1 && numRating <= 5) {
        postData.rating = numRating
      }
    }

    if (imageId) {
      postData.image = imageId
    }

    if (videoId) {
      postData.video = videoId
    }

    if (videoThumbnailId) {
      postData.videoThumbnail = videoThumbnailId
    }

    if (photoIds.length > 0) {
      postData.photos = photoIds
    }

    if (locationRelationId) {
      postData.location = locationRelationId
    }

    // Add tags as array of objects
    if (tags.length > 0) {
      postData.tags = tags.map(tag => ({ tag }))
    }

    console.log('Creating post with data:', {
      ...postData,
      image: imageId ? 'Set' : 'Not set',
      video: videoId ? 'Set' : 'Not set',
      photos: `${photoIds.length} photos`,
      location: locationRelationId ? 'Set' : 'Not set',
      tags: tags.length
    })

    // Create the post
    const newPost = await payload.create({
      collection: "posts",
      data: postData,
    })

    console.log('Post created successfully:', newPost.id)

    return {
      success: true,
      message: "Post created successfully!",
      postId: newPost.id,
    }

  } catch (error) {
    console.error("Error in createPost:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create post. Please try again.",
    }
  }
}


export async function updateUserLocation(userId: string, coords: {latitude: number, longitude: number}) {
  const payload = await getPayload({ config });

  try {
    // Update the user's location
    const updatedUser = await payload.update({
      collection: 'users',
      id: userId,
      depth: 0, // No need for relationships here
      data: {
        location: {
          coordinates: {
            latitude: coords.latitude,
            longitude: coords.longitude,
          }
        },
      },
    });


    return updatedUser;
  } catch (error) {
    console.error('Error updating user location:', error);
    throw error;
  }
}



const SKILL_WEIGHT: Record<string, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

export async function runMatchAlgorithm(
  participantIds: string[],
  maxPlayers: number,
  req: PayloadRequest
): Promise<string[][]> {
  // 1. Fetch user docs to get skill levels
  const { docs: users } = await req.payload.find({
    collection: 'users',
    where: {
      id: { in: participantIds },
    } as Where,
    depth: 0,
  });

  // 2. Build participants array with numeric weights
  const participants = users.map(user => {
    const pref = (user.sportsPreferences?.skillLevel as string) || 'intermediate';
    const weight = SKILL_WEIGHT[pref] ?? SKILL_WEIGHT.intermediate;
    return { id: user.id, weight };
  });

  // 3. Sort by weight descending (highest skill first)
  participants.sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));

  // 4. Determine number of groups needed
  const groupCount = Math.ceil(participants.length / maxPlayers);
  const groups: string[][] = Array.from({ length: groupCount }, () => []);

  // 5. Assign in serpentine (snake draft) order
  let idx = 0;
  let forward = true;
  for (const p of participants) {
    if (typeof p !== 'undefined' && typeof p.id !== 'undefined') {
      groups[idx]!.push(String(p.id));
    }
    if (forward) {
      if (idx === groupCount - 1) {
        forward = false;
        idx--;
      } else {
        idx++;
      }
    } else {
      if (idx === 0) {
        forward = true;
        idx++;
      } else {
        idx--;
      }
    }
  }

  return groups;
}


export async function getRecentNotifications(userId: string, limit = 5){
  const payload = await getPayload({config});

  try {
    const {docs} = await payload.find({
      collection: 'notifications',
      where: {
        recipient: { equals: userId},
      },
      sort: '-createdAt',
      limit,
      depth: 2,
    })

    console.log(`Found ${docs.length} recent notifications for user ${userId}`)
    
    return docs.map((notification) => ({
      id: String(notification.id),
      recipient: notification.recipient,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      relatedTo: notification.relatedTo
        ? {
            id: typeof notification.relatedTo === "object" ? notification.relatedTo.id : notification.relatedTo,
            value: typeof notification.relatedTo === "object" ? notification.relatedTo.value : undefined,
            relationTo: notification.relatedTo.relationTo,
            collection: notification.relatedTo.collection,
          }
        : undefined,
      read: notification.read,
      createdAt: notification.createdAt,
      actionBy: notification.actionBy,
      metadata: notification.metadata,
      priority: notification.priority,
      actionRequired: notification.actionRequired,
    }))
  }
  catch (error) {
    console.error('Error fetching recent notifications:', error);
    return []
  }
}

// Test notification function
export async function createTestNotification(userId: string): Promise<{ success: boolean; message: string }> {
  'use server'
  
  try {
    const payload = await getPayload({ config })
    
    console.log('Creating test notification for user:', userId)
    
    // First verify the user exists
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
    })
    
    if (!user) {
      return {
        success: false,
        message: `User with ID ${userId} not found`
      }
    }
    
    console.log('User found:', user.name)
    
    const notification = await payload.create({
      collection: 'notifications',
      data: {
        recipient: userId,
        type: 'reminder',
        title: 'Test Notification',
        message: 'This is a test notification to verify the system is working.',
        priority: 'normal',
        read: false,
      },
    })
    
    console.log('Test notification created successfully:', notification.id)
    
    return {
      success: true,
      message: `Test notification created with ID: ${notification.id}`
    }
  } catch (error) {
    console.error('Error creating test notification:', error)
    return {
      success: false,
      message: `Failed to create test notification: ${error}`
    }
  }
}

// Debug function to check notification system
export async function debugNotificationSystem(): Promise<{ success: boolean; message: string; details?: unknown }> {
  'use server'
  
  try {
    const payload = await getPayload({ config })
    
    console.log('=== Debugging Notification System ===')
    
    // Check if collections exist
    const collections = payload.config.collections
    const notificationCollection = collections.find(c => c.slug === 'notifications')
    const usersCollection = collections.find(c => c.slug === 'users')
    const locationsCollection = collections.find(c => c.slug === 'locations')
    
    console.log('Collections status:', {
      notifications: !!notificationCollection,
      users: !!usersCollection,
      locations: !!locationsCollection
    })
    
    // Try to fetch some sample data
    const { docs: notifications } = await payload.find({
      collection: 'notifications',
      limit: 5,
    })
    
    const { docs: users } = await payload.find({
      collection: 'users',
      limit: 3,
    })
    
    const { docs: locations } = await payload.find({
      collection: 'locations',
      limit: 3,
    })
    
    console.log('Sample data counts:', {
      notifications: notifications.length,
      users: users.length,
      locations: locations.length
    })
    
    return {
      success: true,
      message: 'Notification system debug complete',
      details: {
        collections: {
          notifications: !!notificationCollection,
          users: !!usersCollection,
          locations: !!locationsCollection
        },
        counts: {
          notifications: notifications.length,
          users: users.length,
          locations: locations.length
        },
        sampleUser: users[0] ? { id: users[0].id, name: users[0].name } : null,
        sampleLocation: locations[0] ? { id: locations[0].id, name: locations[0].name } : null,
        allNotifications: notifications.map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          recipient: typeof n.recipient === 'string' ? n.recipient : n.recipient?.id,
          read: n.read
        }))
      }
    }
  } catch (error) {
    console.error('Error debugging notification system:', error)
    return {
      success: false,
      message: `Debug failed: ${error}`,
      details: { error }
    }
  }
}

// Function to create multiple test notifications for debugging
export async function createMultipleTestNotifications(userId: string): Promise<{ success: boolean; message: string; count?: number }> {
  'use server'
  
  try {
    const payload = await getPayload({ config })
    
    console.log('Creating multiple test notifications for user:', userId)
    
    // Verify user exists
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
    })
    
    if (!user) {
      return {
        success: false,
        message: `User with ID ${userId} not found`
      }
    }
    
    // Create different types of test notifications
    const testNotifications = [
      {
        type: 'location_liked',
        title: 'Someone liked your location!',
        message: 'John Doe liked your location "Central Park"',
        priority: 'normal' as const
      },
      {
        type: 'event_request_received',
        title: 'New event request',
        message: 'Sarah wants to host a birthday party at your restaurant',
        priority: 'high' as const,
        actionRequired: true
      },
      {
        type: 'location_reviewed',
        title: 'New review received',
        message: 'Mike left a 5-star review for your coffee shop',
        priority: 'normal' as const
      },
      {
        type: 'location_verified',
        title: 'Location verified!',
        message: 'Your location "Downtown Bistro" has been verified',
        priority: 'high' as const
      },
      {
        type: 'reminder',
        title: 'Welcome to Sacavia!',
        message: 'Thanks for joining our community. Start exploring amazing locations!',
        priority: 'low' as const
      }
    ]
    
    const createdNotifications = []
    
    for (const notificationData of testNotifications) {
      const notification = await payload.create({
        collection: 'notifications',
        data: {
          recipient: userId,
          ...notificationData,
          read: false,
        },
      })
      createdNotifications.push(notification.id)
    }
    
    console.log(`Created ${createdNotifications.length} test notifications`)
    
    return {
      success: true,
      message: `Created ${createdNotifications.length} test notifications`,
      count: createdNotifications.length
    }
  } catch (error) {
    console.error('Error creating test notifications:', error)
    return {
      success: false,
      message: `Failed to create test notifications: ${error}`
    }
  }
}

// Add location subscription and saving functionality

export interface LocationSubscription {
  userId: string
  locationId: string
  notificationType: 'all' | 'events' | 'updates' | 'specials'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SavedLocation {
  userId: string
  locationId: string
  createdAt: Date
}

/**
 * Subscribe to notifications for a location
 */
export async function subscribeToLocation(userId: string, locationId: string, notificationType: 'all' | 'events' | 'updates' | 'specials' = 'all'): Promise<boolean> {
  try {
    const payload = await getPayload({ config });
    
    // Check if subscription already exists
    const existingSubscriptions = await payload.find({
      collection: 'locationSubscriptions',
      where: {
        and: [
          { user: { equals: userId } },
          { location: { equals: locationId } }
        ]
      }
    });
    
    if (existingSubscriptions.docs.length > 0) {
      // Update existing subscription
      await payload.update({
        collection: 'locationSubscriptions',
        id: existingSubscriptions.docs[0]?.id ?? '',
        data: {
          notificationType,
          isActive: true,
          updatedAt: new Date()
        }
      });
    } else {
      // Create new subscription
      await payload.create({
        collection: 'locationSubscriptions',
        data: {
          user: userId,
          location: locationId,
          notificationType,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error subscribing to location:', error);
    return false;
  }
}

/**
 * Unsubscribe from notifications for a location
 */
export async function unsubscribeFromLocation(userId: string, locationId: string): Promise<boolean> {
  try {
    const payload = await getPayload({ config });
    
    // Find existing subscription
    const existingSubscriptions = await payload.find({
      collection: 'locationSubscriptions',
      where: {
        and: [
          { user: { equals: userId } },
          { location: { equals: locationId } }
        ]
      }
    });
    
    if (existingSubscriptions.docs.length > 0) {
      // Update existing subscription to inactive
      await payload.update({
        collection: 'locationSubscriptions',
        id: existingSubscriptions.docs[0]?.id ?? '',
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error unsubscribing from location:', error);
    return false;
  }
}

/**
 * Save a location for a user
 */
export async function saveLocation(userId: string, locationId: string): Promise<boolean> {
  try {
    const payload = await getPayload({ config });
    
    // More flexible ID validation - just check if they exist and are strings
    if (!userId || !locationId || typeof userId !== 'string' || typeof locationId !== 'string') {
      console.error('Invalid ID format - must be non-empty strings:', { userId, locationId });
      return false;
    }
    
    // Debug logging to see what IDs we're working with
    console.log('saveLocation called with:', { userId, locationId });
    console.log('userId length:', userId.length);
    console.log('locationId length:', locationId.length);
    
    // Check if already saved
    const existingSaved = await payload.find({
      collection: 'savedLocations',
      where: {
        and: [
          { user: { equals: userId } },
          { location: { equals: locationId } }
        ]
      }
    });
    
    if (existingSaved.docs.length === 0) {
      // Create new saved location
      await payload.create({
        collection: 'savedLocations',
        data: {
          user: userId,
          location: locationId,
          createdAt: new Date()
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error saving location:', error);
    return false;
  }
}

/**
 * Unsave a location for a user
 */
export async function unsaveLocation(userId: string, locationId: string): Promise<boolean> {
  try {
    const payload = await getPayload({ config });
    
    // More flexible ID validation - just check if they exist and are strings
    if (!userId || !locationId || typeof userId !== 'string' || typeof locationId !== 'string') {
      console.error('Invalid ID format - must be non-empty strings:', { userId, locationId });
      return false;
    }
    
    // Debug logging to see what IDs we're working with
    console.log('unsaveLocation called with:', { userId, locationId });
    console.log('userId length:', userId.length);
    console.log('locationId length:', locationId.length);
    
    // Find saved location
    const existingSaved = await payload.find({
      collection: 'savedLocations',
      where: {
        and: [
          { user: { equals: userId } },
          { location: { equals: locationId } }
        ]
      }
    });
    
    if (existingSaved.docs.length > 0) {
      // Delete saved location
      await payload.delete({
        collection: 'savedLocations',
        id: existingSaved.docs[0]?.id ?? ''
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error unsaving location:', error);
    return false;
  }
}

/**
 * Get all saved locations for a user
 */
export async function getSavedLocations(userId: string): Promise<string[]> {
  try {
    const payload = await getPayload({ config });
    
    const savedLocations = await payload.find({
      collection: 'savedLocations',
      where: {
        user: { equals: userId }
      },
      depth: 1
    });
    
    return savedLocations.docs.map((doc: any) => {
      // Handle both relationship object and ID string
      if (typeof doc.location === 'object' && doc.location?.id) {
        return doc.location.id;
      }
      return doc.location;
    });
  } catch (error) {
    console.error('Error getting saved locations:', error);
    return [];
  }
}

/**
 * Get saved locations with full location data for display
 */
export async function getSavedLocationsWithData(userId: string): Promise<any[]> {
  try {
    const payload = await getPayload({ config });
    
    const savedLocations = await payload.find({
      collection: 'savedLocations',
      where: {
        user: { equals: userId }
      },
      depth: 2
    });
    
    return savedLocations.docs.map((doc: any) => ({
      id: doc.id,
      location: doc.location,
      createdAt: doc.createdAt
    })).filter((item: any) => item.location); // Filter out any null locations
  } catch (error) {
    console.error('Error getting saved locations with data:', error);
    return [];
  }
}

/**
 * Get all location subscriptions for a user
 */
export async function getLocationSubscriptions(userId: string): Promise<string[]> {
  try {
    const payload = await getPayload({ config });
    
    const subscriptions = await payload.find({
      collection: 'locationSubscriptions',
      where: {
        and: [
          { user: { equals: userId } },
          { isActive: { equals: true } }
        ]
      }
    });
    
    return subscriptions.docs.map((doc: any) => {
      // Handle both relationship object and ID string
      if (typeof doc.location === 'object' && doc.location?.id) {
        return doc.location.id;
      }
      return doc.location;
    });
  } catch (error) {
    console.error('Error getting location subscriptions:', error);
    return [];
  }
}

// Client-callable server actions for location interactions

/**
 * Toggle save status for a location
 */
export async function toggleSaveLocationAction(locationId: string): Promise<{ success: boolean; isSaved: boolean; message: string }> {
  'use server'
  
  try {
    // Get the current user from cookies or auth
    const user = await getServerSideUser();
    
    if (!user) {
      return {
        success: false,
        isSaved: false,
        message: "Please log in to save locations"
      };
    }
    
    // Check if already saved
    const savedLocations = await getSavedLocations(user.id);
    const isSaved = savedLocations.includes(locationId);
    
    if (isSaved) {
      const success = await unsaveLocation(user.id, locationId);
      return {
        success,
        isSaved: false,
        message: success ? "Location removed from saved" : "Failed to unsave location"
      };
    } else {
      const success = await saveLocation(user.id, locationId);
      return {
        success,
        isSaved: true,
        message: success ? "Location saved successfully" : "Failed to save location"
      };
    }
  } catch (error) {
    console.error('Error toggling save location:', error);
    return {
      success: false,
      isSaved: false,
      message: "Something went wrong"
    };
  }
}

/**
 * Toggle subscription status for a location
 */
export async function toggleSubscribeLocationAction(locationId: string, notificationType: 'all' | 'events' | 'updates' | 'specials' = 'all'): Promise<{ success: boolean; isSubscribed: boolean; message: string }> {
  'use server'
  
  try {
    // Get the current user from cookies or auth
    const user = await getServerSideUser();
    
    if (!user) {
      return {
        success: false,
        isSubscribed: false,
        message: "Please log in to subscribe to notifications"
      };
    }
    
    // Check if already subscribed
    const subscribedLocations = await getLocationSubscriptions(user.id);
    const isSubscribed = subscribedLocations.includes(locationId);
    
    if (isSubscribed) {
      const success = await unsubscribeFromLocation(user.id, locationId);
      return {
        success,
        isSubscribed: false,
        message: success ? "Notifications turned off" : "Failed to unsubscribe"
      };
    } else {
      const success = await subscribeToLocation(user.id, locationId, notificationType);
      return {
        success,
        isSubscribed: true,
        message: success ? "Notifications enabled" : "Failed to subscribe"
      };
    }
  } catch (error) {
    console.error('Error toggling subscription:', error);
    return {
      success: false,
      isSubscribed: false,
      message: "Something went wrong"
    };
  }
}

/**
 * Get user's saved and subscribed locations
 */
export async function getUserLocationDataAction(): Promise<{ savedLocations: string[]; subscribedLocations: string[] }> {
  'use server'
  
  try {
    // Get the current user from cookies or auth
    const user = await getServerSideUser();
    
    if (!user) {
      return {
        savedLocations: [],
        subscribedLocations: []
      };
    }
    
    const savedLocations = await getSavedLocations(user.id);
    const subscribedLocations = await getLocationSubscriptions(user.id);
    
    return {
      savedLocations,
      subscribedLocations
    };
  } catch (error) {
    console.error('Error getting user location data:', error);
    return {
      savedLocations: [],
      subscribedLocations: []
    };
  }
}

/**
 * Get user's saved locations with full location data for display
 */
export async function getSavedLocationsAction(): Promise<any[]> {
  'use server'
  
  try {
    // Get the current user from cookies or auth
    const user = await getServerSideUser();
    
    if (!user) {
      return [];
    }
    
    const savedLocationsWithData = await getSavedLocationsWithData(user.id);
    return savedLocationsWithData;
  } catch (error) {
    console.error('Error getting saved locations action:', error);
    return [];
  }
}

// Location Interaction functions
export async function recordLocationInteraction(
  locationId: string, 
  interactionType: string, 
  metadata?: any,
  coordinates?: { latitude: number; longitude: number }
): Promise<{ success: boolean; message: string }> {
  'use server'
  
  try {
    const user = await getServerSideUser()
    
    if (!user?.id) {
      return { success: false, message: 'Authentication required' }
    }

    const payload = await getPayload({ config })

    // Get location details to find the creator
    const location = await payload.findByID({
      collection: 'locations',
      id: locationId,
    })

    if (!location) {
      return { success: false, message: 'Location not found' }
    }

    // For unique interactions, check if it already exists
    const uniqueInteractions = ['like', 'save', 'subscribe']
    
    if (uniqueInteractions.includes(interactionType)) {
      const existing = await payload.find({
        collection: 'locationInteractions',
        where: {
          user: { equals: user.id },
          location: { equals: locationId },
          type: { equals: interactionType },
        },
        limit: 1,
      })

      if (existing.docs.length > 0) {
        return { 
          success: false, 
          message: `You have already ${interactionType}d this location` 
        }
      }
    }

    // Create the interaction
    await payload.create({
      collection: 'locationInteractions',
      data: {
        user: user.id,
        location: locationId,
        type: interactionType,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
        },
        coordinates,
        platform: 'web',
        isPublic: true,
      },
    })

    // Notify location creator (if not the same user and creator exists)
    const creatorId = typeof location.createdBy === 'string' 
      ? location.createdBy 
      : location.createdBy?.id

    if (creatorId && creatorId !== user.id) {
      // Create notification based on interaction type
      const notificationData = {
        recipient: creatorId,
        actionBy: user.id,
        relatedTo: {
          relationTo: 'locations',
          value: locationId,
        },
        metadata: {
          locationName: location.name,
          interactionType,
          ...metadata,
        },
        read: false,
        priority: 'normal',
      }

      switch (interactionType) {
        case 'like':
          Object.assign(notificationData, {
            type: 'location_liked',
            title: `Someone liked your location!`,
            message: `${user.name} liked your location "${location.name}".`,
          })
          break
        case 'share':
          Object.assign(notificationData, {
            type: 'location_shared',
            title: `Someone shared your location!`,
            message: `${user.name} shared your location "${location.name}".`,
          })
          break
        case 'check_in':
          Object.assign(notificationData, {
            type: 'location_visited',
            title: `Someone checked in at your location!`,
            message: `${user.name} checked in at "${location.name}".`,
          })
          
          // Notify friends about check-in
          try {
            const userWithFollowers = await payload.findByID({
              collection: 'users',
              id: user.id,
              depth: 0,
            })
            
            if (userWithFollowers.followers && userWithFollowers.followers.length > 0) {
              await notifyFriendCheckIn(locationId, user.id, userWithFollowers.followers.slice(0, 10)) // Limit to 10 friends
            }
          } catch (friendNotificationError) {
            console.error('Error notifying friends about check-in:', friendNotificationError)
          }
          break
        case 'visit':
          Object.assign(notificationData, {
            type: 'location_visited',
            title: `Someone visited your location!`,
            message: `${user.name} visited "${location.name}".`,
          })
          break
        case 'save':
          Object.assign(notificationData, {
            type: 'location_saved',
            title: `Someone saved your location!`,
            message: `${user.name} saved your location "${location.name}".`,
          })
          break
        default:
          // For other interaction types, create a generic notification
          Object.assign(notificationData, {
            type: 'location_interaction',
            title: `New activity at your location!`,
            message: `${user.name} interacted with your location "${location.name}".`,
          })
      }

      try {
        console.log('Creating notification for location creator:', {
          creatorId,
          interactionType,
          locationName: location.name,
          actionBy: user.name
        })
        
        const notification = await payload.create({
          collection: 'notifications',
          data: notificationData,
        })
        
        console.log('Notification created successfully:', notification.id)
      } catch (notificationError) {
        console.error('Error creating notification for location creator:', {
          error: notificationError,
          notificationData,
          creatorId,
          locationId
        })
        // Don't fail the main operation if notification fails
      }
    }

    // Check and notify milestones after interaction
    try {
      await checkAndNotifyMilestones(locationId, interactionType)
    } catch (milestoneError) {
      console.error('Error checking milestones:', milestoneError)
      // Don't fail the main operation
    }

    return { 
      success: true, 
      message: `Successfully recorded ${interactionType} interaction` 
    }
  } catch (error) {
    console.error('Error recording location interaction:', error)
    return { success: false, message: 'Failed to record interaction' }
  }
}

export async function removeLocationInteraction(
  locationId: string, 
  interactionType: string
): Promise<{ success: boolean; message: string }> {
  'use server'
  
  try {
    const user = await getServerSideUser()
    
    if (!user?.id) {
      return { success: false, message: 'Authentication required' }
    }

    const payload = await getPayload({ config })

    const existing = await payload.find({
      collection: 'locationInteractions',
      where: {
        user: { equals: user.id },
        location: { equals: locationId },
        type: { equals: interactionType },
      },
      limit: 1,
    })

    if (existing.docs.length === 0) {
      return { success: false, message: 'Interaction not found' }
    }

    await payload.delete({
      collection: 'locationInteractions',
      id: existing.docs[0]?.id ?? '',
    })

    // For unlike, create an unlike interaction
    if (interactionType === 'like') {
      await payload.create({
        collection: 'locationInteractions',
        data: {
          user: user.id,
          location: locationId,
          type: 'unlike',
          metadata: {
            originalLikeId: existing.docs[0]?.id ?? '',
            timestamp: new Date().toISOString(),
          },
          platform: 'web',
          isPublic: false,
        },
      })
    }

    return { 
      success: true, 
      message: `Successfully removed ${interactionType} interaction` 
    }
  } catch (error) {
    console.error('Error removing location interaction:', error)
    return { success: false, message: 'Failed to remove interaction' }
  }
}

// Event Request functions
export async function createEventRequest(requestData: {
  eventTitle: string
  eventDescription: string
  eventType: string
  locationId: string
  requestedDate: string
  requestedTime: string
  expectedAttendees: number
  expectedGuests?: number
  specialRequests?: string
  budget?: any
}): Promise<{ success: boolean; message: string; eventRequest?: any }> {
  'use server'
  
  try {
    const user = await getServerSideUser()
    
    if (!user?.id) {
      return { success: false, message: 'Authentication required' }
    }

    const payload = await getPayload({ config })

    // Validate location exists and is eligible for events
    const location = await payload.findByID({
      collection: 'locations',
      id: requestData.locationId,
    })

    if (!location) {
      return { success: false, message: 'Location not found' }
    }

    // Check if location allows event requests
    const eligibleCategories = ['Restaurant', 'Bar', 'Cafe', 'Event Venue']
    const locationCategories = location.categories?.map((cat: any) => 
      typeof cat === 'string' ? cat : cat.name
    ) || []
    
    const isEligible = eligibleCategories.some(category => 
      locationCategories.includes(category)
    )

    if (!isEligible) {
      return { 
        success: false, 
        message: 'This location type does not accept event requests' 
      }
    }

    // Create the event request
    const eventRequest = await payload.create({
      collection: 'eventRequests',
      data: {
        ...requestData,
        location: requestData.locationId,
        requestedBy: user.id,
        status: 'pending',
      },
    })

    // Notify location creator about the event request
    const creatorId = typeof location.createdBy === 'string' 
      ? location.createdBy 
      : location.createdBy?.id

    if (creatorId && creatorId !== user.id) {
      try {
        console.log('Creating event request notification for location creator:', {
          creatorId,
          locationName: location.name,
          eventTitle: requestData.eventTitle,
          requestedBy: user.name
        })
        
        const notification = await payload.create({
          collection: 'notifications',
          data: {
            recipient: creatorId,
            type: 'event_request_received',
            title: `New event request for ${location.name}`,
            message: `${user.name} wants to host "${requestData.eventTitle}" at your location.`,
            actionBy: user.id,
            actionRequired: true,
            priority: 'high',
            relatedTo: {
              relationTo: 'eventRequests',
              value: eventRequest.id,
            },
            metadata: {
              locationName: location.name,
              eventTitle: requestData.eventTitle,
              eventType: requestData.eventType,
              requestedDate: requestData.requestedDate,
              expectedAttendees: requestData.expectedAttendees,
            },
            read: false,
          },
        })
        
        console.log('Event request notification created successfully:', notification.id)
      } catch (notificationError) {
        console.error('Error creating event request notification:', {
          error: notificationError,
          creatorId,
          locationId: requestData.locationId,
          eventTitle: requestData.eventTitle
        })
        // Don't fail the main operation if notification fails
      }
    }

    return {
      success: true,
      message: 'Event request submitted successfully. The location owner will be notified.',
      eventRequest,
    }
  } catch (error) {
    console.error('Error creating event request:', error)
    return { success: false, message: 'Failed to create event request' }
  }
}

export async function updateEventRequestStatus(
  requestId: string,
  status: 'approved' | 'denied' | 'cancelled',
  denialReason?: string,
  approvalNotes?: string
): Promise<{ success: boolean; message: string }> {
  'use server'
  
  try {
    const user = await getServerSideUser()
    
    if (!user?.id) {
      return { success: false, message: 'Authentication required' }
    }

    const payload = await getPayload({ config })

    // Get the event request to check permissions
    const eventRequest = await payload.findByID({
      collection: 'eventRequests',
      id: requestId,
      populate: {
        location: {
          select: {
            createdBy: true,
          },
        },
        requestedBy: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!eventRequest) {
      return { success: false, message: 'Event request not found' }
    }

    // Extract user IDs properly to handle both string and populated object cases
    const requestedById = typeof eventRequest.requestedBy === 'string' 
      ? eventRequest.requestedBy 
      : eventRequest.requestedBy?.id || eventRequest.requestedBy

    const locationOwnerId = typeof eventRequest.location.createdBy === 'string'
      ? eventRequest.location.createdBy
      : eventRequest.location.createdBy?.id || eventRequest.location.createdBy

    // Check permissions
    const canUpdate = 
      user.id === requestedById || 
      user.id === locationOwnerId

    if (!canUpdate) {
      return { 
        success: false, 
        message: 'You do not have permission to update this request' 
      }
    }

    const updateData: any = {
      status,
      reviewedBy: user.id,
      reviewedAt: new Date().toISOString(),
    }

    if (status === 'denied' && denialReason) {
      updateData.denialReason = denialReason
    }

    if (status === 'approved' && approvalNotes) {
      updateData.approvalNotes = approvalNotes
    }

    await payload.update({
      collection: 'eventRequests',
      id: requestId,
      data: updateData,
    })

    return {
      success: true,
      message: `Event request ${status} successfully`,
    }
  } catch (error) {
    console.error('Error updating event request:', error)
    return { success: false, message: 'Failed to update event request' }
  }
}

export async function getLocationInteractions(
  locationId?: string,
  interactionType?: string,
  limit = 20
): Promise<any[]> {
  'use server'
  
  try {
    const user = await getServerSideUser()
    
    if (!user?.id) {
      return []
    }

    const payload = await getPayload({ config })

    const where: any = {}
    
    if (locationId) {
      where.location = { equals: locationId }
    }
    
    if (interactionType) {
      where.type = { equals: interactionType }
    }

    // Only show public interactions or user's own interactions
    where.or = [
      { isPublic: { equals: true } },
      { user: { equals: user.id } }
    ]

    const interactions = await payload.find({
      collection: 'locationInteractions',
      where,
      limit,
      sort: '-createdAt',
      populate: {
        user: {
          select: {
            name: true,
            profileImage: true,
          },
        },
        location: {
          select: {
            name: true,
            featuredImage: true,
          },
        },
      },
    })

    return interactions.docs
  } catch (error) {
    console.error('Error fetching location interactions:', error)
    return []
  }
}

export async function getUserEventRequests(status?: string): Promise<any[]> {
  'use server'
  
  try {
    const user = await getServerSideUser()
    
    if (!user?.id) {
      return []
    }

    const payload = await getPayload({ config })

    const where: any = {
      or: [
        { requestedBy: { equals: user.id } },
      ],
    }

    // If user owns locations, add those to the query
    const userLocations = await payload.find({
      collection: 'locations',
      where: {
        createdBy: { equals: user.id },
      },
      select: {
        id: true,
      },
    })

    if (userLocations.docs.length > 0) {
      const locationIds = userLocations.docs.map(loc => loc.id)
      where.or.push({
        location: { in: locationIds },
      })
    }

    if (status) {
      where.status = { equals: status }
    }

    const eventRequests = await payload.find({
      collection: 'eventRequests',
      where,
      sort: '-createdAt',
      populate: {
        requestedBy: {
          select: {
            name: true,
            email: true,
            profileImage: true,
          },
        },
        location: {
          select: {
            name: true,
            address: true,
            featuredImage: true,
          },
        },
      },
    })

    return eventRequests.docs
  } catch (error) {
    console.error('Error fetching event requests:', error)
    return []
  }
}

// ===== ADDITIONAL NOTIFICATION TRIGGERS =====

/**
 * Notify subscribers when a location is updated
 */
export async function notifyLocationUpdate(
  locationId: string,
  updateType: 'business_hours' | 'special_offer' | 'general_update',
  updateMessage: string,
  metadata?: any
): Promise<{ success: boolean; message: string; notificationsSent: number }> {
  'use server'
  
  try {
    const payload = await getPayload({ config })
    
    // Get location details
    const location = await payload.findByID({
      collection: 'locations',
      id: locationId,
    })

    if (!location) {
      return { success: false, message: 'Location not found', notificationsSent: 0 }
    }

    // Get all subscribers to this location
    const { docs: subscriptions } = await payload.find({
      collection: 'locationSubscriptions',
      where: {
        location: { equals: locationId },
        isActive: { equals: true },
      },
    })

    console.log(`Found ${subscriptions.length} subscribers for location update notification`)

    let notificationsSent = 0

    // Create notifications for all subscribers
    for (const subscription of subscriptions) {
      try {
        const subscriberId = typeof subscription.user === 'string' 
          ? subscription.user 
          : subscription.user?.id

        if (!subscriberId) continue

        let notificationType = 'reminder'
        let title = `Update for ${location.name}`
        let priority: 'low' | 'normal' | 'high' = 'normal'

        switch (updateType) {
          case 'business_hours':
            notificationType = 'business_hours_update'
            title = `Business hours updated at ${location.name}`
            priority = 'normal'
            break
          case 'special_offer':
            notificationType = 'special_offer'
            title = `Special offer at ${location.name}!`
            priority = 'high'
            break
          case 'general_update':
            notificationType = 'reminder'
            title = `New update from ${location.name}`
            priority = 'normal'
            break
        }

        await payload.create({
          collection: 'notifications',
          data: {
            recipient: subscriberId,
            type: notificationType,
            title,
            message: updateMessage,
            relatedTo: {
              relationTo: 'locations',
              value: locationId,
            },
            metadata: {
              locationName: location.name,
              updateType,
              ...metadata,
            },
            priority,
            read: false,
          },
        })

        notificationsSent++
      } catch (error) {
        console.error('Error creating subscriber notification:', error)
      }
    }

    return {
      success: true,
      message: `Sent ${notificationsSent} notifications to subscribers`,
      notificationsSent
    }
  } catch (error) {
    console.error('Error notifying location subscribers:', error)
    return { success: false, message: 'Failed to send notifications', notificationsSent: 0 }
  }
}

/**
 * Notify location creator when their location gets verified
 */
export async function notifyLocationVerified(locationId: string): Promise<boolean> {
  'use server'
  
  try {
    const payload = await getPayload({ config })
    
    const location = await payload.findByID({
      collection: 'locations',
      id: locationId,
    })

    if (!location) return false

    const creatorId = typeof location.createdBy === 'string' 
      ? location.createdBy 
      : location.createdBy?.id

    if (!creatorId) return false

    await payload.create({
      collection: 'notifications',
      data: {
        recipient: creatorId,
        type: 'location_verified',
        title: 'Your location has been verified!',
        message: `Congratulations! Your location "${location.name}" has been verified and is now featured with a verification badge.`,
        relatedTo: {
          relationTo: 'locations',
          value: locationId,
        },
        metadata: {
          locationName: location.name,
        },
        priority: 'high',
        read: false,
      },
    })

    return true
  } catch (error) {
    console.error('Error creating location verification notification:', error)
    return false
  }
}

/**
 * Notify location creator when their location gets featured
 */
export async function notifyLocationFeatured(locationId: string): Promise<boolean> {
  'use server'
  
  try {
    const payload = await getPayload({ config })
    
    const location = await payload.findByID({
      collection: 'locations',
      id: locationId,
    })

    if (!location) return false

    const creatorId = typeof location.createdBy === 'string' 
      ? location.createdBy 
      : location.createdBy?.id

    if (!creatorId) return false

    await payload.create({
      collection: 'notifications',
      data: {
        recipient: creatorId,
        type: 'location_featured',
        title: 'Your location is now featured!',
        message: `Great news! Your location "${location.name}" has been selected as a featured location and will receive increased visibility.`,
        relatedTo: {
          relationTo: 'locations',
          value: locationId,
        },
        metadata: {
          locationName: location.name,
        },
        priority: 'high',
        read: false,
      },
    })

    return true
  } catch (error) {
    console.error('Error creating location featured notification:', error)
    return false
  }
}

/**
 * Notify location creator when their location reaches milestones
 */
export async function notifyLocationMilestone(
  locationId: string,
  milestoneType: 'likes' | 'visits' | 'reviews' | 'saves',
  milestoneCount: number
): Promise<boolean> {
  'use server'
  
  try {
    const payload = await getPayload({ config })
    
    const location = await payload.findByID({
      collection: 'locations',
      id: locationId,
    })

    if (!location) return false

    const creatorId = typeof location.createdBy === 'string' 
      ? location.createdBy 
      : location.createdBy?.id

    if (!creatorId) return false

    const milestoneMessages = {
      likes: `Your location "${location.name}" has reached ${milestoneCount} likes!`,
      visits: `Your location "${location.name}" has reached ${milestoneCount} visits!`,
      reviews: `Your location "${location.name}" has received ${milestoneCount} reviews!`,
      saves: `Your location "${location.name}" has been saved ${milestoneCount} times!`
    }

    await payload.create({
      collection: 'notifications',
      data: {
        recipient: creatorId,
        type: 'location_milestone',
        title: `🎉 Milestone reached!`,
        message: milestoneMessages[milestoneType],
        relatedTo: {
          relationTo: 'locations',
          value: locationId,
        },
        metadata: {
          locationName: location.name,
          milestoneType,
          milestoneCount,
        },
        priority: 'normal',
        read: false,
      },
    })

    return true
  } catch (error) {
    console.error('Error creating location milestone notification:', error)
    return false
  }
}

/**
 * Notify users about trending locations in their area
 */
export async function notifyTrendingLocation(
  locationId: string,
  userIds: string[]
): Promise<{ success: boolean; notificationsSent: number }> {
  'use server'
  
  try {
    const payload = await getPayload({ config })
    
    const location = await payload.findByID({
      collection: 'locations',
      id: locationId,
    })

    if (!location) return { success: false, notificationsSent: 0 }

    let notificationsSent = 0

    for (const userId of userIds) {
      try {
        await payload.create({
          collection: 'notifications',
          data: {
            recipient: userId,
            type: 'location_trending',
            title: '🔥 Trending location near you!',
            message: `"${location.name}" is trending in your area. Check it out before everyone else!`,
            relatedTo: {
              relationTo: 'locations',
              value: locationId,
            },
            metadata: {
              locationName: location.name,
            },
            priority: 'normal',
            read: false,
          },
        })
        notificationsSent++
      } catch (error) {
        console.error('Error creating trending location notification for user:', userId, error)
      }
    }

    return { success: true, notificationsSent }
  } catch (error) {
    console.error('Error notifying about trending location:', error)
    return { success: false, notificationsSent: 0 }
  }
}

/**
 * Notify users about nearby locations based on proximity
 */
export async function notifyProximityAlert(
  userId: string,
  locationId: string,
  distance: number
): Promise<boolean> {
  'use server'
  
  try {
    const payload = await getPayload({ config })
    
    const location = await payload.findByID({
      collection: 'locations',
      id: locationId,
    })

    if (!location) return false

    // Check if user has proximity notifications enabled and hasn't been notified recently
    const recentNotification = await payload.find({
      collection: 'notifications',
      where: {
        recipient: { equals: userId },
        type: { equals: 'proximity_alert' },
        'relatedTo.value': { equals: locationId },
        createdAt: { greater_than: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
      },
      limit: 1,
    })

    if (recentNotification.docs.length > 0) {
      return false // Don't spam with proximity alerts
    }

    await payload.create({
      collection: 'notifications',
      data: {
        recipient: userId,
        type: 'proximity_alert',
        title: '📍 You\'re near a great location!',
        message: `You're only ${Math.round(distance)}m away from "${location.name}". Perfect time to check it out!`,
        relatedTo: {
          relationTo: 'locations',
          value: locationId,
        },
        metadata: {
          locationName: location.name,
          distance,
        },
        priority: 'low',
        read: false,
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // Expires in 4 hours
      },
    })

    return true
  } catch (error) {
    console.error('Error creating proximity alert notification:', error)
    return false
  }
}

/**
 * Notify when friends check in at locations
 */
export async function notifyFriendCheckIn(
  locationId: string,
  checkInUserId: string,
  friendIds: string[]
): Promise<{ success: boolean; notificationsSent: number }> {
  'use server'
  
  try {
    const payload = await getPayload({ config })
    
    const location = await payload.findByID({
      collection: 'locations',
      id: locationId,
    })

    const checkInUser = await payload.findByID({
      collection: 'users',
      id: checkInUserId,
    })

    if (!location || !checkInUser) return { success: false, notificationsSent: 0 }

    let notificationsSent = 0

    for (const friendId of friendIds) {
      try {
        await payload.create({
          collection: 'notifications',
          data: {
            recipient: friendId,
            type: 'friend_checkin',
            title: '👋 Friend activity!',
            message: `${checkInUser.name} just checked in at "${location.name}". Want to join them?`,
            actionBy: checkInUserId,
            relatedTo: {
              relationTo: 'locations',
              value: locationId,
            },
            metadata: {
              locationName: location.name,
              friendName: checkInUser.name,
            },
            priority: 'normal',
            read: false,
          },
        })
        notificationsSent++
      } catch (error) {
        console.error('Error creating friend check-in notification for user:', friendId, error)
      }
    }

    return { success: true, notificationsSent }
  } catch (error) {
    console.error('Error notifying about friend check-in:', error)
    return { success: false, notificationsSent: 0 }
  }
}

/**
 * Check and notify milestones for location interactions
 */
export async function checkAndNotifyMilestones(
  locationId: string,
  interactionType: string
): Promise<void> {
  'use server'
  
  try {
    const payload = await getPayload({ config })
    
    // Get current interaction counts for this location
    const interactionCounts = await payload.find({
      collection: 'locationInteractions',
      where: {
        location: { equals: locationId },
      },
    })

    // Count different interaction types
    const likesCount = interactionCounts.docs.filter(doc => doc.type === 'like').length
    const visitsCount = interactionCounts.docs.filter(doc => ['visit', 'check_in'].includes(doc.type)).length
    const savesCount = interactionCounts.docs.filter(doc => doc.type === 'save').length

    // Get reviews count
    const reviewsCount = await payload.find({
      collection: 'reviews',
      where: {
        location: { equals: locationId },
        reviewType: { equals: 'location' },
      },
    })

    // Check for milestone achievements
    const milestones = [10, 25, 50, 100, 250, 500, 1000]
    
    for (const milestone of milestones) {
      // Check likes milestone
      if (interactionType === 'like' && likesCount === milestone) {
        await notifyLocationMilestone(locationId, 'likes', milestone)
      }
      
      // Check visits milestone
      if (['visit', 'check_in'].includes(interactionType) && visitsCount === milestone) {
        await notifyLocationMilestone(locationId, 'visits', milestone)
      }
      
      // Check saves milestone
      if (interactionType === 'save' && savesCount === milestone) {
        await notifyLocationMilestone(locationId, 'saves', milestone)
      }
      
      // Check reviews milestone (if this was triggered by a review)
      if (interactionType === 'review' && reviewsCount.totalDocs === milestone) {
        await notifyLocationMilestone(locationId, 'reviews', milestone)
      }
    }
  } catch (error) {
    console.error('Error checking milestones:', error)
  }
}

/**
 * Enhanced function to create location and trigger initial notifications
 */
export async function createLocationWithNotifications(data: LocationFormData): Promise<any> {
  'use server'
  
  try {
    const user = await getServerSideUser()
    
    if (!user?.id) {
      throw new Error('Authentication required')
    }

    // Set the creator
    data.createdBy = user.id

    const payload = await getPayload({ config })

    // Create the location
    const location = await payload.create({
      collection: 'locations',
      data,
    })

    // If location is published and verified, notify relevant users
    if (data.status === 'published' && data.isVerified) {
      await notifyLocationVerified(String(location.id))
    }

    return location
  } catch (error) {
    console.error('Error creating location with notifications:', error)
    throw error
  }
}

export async function getLocationSpecials(locationId: string): Promise<any[]> {
  'use server'
  
  try {
    const payload = await getPayload({ config })

    const specials = await payload.find({
      collection: 'specials',
      where: {
        location: {
          equals: locationId,
        },
        status: {
          equals: 'published',
        },
        // Only show current and future specials
        or: [
          {
            isOngoing: {
              equals: true,
            },
          },
          {
            endDate: {
              greater_than_equal: new Date().toISOString(),
            },
          },
        ],
      },
      sort: '-createdAt',
      limit: 10,
      depth: 2,
    })

    return specials.docs || []
  } catch (error) {
    console.error('Error fetching location specials:', error)
    return []
  }
}

// Enhanced comment reply functionality
export async function addCommentReply(postId: string, parentCommentId: string, content: string, userId: string) {
  console.log(`Adding reply to comment ${parentCommentId} in post ${postId} by user ${userId}`)

  try {
    const payload = await getPayload({ config })

    // Get the post
    const post = await payload.findByID({
      collection: "posts",
      id: postId,
    })

    if (!post) {
      throw new Error(`Post with ID ${postId} not found`)
    }

    // Find the parent comment
    const comments = post.comments || []
    const parentCommentIndex = comments.findIndex((c: any) => c.id === parentCommentId)

    if (parentCommentIndex === -1) {
      throw new Error(`Parent comment with ID ${parentCommentId} not found`)
    }

    // Create a new reply object
    const newReply = {
      id: `reply-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      content,
      author: userId,
      createdAt: new Date().toISOString(),
      likeCount: 0,
      isLiked: false,
      parentCommentId,
      isReply: true,
    }

    // Add the reply to the parent comment's replies array
    const parentComment = comments[parentCommentIndex]
    const updatedParentComment = {
      ...parentComment,
      replies: Array.isArray(parentComment.replies) ? [...parentComment.replies, newReply] : [newReply]
    }

    // Update the comments array
    const updatedComments = [...comments]
    updatedComments[parentCommentIndex] = updatedParentComment

    // Update the post with the new reply
    await payload.update({
      collection: "posts",
      id: postId,
      data: {
        comments: updatedComments,
        commentCount: comments.length, // Don't count replies in main comment count
      },
    })

    // Revalidate relevant paths
    revalidatePath('/feed')
    revalidatePath(`/post/${postId}`)

    return newReply
  } catch (error) {
    console.error("Error adding comment reply:", error)
    throw error
  }
}

// Enhanced comment liking with reply support
export async function likeCommentOrReply(postId: string, commentId: string, isLiking: boolean, userId: string, isReply: boolean = false) {
  console.log(`${isLiking ? "Liking" : "Unliking"} ${isReply ? 'reply' : 'comment'} ${commentId} by user ${userId}`)

  try {
    const payload = await getPayload({ config })

    // Get the post
    const post = await payload.findByID({
      collection: "posts",
      id: postId,
    })

    if (!post) {
      throw new Error(`Post with ID ${postId} not found`)
    }

    const comments = post.comments || []
    let updatedComments = [...comments]
    let found = false

    if (isReply) {
      // Handle reply liking
      for (let i = 0; i < updatedComments.length; i++) {
        const comment = updatedComments[i]
        if (comment.replies && Array.isArray(comment.replies)) {
          const replyIndex = comment.replies.findIndex((r: any) => r.id === commentId)
          if (replyIndex !== -1) {
            const reply = comment.replies[replyIndex]
            const updatedReply = {
              ...reply,
              likeCount: isLiking ? (reply.likeCount || 0) + 1 : Math.max((reply.likeCount || 0) - 1, 0),
              isLiked: isLiking,
              likedBy: isLiking 
                ? [...(reply.likedBy || []), userId]
                : (reply.likedBy || []).filter((id: string) => id !== userId)
            }

            const updatedReplies = [...comment.replies]
            updatedReplies[replyIndex] = updatedReply

            updatedComments[i] = {
              ...comment,
              replies: updatedReplies
            }
            found = true
            break
          }
        }
      }
    } else {
      // Handle comment liking
      const commentIndex = updatedComments.findIndex((c: any) => c.id === commentId)
      if (commentIndex !== -1) {
        const comment = updatedComments[commentIndex]
        const updatedComment = {
          ...comment,
          likeCount: isLiking ? (comment.likeCount || 0) + 1 : Math.max((comment.likeCount || 0) - 1, 0),
          isLiked: isLiking,
          likedBy: isLiking 
            ? [...(comment.likedBy || []), userId]
            : (comment.likedBy || []).filter((id: string) => id !== userId)
        }

        updatedComments[commentIndex] = updatedComment
        found = true
      }
    }

    if (!found) {
      throw new Error(`${isReply ? 'Reply' : 'Comment'} with ID ${commentId} not found`)
    }

    // Update the post with the modified comments array
    await payload.update({
      collection: "posts",
      id: postId,
      data: {
        comments: updatedComments,
      },
    })

    // Revalidate relevant paths
    revalidatePath('/feed')
    revalidatePath(`/post/${postId}`)

    return { success: true }
  } catch (error) {
    console.error("Error updating comment/reply like status:", error)
    throw error
  }
}

// Get comments with enhanced structure including replies and user interaction state
export async function getCommentsWithReplies(postId: string, currentUserId?: string): Promise<Comment[]> {
  console.log(`Getting comments with replies for post ID: ${postId}`)

  try {
    const payload = await getPayload({ config })

    // Fetch the post with its comments
    const post = await payload.findByID({
      collection: "posts",
      id: postId,
      depth: 2, // Load comment authors
    })

    if (!post || !post.comments || !Array.isArray(post.comments)) {
      return []
    }

    // Format comments for the frontend with replies and user interaction state
    const formattedComments = post.comments.map((comment: any) => {
      const isLikedByUser = currentUserId && comment.likedBy && comment.likedBy.includes(currentUserId)
      
      // Format replies if they exist
      const formattedReplies = comment.replies && Array.isArray(comment.replies) 
        ? comment.replies.map((reply: any) => ({
            id: reply.id || `reply-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            author: {
              id: typeof reply.author === "object" ? reply.author.id : reply.author,
              name: typeof reply.author === "object" ? reply.author.name : "Unknown User",
              avatar: typeof reply.author === "object" && reply.author.profileImage
                ? reply.author.profileImage.url
                : undefined,
            },
            content: reply.content || "",
            createdAt: reply.createdAt || new Date().toISOString(),
            likeCount: reply.likeCount || 0,
            isLiked: currentUserId && reply.likedBy && reply.likedBy.includes(currentUserId),
            parentCommentId: comment.id,
            isReply: true,
          }))
        : []

      return {
        id: comment.id || `comment-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        author: {
          id: typeof comment.author === "object" ? comment.author.id : comment.author,
          name: typeof comment.author === "object" ? comment.author.name : "Unknown User",
          avatar: typeof comment.author === "object" && comment.author.profileImage
            ? comment.author.profileImage.url
            : undefined,
        },
        content: comment.content || "",
        createdAt: comment.createdAt || new Date().toISOString(),
        likeCount: comment.likeCount || 0,
        isLiked: isLikedByUser || false,
        replies: formattedReplies,
        replyCount: formattedReplies.length,
      }
    })

    // Sort by newest first
    return formattedComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch (error) {
    console.error("Error fetching comments with replies:", error)
    return []
  }
}

// Add personalized location actions
export async function getPersonalizedLocations(
  userId: string,
  limit = 20,
  offset = 0
): Promise<any[]> {
  'use server'
  
  try {
    const { locationPersonalizationService } = await import('@/lib/features/locations/personalization-service');
    return await locationPersonalizationService.getPersonalizedLocations(userId, limit, offset);
  } catch (error) {
    console.error('Error getting personalized locations:', error);
    return [];
  }
}

export async function getFilteredLocationsAction(
  userId: string,
  filters: {
    category?: string;
    priceRange?: string;
    radius?: number;
    isOpen?: boolean;
    rating?: number;
  },
  limit = 20,
  offset = 0
): Promise<any[]> {
  'use server'
  
  try {
    const { locationPersonalizationService } = await import('@/lib/features/locations/personalization-service');
    return await locationPersonalizationService.getFilteredLocations(userId, filters, limit, offset);
  } catch (error) {
    console.error('Error getting filtered locations:', error);
    return [];
  }
}

/**
 * Get user's personalization preferences for display
 */
export async function getUserPersonalizationData(userId: string): Promise<{
  hasCompletedOnboarding: boolean;
  interests: string[];
  primaryUseCase?: string;
  budgetPreference?: string;
  travelRadius?: string;
  preferencesSummary: string[];
}> {
  'use server'
  
  try {
    const payload = await getPayload({ config });
    
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
      depth: 1,
    });

    if (!user) {
      return {
        hasCompletedOnboarding: false,
        interests: [],
        preferencesSummary: [],
      };
    }

    const hasCompletedOnboarding = user.onboardingData?.onboardingCompleted || false;
    const interests = user.interests || [];
    const onboardingData = user.onboardingData || {};

    // Generate a summary of preferences
    const preferencesSummary: string[] = [];
    
    if (interests.length > 0) {
      const interestLabels = interests.map((interest: string) => {
        const interestMap: { [key: string]: string } = {
          coffee: 'Coffee Shops',
          restaurants: 'Restaurants', 
          nature: 'Nature & Parks',
          photography: 'Photography Spots',
          nightlife: 'Nightlife',
          shopping: 'Shopping',
          arts: 'Arts & Culture',
          sports: 'Sports & Recreation',
          markets: 'Markets & Local Business',
          events: 'Events & Entertainment'
        };
        return interestMap[interest] || interest;
      });
      preferencesSummary.push(`Interested in ${interestLabels.join(', ')}`);
    }
    
    if (onboardingData.primaryUseCase) {
      const useCaseMap: { [key: string]: string } = {
        explore: 'discovering new places',
        plan: 'planning outings',
        share: 'sharing discoveries',
        connect: 'meeting people',
      };
      preferencesSummary.push(`Primarily uses app for ${useCaseMap[onboardingData.primaryUseCase] || onboardingData.primaryUseCase}`);
    }
    
    if (onboardingData.budgetPreference) {
      const budgetMap: { [key: string]: string } = {
        free: 'free activities',
        budget: 'budget-friendly places',
        moderate: 'moderately priced places',
        premium: 'premium places',
        luxury: 'luxury places'
      };
      preferencesSummary.push(`Prefers ${budgetMap[onboardingData.budgetPreference] || onboardingData.budgetPreference}`);
    }
    
    if (onboardingData.travelRadius) {
      const radiusMap: { [key: string]: string } = {
        '0.5': 'walking distance',
        '2': 'nearby (2 mi)',
        '5': 'local area (5 mi)', 
        '15': 'extended area (15 mi)',
        'unlimited': 'anywhere',
      };
      preferencesSummary.push(`Willing to travel ${radiusMap[onboardingData.travelRadius] || onboardingData.travelRadius}`);
    }

    return {
      hasCompletedOnboarding,
      interests,
      primaryUseCase: onboardingData.primaryUseCase,
      budgetPreference: onboardingData.budgetPreference,
      travelRadius: onboardingData.travelRadius,
      preferencesSummary,
    };
  } catch (error) {
    console.error('Error getting user personalization data:', error);
    return {
      hasCompletedOnboarding: false,
      interests: [],
      preferencesSummary: [],
    };
  }
}

// Enhanced Feed Algorithms for different tabs
export async function getDiscoverFeed(currentUserId?: string, page = 1, pageSize = 10): Promise<Post[]> {
  // Getting discover feed
  
  try {
    const payload = await getPayload({ config })
    
    // Get user's preferences and activity if available
    let userPreferences: any = {}
    let userFollowing: string[] = []
    let userLocation: { latitude?: number; longitude?: number } = {}
    
    if (currentUserId && currentUserId.trim() !== '') {
      try {
        console.log(`Attempting to fetch user data for ID: ${currentUserId}`)
        const user = await payload.findByID({
          collection: 'users',
          id: currentUserId,
          depth: 1,
        })
        
        if (user) {
          console.log(`Successfully fetched user data for ${currentUserId}`)
          userFollowing = user.following || []
          userLocation = user.location || {}
          // Get user's interaction history to understand preferences
          userPreferences = {
            categories: user.preferredCategories || [],
            locations: user.visitedLocations || [],
            interactionHistory: user.likedPosts || []
          }
        }
      } catch (userError) {
        console.error(`Error fetching user data for discover feed (ID: ${currentUserId}):`, userError)
        // Continue without user data - this is fine for discovery
        // Don't throw error, just log it and continue with generic discovery
      }
    } else {
      console.log('No currentUserId provided, using anonymous discovery feed')
    }

    // Build complex query for discover algorithm
    const query: any = {
      status: { equals: "published" }
    }

    // Fetch posts with sophisticated sorting
    const result = await payload.find({
      collection: "posts",
      where: query,
      sort: '-createdAt', // We'll re-sort with our algorithm
      limit: pageSize * 3, // Get more posts to apply our algorithm
      page: 1, // Always get from first page for algorithm
      depth: 2,
    })

    let posts = result.docs || []

    if (posts.length === 0) {
      console.log('No posts found for discover feed')
      return []
    }

    // Apply Discover Algorithm
    const scoredPosts = posts.map((post: any) => {
      let score = 0
      const now = new Date()
      const postDate = new Date(post.createdAt)
      const hoursOld = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60)
      
      // Base engagement score (40% of total)
      const engagementScore = (
        (post.likes?.length || 0) * 3 +
        (post.comments?.length || 0) * 5 +
        (post.shares || 0) * 7 +
        (post.savedBy?.length || 0) * 4
      )
      score += engagementScore * 0.4

      // Freshness score (25% of total) - favor recent but not too recent
      if (hoursOld < 2) {
        score += 20 * 0.25 // Very recent posts get lower score
      } else if (hoursOld < 24) {
        score += 100 * 0.25 // Sweet spot for discovery
      } else if (hoursOld < 168) { // 1 week
        score += (100 - (hoursOld - 24) * 0.5) * 0.25
      } else {
        score += 10 * 0.25 // Older posts get minimal freshness score
      }

      // Diversity score (20% of total) - favor posts from different authors/locations
      if (post.author && typeof post.author === 'object') {
        // Boost posts from authors user doesn't follow (for discovery)
        if (!userFollowing.includes(post.author.id)) {
          score += 50 * 0.2
        }
      }

      // Quality indicators (15% of total)
      if (post.image || post.featuredImage) score += 20 * 0.15
      if (post.location) score += 15 * 0.15
      if (post.type === 'review' && post.rating >= 4) score += 25 * 0.15
      if (post.content && post.content.length > 100) score += 10 * 0.15

      // Trending momentum - posts gaining traction quickly
      const engagementRate = engagementScore / Math.max(hoursOld, 1)
      if (engagementRate > 5) score += 30

      // Location relevance if user has location
      if (userLocation.latitude && userLocation.longitude && post.location) {
        // This would need actual distance calculation
        score += 10 // Placeholder for location relevance
      }

      return { ...post, discoveryScore: score }
    })

    // Sort by discovery score and apply pagination
    const sortedPosts = scoredPosts
      .sort((a, b) => b.discoveryScore - a.discoveryScore)
      .slice((page - 1) * pageSize, page * pageSize)

    console.log(`Successfully processed ${sortedPosts.length} posts for discover feed`)
    return await formatPostsForFrontend(sortedPosts, currentUserId)
  } catch (error) {
    console.error("Error fetching discover feed:", error)
    return []
  }
}

export async function getPopularFeed(currentUserId?: string, page = 1, pageSize = 10, timeframe = '7d'): Promise<Post[]> {
  // Getting popular feed
  
  try {
    const payload = await getPayload({ config })
    
    // Log the user ID for debugging
    if (currentUserId) {
      console.log(`Fetching popular feed for user ID: ${currentUserId}`)
    } else {
      console.log('Fetching popular feed for anonymous user')
    }
    
    // Calculate date threshold based on timeframe
    const now = new Date()
    let dateThreshold = new Date()
    
    switch (timeframe) {
      case '24h':
        dateThreshold.setHours(now.getHours() - 24)
        break
      case '7d':
        dateThreshold.setDate(now.getDate() - 7)
        break
      case '30d':
        dateThreshold.setDate(now.getDate() - 30)
        break
      default:
        dateThreshold.setDate(now.getDate() - 7)
    }

    const query: any = {
      status: { equals: "published" },
      createdAt: {
        greater_than: dateThreshold.toISOString()
      }
    }

    const result = await payload.find({
      collection: "posts",
      where: query,
      sort: '-createdAt',
      limit: pageSize * 2, // Get more posts for better algorithm
      page: 1,
      depth: 2,
    })

    let posts = result.docs || []

    if (posts.length === 0) {
      console.log('No posts found for popular feed')
      return []
    }

    // Apply Popular Algorithm - weighted engagement scoring
    const scoredPosts = posts.map((post: any) => {
      const likes = post.likes?.length || 0
      const comments = post.comments?.length || 0
      const shares = post.shares || 0
      const saves = post.savedBy?.length || 0
      
      // Calculate time decay factor
      const postDate = new Date(post.createdAt)
      const hoursOld = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60)
      const timeDecay = Math.exp(-hoursOld / 48) // Exponential decay over 48 hours
      
      // Weighted popularity score
      const popularityScore = (
        likes * 1.0 +           // Base like weight
        comments * 3.0 +        // Comments are more valuable
        shares * 5.0 +          // Shares are highly valuable
        saves * 2.5             // Saves indicate quality
      ) * timeDecay             // Apply time decay
      
      // Bonus for high engagement rate
      const engagementRate = (likes + comments + shares + saves) / Math.max(hoursOld, 1)
      const viralBonus = engagementRate > 10 ? engagementRate * 2 : 0
      
      return { ...post, popularityScore: popularityScore + viralBonus }
    })

    // Sort by popularity score and apply pagination
    const sortedPosts = scoredPosts
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice((page - 1) * pageSize, page * pageSize)

    console.log(`Successfully processed ${sortedPosts.length} posts for popular feed`)
    return await formatPostsForFrontend(sortedPosts, currentUserId)
  } catch (error) {
    console.error("Error fetching popular feed:", error)
    return []
  }
}

export async function getLatestFeed(currentUserId?: string, page = 1, pageSize = 10, category?: string): Promise<Post[]> {
  // Getting latest feed
  
  try {
    const payload = await getPayload({ config })
    
    // Log the user ID for debugging
    if (currentUserId) {
      console.log(`Fetching latest feed for user ID: ${currentUserId}`)
    } else {
      console.log('Fetching latest feed for anonymous user')
    }
    
    const query: any = {
      status: { equals: "published" }
    }

    // Add category filter if specified
    if (category && category !== 'all') {
      query.categories = {
        contains: category
      }
    }

    // Simple chronological sort with quality filtering
    const result = await payload.find({
      collection: "posts",
      where: query,
      sort: '-createdAt', // Newest first
      limit: pageSize,
      page: page,
      depth: 2,
    })

    let posts = result.docs || []

    if (posts.length === 0) {
      console.log('No posts found for latest feed')
      return []
    }

    // Optional: Apply minimal quality filtering for latest feed
    const qualityFilteredPosts = posts.filter((post: any) => {
      // Filter out very low quality posts
      const hasContent = post.content && post.content.length > 10
      const hasEngagement = (post.likes?.length || 0) + (post.comments?.length || 0) > 0 || 
                           new Date(post.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Or is less than 24h old
      
      return hasContent && hasEngagement
    })

    console.log(`Successfully processed ${qualityFilteredPosts.length} posts for latest feed`)
    return await formatPostsForFrontend(qualityFilteredPosts, currentUserId)
  } catch (error) {
    console.error("Error fetching latest feed:", error)
    return []
  }
}

export async function getSavedPostsFeed(currentUserId: string, page = 1, pageSize = 10): Promise<Post[]> {
  // Getting saved posts feed
  
  if (!currentUserId) {
    return []
  }

  try {
    const payload = await getPayload({ config })
    
    // Get user's saved posts
    const user = await payload.findByID({
      collection: 'users',
      id: currentUserId,
      depth: 0,
    })

    if (!user || !user.savedPosts || user.savedPosts.length === 0) {
      return []
    }

    const savedPostIds = user.savedPosts

    // Calculate pagination for saved posts
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedSavedIds = savedPostIds.slice(startIndex, endIndex)

    if (paginatedSavedIds.length === 0) {
      return []
    }

    // Fetch the saved posts
    const result = await payload.find({
      collection: "posts",
      where: {
        id: {
          in: paginatedSavedIds
        },
        status: { equals: "published" }
      },
      sort: '-updatedAt', // Sort by when they were last updated
      limit: pageSize,
      depth: 2,
    })

    let posts = result.docs || []

    // Sort posts by the order they were saved (most recently saved first)
    const sortedPosts = posts.sort((a, b) => {
      const aIndex = savedPostIds.indexOf(a.id)
      const bIndex = savedPostIds.indexOf(b.id)
      return aIndex - bIndex // Earlier in savedPosts array = more recently saved
    })

    return await formatPostsForFrontend(sortedPosts, currentUserId)
  } catch (error) {
    console.error("Error fetching saved posts feed:", error)
    return []
  }
}

// Helper function to format posts consistently
async function formatPostsForFrontend(posts: any[], currentUserId?: string): Promise<Post[]> {
  // Get user's liked and saved posts if currentUserId is provided and valid
  let userLikedPosts: string[] = []
  let userSavedPosts: string[] = []
  
  if (currentUserId && currentUserId.trim() !== '' && currentUserId !== 'undefined' && currentUserId !== 'null') {
    try {
      console.log(`Fetching user interaction data for user ID: ${currentUserId}`)
      const payload = await getPayload({ config })
      const user = await payload.findByID({
        collection: 'users',
        id: currentUserId,
        depth: 0,
      })
      
      if (user) {
        console.log(`Successfully fetched user interaction data for ${currentUserId}`)
        userLikedPosts = Array.isArray(user.likedPosts) ? user.likedPosts : []
        userSavedPosts = Array.isArray(user.savedPosts) ? user.savedPosts : []
      }
    } catch (error) {
      console.error(`Error fetching user interaction data (ID: ${currentUserId}):`, error)
      // Continue with empty arrays - this is fine for public viewing
    }
  } else if (currentUserId) {
    console.log('Invalid currentUserId provided, using anonymous interaction data')
  }

  return posts.map((post: any) => {
    try {
      const postId = String(post.id)
      
      // Debug media objects for first few posts
      if (posts.indexOf(post) < 2) {
        console.log(`🎯 Server formatting post ${postId} media:`, {
          image: post.image,
          video: post.video,
          photos: post.photos,
          videoThumbnail: post.videoThumbnail,
        })
      }
      
      return {
        id: postId,
        author: {
          id: typeof post.author === "object" && post.author ? post.author.id : post.author || "unknown",
          name: typeof post.author === "object" && post.author ? post.author.name : "Unknown User",
          avatar: (() => {
            if (typeof post.author === "object" && post.author) {
              // Try multiple possible avatar fields
              if (post.author.profileImage?.url) return post.author.profileImage.url;
              if (post.author.avatar) return post.author.avatar;
              if (post.author.profilePicture?.url) return post.author.profilePicture.url;
              if (typeof post.author.profilePicture === 'string') return post.author.profilePicture;
            }
            return undefined;
          })(),
          profileImage: (() => {
            if (typeof post.author === "object" && post.author) {
              if (post.author.profileImage?.url) return { url: post.author.profileImage.url };
              if (post.author.profilePicture?.url) return { url: post.author.profilePicture.url };
              if (typeof post.author.profilePicture === 'string') return { url: post.author.profilePicture };
            }
            return undefined;
          })(),
        },
        title: post.title || "",
        content: post.content || "",
        createdAt: post.createdAt || new Date().toISOString(),
        updatedAt: post.updatedAt || post.createdAt || new Date().toISOString(),
        image: post.image || post.featuredImage || undefined,
        video: post.video || undefined,
        videoThumbnail: post.videoThumbnail || undefined,
        photos: (() => {
          // Handle photos array - preserve complete objects
          if (Array.isArray(post.photos)) {
            return post.photos.filter(Boolean);
          } else if (Array.isArray(post.gallery)) {
            // Also check for gallery field as fallback
            return post.gallery.map((item: any) => {
              if (typeof item === 'object' && item?.image) {
                return item.image;
              }
              return item;
            }).filter(Boolean);
          }
          return undefined;
        })(),
        likeCount: Array.isArray(post.likes) ? post.likes.length : 0,
        commentCount: Array.isArray(post.comments) ? post.comments.length : 0,
        shareCount: post.shares || 0,
        saveCount: Array.isArray(post.savedBy) ? post.savedBy.length : 0,
        isLiked: userLikedPosts.includes(postId), // Check if user has liked this post
        isSaved: userSavedPosts.includes(postId), // Check if user has saved this post
        type: post.type || "post",
        rating: post.rating,
        location: post.location
          ? {
              id: typeof post.location === "object" && post.location ? post.location.id : post.location,
              name: typeof post.location === "object" && post.location ? post.location.name : "Unknown Location",
            }
          : undefined,
        categories: Array.isArray(post.categories) ? post.categories : [],
        tags: Array.isArray(post.tags) ? post.tags : []
      }
    } catch (formatError) {
      console.error("Error formatting post:", formatError, post)
      return {
        id: String(post.id || Math.random()),
        author: {
          id: "unknown",
          name: "Unknown User",
          avatar: undefined,
        },
        title: "",
        content: "Post content unavailable",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        image: undefined,
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
        saveCount: 0,
        isLiked: false,
        isSaved: false,
        type: "post",
        rating: undefined,
        location: undefined,
        categories: [],
        tags: []
      }
    }
  }).filter(Boolean)
}

// Bucket List Functions
export async function getUserBucketLists(userId: string) {
  try {
    const payload = await getPayload({ config })
    
    const { docs: bucketLists } = await payload.find({
      collection: 'bucketLists',
      where: {
        user: { equals: userId },
      },
      sort: '-createdAt',
      depth: 2,
    })
    
    return bucketLists
  } catch (error) {
    console.error('Error fetching user bucket lists:', error)
    return []
  }
}

export async function getBucketListItems(bucketListId: string) {
  try {
    const payload = await getPayload({ config })
    
    const bucketList = await payload.findByID({
      collection: 'bucketLists',
      id: bucketListId,
      depth: 2,
    })
    
    return bucketList?.items || []
  } catch (error) {
    console.error('Error fetching bucket list items:', error)
    return []
  }
}

export async function createBucketList(data: { name: string; description?: string; user: string }) {
  try {
    const payload = await getPayload({ config })
    
    const bucketList = await payload.create({
      collection: 'bucketLists',
      data: {
        ...data,
        items: [],
        status: 'active',
      },
    })
    
    return bucketList
  } catch (error) {
    console.error('Error creating bucket list:', error)
    throw error
  }
}

export async function addItemToBucketList(bucketListId: string, item: any) {
  try {
    const payload = await getPayload({ config })
    
    // Get current bucket list
    const bucketList = await payload.findByID({
      collection: 'bucketLists',
      id: bucketListId,
      depth: 0,
    })
    
    if (!bucketList) {
      throw new Error('Bucket list not found')
    }
    
    // Add new item to the items array
    const updatedItems = [...(bucketList.items || []), item]
    
    const updated = await payload.update({
      collection: 'bucketLists',
      id: bucketListId,
      data: {
        items: updatedItems,
      },
    })
    
    return updated
  } catch (error) {
    console.error('Error adding item to bucket list:', error)
    throw error
  }
}

// Search Functions
export async function searchUsers(query: string, currentUserId?: string, limit = 10) {
  try {
    const payload = await getPayload({ config })
    
    const { docs: users } = await payload.find({
      collection: 'users',
      where: {
        or: [
          {
            name: {
              contains: query,
            },
          },
          {
            email: {
              contains: query,
            },
          },
          {
            username: {
              contains: query,
            },
          },
        ],
      },
      limit,
      depth: 1,
    })
    
    // Filter out current user
    const filteredUsers = users.filter(user => user.id !== currentUserId)
    
    return filteredUsers.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      avatar: user.profileImage?.url,
      bio: user.bio,
    }))
  } catch (error) {
    console.error('Error searching users:', error)
    return []
  }
}

export async function searchLocationsAction(query: string, limit = 10) {
  try {
    const payload = await getPayload({ config })
    
    const { docs: locations } = await payload.find({
      collection: 'locations',
      where: {
        or: [
          {
            name: {
              contains: query,
            },
          },
          {
            description: {
              contains: query,
            },
          },
          {
            'address.city': {
              contains: query,
            },
          },
        ],
        status: { equals: 'published' },
      },
      limit,
      depth: 1,
    })
    
    return locations.map(location => ({
      id: location.id,
      name: location.name,
      description: location.description,
      address: location.address,
      coordinates: location.coordinates,
      featuredImage: location.featuredImage,
      categories: location.categories,
    }))
  } catch (error) {
    console.error('Error searching locations:', error)
    return []
  }
}

export async function searchEventsAction(query: string, limit = 10) {
  try {
    const payload = await getPayload({ config })
    
    const { docs: events } = await payload.find({
      collection: 'events',
      where: {
        or: [
          {
            name: {
              contains: query,
            },
          },
          {
            description: {
              contains: query,
            },
          },
        ],
        status: { equals: 'published' },
      },
      limit,
      depth: 1,
    })
    
    return events.map(event => ({
      id: event.id,
      name: event.name,
      description: event.description,
      date: event.date,
      location: event.location,
      featuredImage: event.featuredImage,
      categories: event.categories,
    }))
  } catch (error) {
    console.error('Error searching events:', error)
    return []
  }
}

export async function updateLocationPrivacy(
  locationId: string,
  privacy: 'public' | 'private',
  privateAccess: string[]
): Promise<{ success: boolean; message: string }> {
  const payload = await getPayload({ config: config })
  
  try {
    // Validate input
    if (!['public', 'private'].includes(privacy)) {
      throw new Error('Invalid privacy setting')
    }

    if (privacy === 'private' && (!Array.isArray(privateAccess) || privateAccess.length === 0)) {
      throw new Error('Private locations must have at least one friend selected')
    }

    // Prepare update data
    const updateData: any = {
      privacy: privacy
    }

    if (privacy === 'private') {
      updateData.privateAccess = privateAccess
    } else {
      // Clear private access when switching to public
      updateData.privateAccess = []
    }

    // Update the location
    await payload.update({
      collection: 'locations',
      id: locationId,
      data: updateData
    })

    return {
      success: true,
      message: 'Privacy settings updated successfully'
    }

  } catch (error) {
    console.error('Error updating location privacy:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update privacy settings'
    }
  }
}