/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
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

// Extend the Post interface to include shareCount
declare module "@/types/feed" {
  interface Post {
    shareCount?: number;
  }
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

    // Filter out locations without valid coordinates
    const validLocations = processedLocations.filter(
      (loc) => loc.latitude !== null && loc.longitude !== null && !isNaN(loc.latitude) && !isNaN(loc.longitude),
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
  const result = await payload.find({
    collection: "categories",
    depth: 1,
    where: {
      isActive: {
        equals: true,
      },
    },
    sort: "order",
    limit: 100,
    overrideAccess: true,
  })
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

  // 3. Create the document in Payload
  const payload = await getPayload({config: config});
  const created = await payload.create({
    collection: 'locations',
    data: {
      ...data,
      coordinates: { latitude, longitude },
    },
  });

  return created;
}



interface SignupInput {
  email: string;
  password: string;
  name: string;
  coords: {
    latitude: number;
    longitude: number;
  }
}



export async function signupUser(data: SignupInput){
  const payload = await getPayload({ config: config });
  try{
    const user = await payload.create({
      collection: 'users',
      data: {
        email: data.email,
        password: data.password,
        name: data.name,
        location: {
          coordinates: {
            latitude: data.coords.latitude,
            longitude: data.coords.longitude,
          }
        }
      },
    
    })
        return user
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

    return review
  } catch (error) {
    console.error("Error creating review:", error)
    throw new Error("Review creation failed")
  }
}





export async function getUserbyId(id: string) {
  try {
    console.log("getUserbyId called with ID:", id)
    
    if (!id) {
      console.error("getUserbyId called with empty id")
      return null
    }
    
    const payload = await getPayload({ config: config })
    const result = await payload.findByID({
      collection: "users",
      id,
      depth: 2,
      overrideAccess: true,
    })
    
    console.log(`Found user:`, result ? `${result.name || 'Unknown'} (ID: ${result.id})` : 'No user found')
    return result
  } catch (error) {
    console.error("Error in getUserbyId:", error)
    return null
  }
}

export async function getFeedPostsByUser(id: string) {
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'posts',
    depth: 2,
    where: {
      author: {
        equals: id,
      },
    },
    sort: '-createdAt', // optional: most recent first
  })

  return docs
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
  const payload = await getPayload({ config });

  try {
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
      depth: 1,
    });

    return user?.following || [];
  } catch (error) {
    console.error('Error fetching following:', error);
    throw error;
  }
}

export async function getFollowers(userId: string) {
  const payload = await getPayload({ config });

  try {
    const user = await payload.findByID({
      collection: 'users',
      id: userId,
      depth: 1,
    });

    return user?.followers || [];
  } catch (error) {
    console.error('Error fetching followers:', error);
    throw error;
  }
}

export async function likePost(postId: string, liked: boolean, currentUserId: string) {
  const payload = await getPayload({ config })

  try {
    // 1. Read user & post documents (raw ID arrays)
    const userDoc = await payload.findByID({
      collection: "users",
      id: currentUserId,
      depth: 0,
    })
    const postDoc = await payload.findByID({
      collection: "posts",
      id: postId,
      depth: 0,
    })

    if (!userDoc || !postDoc) {
      throw new Error("User or Post not found")
    }

    // 2. Handle liking or unliking
    let updatedLikedPosts
    let updatedLikes

    if (liked) {
      // Add IDs when liking
      updatedLikedPosts = Array.from(new Set([...(userDoc.likedPosts || []), postId]))
      updatedLikes = Array.from(new Set([...(postDoc.likes || []), currentUserId]))
    } else {
      // Remove IDs when unliking
      updatedLikedPosts = (userDoc.likedPosts || []).filter((id: string) => id !== postId)
      updatedLikes = (postDoc.likes || []).filter((id: string) => id !== currentUserId)
    }

    // 3. Update both sides of the relationship
    const updatedUser = await payload.update({
      collection: "users",
      id: currentUserId,
      depth: 1,
      data: { likedPosts: updatedLikedPosts },
    })
    const updatedPost = await payload.update({
      collection: "posts",
      id: postId,
      depth: 1,
      data: { likes: updatedLikes },
    })

    return { updatedUser, updatedPost }
  } catch (err) {
    console.error("Error liking post:", err)
    throw err
  }
}

export async function isLiked(postId: string, currentUserId: string): Promise<boolean> {
  const payload = await getPayload({ config });

  // 2. Fetch the user document (depth: 0 returns raw ID arrays)  [oai_citation:0‡Payload](https://payloadcms.com/docs/queries/overview?utm_source=chatgpt.com)
  const userDoc = await payload.findByID({
    collection: 'users',
    id: currentUserId,
    depth: 0,
  });

  if (!userDoc) {
    throw new Error(`User ${currentUserId} not found`);
  }

  // 3. Check if `likedPosts` contains the target postId  [oai_citation:1‡Payload](https://payloadcms.com/docs/fields/relationship?utm_source=chatgpt.com)
  return Array.isArray(userDoc.likedPosts) && userDoc.likedPosts.includes(postId);

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


export async function sharePost(postId: string, currentUserId: string): Promise<void> {
  console.log(`Sharing post with ID: ${postId}`)

  if (!postId) {
    console.error("sharePost called with empty postId")
    throw new Error("Post ID is required")
  }

  try {
    // In a real implementation, you would use Payload CMS to:
    // 1. Increment a share counter on the post
    // 2. Possibly log the share activity
    const payload = await getPayload({ config })

    // Update the post to increment share count
    await payload.update({
      collection: "posts",
      id: postId,
      data: {
        // Use the Payload increment operator to add 1 to the shareCount
        shareCount: {
          increment: 1,
        },
      },
    })

    // Optionally log the share activity
    await payload.create({
      collection: "activities",
      data: {
        type: "share",
        post: postId,
        user: currentUserId, // Pass the current user ID explicitly
        createdAt: new Date().toISOString(),
      },
    })

    console.log(`Successfully shared post ${postId}`)

    // Revalidate paths that might show share count
    revalidatePath("/feed")
    revalidatePath(`/post/${postId}`)
    revalidatePath("/profile/[id]")
  } catch (error) {
    console.error("Error recording post share:", error)
    // We don't throw here to prevent blocking the user's share action
    // The share might succeed even if our recording of it fails
  }
}




export async function getPersonalizedFeed(currentUserId: string, pageSize = 20, offset = 0) {
  console.log(`Getting personalized feed for user ${currentUserId}, pageSize: ${pageSize}, offset: ${offset}`)

  try {
    const payload = await getPayload({ config })

    // 1. Load user & followees
    const user = await payload.findByID({ collection: "users", id: currentUserId, depth: 0 })
    if (!user) {
      console.error("User not found:", currentUserId)
     
    }

    console.log(`User found: ${user.id}, following: ${user.following?.length || 0} users`)
    const followees = user.following || []

    // If user doesn't follow anyone, return mock data
    if (followees.length === 0) {
      console.log("User doesn't follow anyone, returning mock data")
      
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
    const feed = scored
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(offset, offset + pageSize)
      .map((item) => {
        // Convert Payload post to our frontend Post type
        const post = item.post
        return {
          id: String(post.id),
          author: {
            id: post.author.id,
            name: post.author.name,
            avatar: post.author.avatar?.url,
          },
          title: post.title,
          content: post.content,
          createdAt: post.createdAt,
          image: post.image?.url,
          likeCount: post.likes?.length || 0,
          commentCount: post.comments?.length || 0,
          isLiked: post.likes?.includes(currentUserId) || false,
          type: post.type || "post",
          rating: post.rating,
          location: post.location
            ? {
                id: post.location.id,
                name: post.location.name,
              }
            : undefined,
        }
      })

    console.log(`Returning ${feed.length} personalized posts`)
    return feed
  } catch (error) {
    console.error('Error fetching personalized feed:', error)
  }
}

// Haversine formula to calculate distance between two points on Earth

export async function getFeedPosts(feedType: string, sortBy: string, page: number): Promise<Post[]> {
  console.log(`Getting feed posts: type=${feedType}, sort=${sortBy}, page=${page}`)

  try {
    const payload = await getPayload({ config })
    const pageSize = 10
    const skip = (page - 1) * pageSize

    // Build query based on feed type and sort options
    const query: any = {
      status: { equals: "published" },
    }

    // If we're in a specific feed type (e.g., "locations", "reviews")
    if (feedType !== "all" && feedType !== "user") {
      query.type = { equals: feedType }
    }

    // Determine sort options
    let sort: string
    switch (sortBy) {
      case "popular":
        sort = "-likeCount" // Sort by most likes
        break
      case "trending":
        // For trending, we want recent posts with high engagement
        // This is a simplified approach - in production you might use a more complex algorithm
        sort = "-_updatedAt" // Sort by recently updated
        break
      case "recent":
      default:
        sort = "-createdAt" // Sort by newest first
        break
    }

    // Fetch posts from Payload CMS
    const { docs: posts, totalDocs } = await payload.find({
      collection: "posts",
      where: query,
      sort,
      limit: pageSize,
      page: page,
      depth: 1, // Load author and other relations
    })

    console.log(`Found ${posts.length} posts out of ${totalDocs} total`)

    // Format posts for the frontend
    const formattedPosts = posts.map((post) => ({
      id: String(post.id),
      author: {
        id: typeof post.author === "object" ? post.author.id : post.author,
        name: typeof post.author === "object" ? post.author.name : "Unknown User",
        avatar: typeof post.author === "object" && post.author.profileImage ? post.author.profileImage.url : undefined,
      },
      title: post.title || "",
      content: post.content || "",
      createdAt: post.createdAt || new Date().toISOString(),
      image: post.image?.url || post.featuredImage?.url || undefined,
      likeCount: post.likes?.length || 0,
      commentCount: post.comments?.length || 0,
      shareCount: post.shares || 0,
      isLiked: false, // This will be updated client-side
      type: post.type || "post",
      rating: post.rating,
      location: post.location
        ? {
            id: typeof post.location === "object" ? post.location.id : post.location,
            name: typeof post.location === "object" ? post.location.name : "Unknown Location",
            address: typeof post.location === "object" ? post.location.address : undefined,
          }
        : undefined,
    }))

    return formattedPosts
  } catch (error) {
    console.error("Error fetching feed posts:", error)
    return []; // Return an empty array in case of an error
  }
}

export async function getPostById(postId: string): Promise<Post | null> {
  console.log(`Getting post by ID: ${postId}`);

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

    // Format post for the frontend
    const formattedPost: Post = {
      id: String(post.id),
      author: {
        id: typeof post.author === "object" ? post.author.id : post.author,
        name: typeof post.author === "object" ? post.author.name : "Unknown User",
        avatar: typeof post.author === "object" && post.author.profileImage ? post.author.profileImage.url : undefined,
      },
      title: post.title || "",
      content: post.content || "",
      createdAt: post.createdAt || new Date().toISOString(),
      image: post.image?.url || post.featuredImage?.url || undefined,
      likeCount: post.likes?.length || 0,
      commentCount: post.comments?.length || 0,
      shareCount: post.shares || 0,
      isLiked: false, // This will be updated client-side
      type: post.type || "post",
      rating: post.rating,
      location: post.location
        ? {
            id: typeof post.location === "object" ? post.location.id : post.location,
            name: typeof post.location === "object" ? post.location.name : "Unknown Location",
            address: typeof post.location === "object" ? post.location.address : undefined,
          }
        : undefined,
    };
    console.log(formattedPost.image)
    console.log(post.image?.url)

    return formattedPost;
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
      },
    })

    return newComment
  } catch (error) {
    console.error("Error adding comment:", error)

    // For development/demo, return a mock comment
    return {
      id: `comment-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      content,
      createdAt: new Date().toISOString(),
    }
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
    const comments = post.comments || []
    const commentIndex = comments.findIndex((c: any) => c.id === commentId)

    if (commentIndex === -1) {
      throw new Error(`Comment with ID ${commentId} not found in post ${post.id}`)
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
    await payload.update({
      collection: "posts",
      id: post.id,
      data: {
        comments: updatedComments,
      },
    })

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
      depth: 1, // Load related entities
    })

    return notifications.map((notification) => ({
      id: String(notification.id), // Ensure id is a string
      recipient: notification.recipient,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      relatedTo: notification.relatedTo
        ? {
            id: typeof notification.relatedTo === "object" ? notification.relatedTo.id : notification.relatedTo,
            collection: notification.relatedTo.relationTo,
          }
        : undefined,
      read: notification.read,
      createdAt: notification.createdAt,
    }))
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
    const payload = await getPayload({ config })

    // Get current user
    const user = await payload.findByID({
      collection: "users",
      id: formData.get("userId") as string, // Ensure `userId` is passed in `formData`
      depth: 0,
    });

    if (!user) {
      return {
        success: false,
        message: "User not found",
      };
    }

    if (!user) {
      return {
        success: false,
        message: "You must be logged in to create a post",
      }
    }

    // Extract form data
    const content = formData.get("content") as string
    const title = formData.get("title") as string
    const type = formData.get("type") as "post" | "review" | "recommendation"
    const locationName = formData.get("locationName") as string
    const rating = formData.get("rating") ? Number.parseInt(formData.get("rating") as string) : undefined
    const image = formData.get("image") as File | null

    // Validate required fields
    if (!content) {
      return {
        success: false,
        message: "Post content is required",
      }
    }

    // Handle location if provided
    let locationId = null
    if (locationName && (type === "review" || type === "recommendation")) {
      // Check if location exists
      const { docs: existingLocations } = await payload.find({
        collection: "locations",
        where: {
          name: { equals: locationName },
        },
        limit: 1,
      })

      if (existingLocations.length > 0) {
        locationId = existingLocations[0].id
      } else {
        // Create new location
        const newLocation = await payload.create({
          collection: "locations",
          data: {
            name: locationName,
            createdBy: user.id,
            isVerified: false,
          },
        })
        locationId = newLocation.id
      }
    }

    // Handle image upload if provided
    let imageId = null
    if (image && image.size > 0) {
      try {
        // Convert the File to a Buffer that Payload can process
        const uploadedImage = await payload.create({
          collection: "media",
          data: {
            alt: title || `Post image by ${user.name || 'user'}`,
          },
          file: {
            data: Buffer.from(await image.arrayBuffer()),
            mimetype: image.type,
            name: "",
            size: 0
          },
        })

        imageId = uploadedImage.id
        console.log("Image uploaded successfully:", imageId)
      } catch (uploadError) {
        console.error("Error uploading image:", uploadError)
        // Continue with post creation even if image upload fails
      }
    }

    // Create post
    const postData: any = {
      content,
      author: user.id,
      type,
      status: "published",
    }

    if (title) postData.title = title
    if (locationId) postData.location = locationId
    if (rating && type === "review") postData.rating = rating
    if (imageId) postData.image = imageId

    const post = await payload.create({
      collection: "posts",
      data: postData,
    })

    // Revalidate paths
    revalidatePath("/feed")
    revalidatePath(`/profile/${user.id}`)

    return {
      success: true,
      postId: post.id,
    }
  } catch (error) {
    console.error("Error creating post:", error)
    return {
      success: false,
      message: "Failed to create post. Please try again.",
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
  participants.sort((a, b) => b.weight - a.weight);

  // 4. Determine number of groups needed
  const groupCount = Math.ceil(participants.length / maxPlayers);
  const groups: string[][] = Array.from({ length: groupCount }, () => []);

  // 5. Assign in serpentine (snake draft) order
  let idx = 0;
  let forward = true;
  for (const p of participants) {
    groups[idx].push(String(p.id));
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