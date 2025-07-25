"use server"

import { getPayload } from "payload"
import config from "@/payload.config"
import { revalidatePath } from "next/cache"

export interface ProfileUpdateData {
  name?: string
  username?: string
  bio?: string
  location?: {
    city?: string
    state?: string
    country?: string
  }
  interests?: string[]
  socialLinks?: {
    platform: "instagram" | "twitter" | "tiktok" | "youtube" | "website"
    url: string
  }[]
  profileImage?: string | null // ID of the uploaded media
}

/**
 * Checks if a user can change their username (7-day cooldown)
 * @param userId - The ID of the user
 * @returns Object with canChange boolean and nextChangeDate if applicable
 */
export async function checkUsernameChangeCooldown(userId: string) {
  if (!userId) {
    throw new Error("User ID is required")
  }

  try {
    const payload = await getPayload({ config })

    const user = await payload.findByID({
      collection: "users",
      id: userId,
    })

    if (!user) {
      throw new Error("User not found")
    }

    // If user has never changed username, they can change it
    if (!user.lastUsernameChange) {
      return {
        canChange: true,
        nextChangeDate: null,
        daysRemaining: 0
      }
    }

    const lastChange = new Date(user.lastUsernameChange)
    const now = new Date()
    const daysSinceLastChange = Math.floor((now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24))
    const daysRemaining = Math.max(0, 7 - daysSinceLastChange)
    
    const nextChangeDate = new Date(lastChange)
    nextChangeDate.setDate(nextChangeDate.getDate() + 7)

    return {
      canChange: daysSinceLastChange >= 7,
      nextChangeDate: daysRemaining > 0 ? nextChangeDate : null,
      daysRemaining,
      lastChangeDate: lastChange
    }
  } catch (error) {
    console.error("Error checking username change cooldown:", error)
    throw error
  }
}

/**
 * Generates a username from a user's name
 * @param name - The user's name
 * @returns A valid username
 */
function generateUsernameFromName(name: string): string {
  // Clean the name: remove spaces, convert to lowercase, keep only letters and numbers
  const cleanName = name.toLowerCase()
    .replace(/\s+/g, '') // Remove spaces
    .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric characters
    .substring(0, 20) // Limit base length
  
  const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  
  // Create username
  let username = cleanName + suffix
  
  // Ensure minimum length
  if (username.length < 3) {
    username = 'user' + suffix
  }
  
  // Ensure maximum length
  if (username.length > 30) {
    username = cleanName.substring(0, 26) + suffix
  }
  
  // Final validation - ensure it only contains allowed characters
  username = username.replace(/[^a-z0-9_-]/g, '')
  
  // If somehow it becomes empty or too short, provide fallback
  if (username.length < 3) {
    username = 'user' + Date.now().toString().slice(-6)
  }
  
  return username
}

/**
 * Updates a user's profile in Payload CMS
 * @param userId - The ID of the user to update
 * @param data - The profile data to update
 * @returns The updated user object
 */
export async function updateUserProfile(userId: string, data: ProfileUpdateData) {
  if (!userId) {
    throw new Error("User ID is required")
  }

  try {
    const payload = await getPayload({ config })

    // Prepare the update data
    const updateData: Record<string, any> = {}

    // Only include fields that are provided and not empty (unless explicitly clearing)
    if (data.name !== undefined) updateData.name = data.name
    if (data.bio !== undefined) updateData.bio = data.bio

    // Handle username with validation and cooldown check - only if explicitly provided
    if (data.username !== undefined) {
      const username = data.username.trim().toLowerCase()
      
      // Get current user to check existing username
      const currentUser = await payload.findByID({
        collection: "users",
        id: userId,
      })

      // Only process username change if it's actually different
      if (currentUser.username !== username) {
        // If username is provided and not empty, validate it
        if (username) {
          // Only check cooldown if username is actually being changed
          if (currentUser.username) {
            const cooldownCheck = await checkUsernameChangeCooldown(userId)
            
            if (!cooldownCheck.canChange) {
              throw new Error(`You can change your username again in ${cooldownCheck.daysRemaining} day(s). Next change available: ${cooldownCheck.nextChangeDate?.toLocaleDateString()}`)
            }
          }

          // Validate username format
          if (!/^[a-z0-9_-]+$/.test(username)) {
            throw new Error("Username can only contain lowercase letters, numbers, hyphens, and underscores")
          }
          if (username.length < 3) {
            throw new Error("Username must be at least 3 characters long")
          }
          if (username.length > 30) {
            throw new Error("Username must be less than 30 characters")
          }
          
          // Check if username is already taken (if it's being changed)
          const existingUser = await payload.find({
            collection: "users",
            where: {
              and: [
                { username: { equals: username } },
                { id: { not_equals: userId } }
              ]
            },
            limit: 1
          })
          
          if (existingUser.docs.length > 0) {
            throw new Error("Username is already taken")
          }
          
          updateData.username = username
          
          // Update the lastUsernameChange timestamp
          updateData.lastUsernameChange = new Date().toISOString()
        } else {
          // User is clearing their username
          updateData.username = ''
        }
      }
      // If username is the same, don't include it in the update
    }

    // Handle location as a group field - only include non-empty values
    if (data.location) {
      const locationData: any = {}
      if (data.location.city !== undefined) locationData.city = data.location.city || null
      if (data.location.state !== undefined) locationData.state = data.location.state || null
      if (data.location.country !== undefined) locationData.country = data.location.country || null
      
      // Only include location if there are actual values
      if (Object.keys(locationData).length > 0) {
        updateData.location = locationData
      }
    }

    // Handle interests as an array field
    if (data.interests) {
      updateData.interests = (data.interests as (string | { interest: string })[]).map((interest) => 
        typeof interest === 'string' ? interest : interest.interest
      ).filter(interest => interest.trim() !== '')
    }

    // Handle social links as an array field
    if (data.socialLinks) {
      updateData.socialLinks = data.socialLinks.map((link) => ({
        platform: link.platform,
        url: link.url,
      }))
    }

    // Handle profile image as a relationship field
    if (data.profileImage !== undefined) {
      updateData.profileImage = data.profileImage
    }

    console.log('Update data being sent to Payload:', updateData)

    // Update the user in Payload CMS
    const updatedUser = await payload.update({
      collection: "users",
      id: userId,
      data: updateData,
    })

    // Revalidate the profile page to reflect changes
    revalidatePath(`/profile/${userId}`)
    revalidatePath(`/profile/me`)

    return {
      success: true,
      user: updatedUser,
    }
  } catch (error) {
    console.error("Error updating user profile:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update profile",
    }
  }
}

/**
 * Updates a user's creator status and level
 * @param userId - The ID of the user to update
 * @param isCreator - Whether the user is a creator
 * @param creatorLevel - The creator level (explorer, hunter, authority, expert)
 * @returns The updated user object
 */
export async function updateCreatorStatus(
  userId: string,
  isCreator: boolean,
  creatorLevel?: "explorer" | "hunter" | "authority" | "expert",
) {
  if (!userId) {
    throw new Error("User ID is required")
  }

  try {
    const payload = await getPayload({ config })

    const updateData: Record<string, any> = {
      isCreator,
    }

    // Only include creator level if user is a creator and level is provided
    if (isCreator && creatorLevel) {
      updateData.creatorLevel = creatorLevel
    }

    // Update the user in Payload CMS
    const updatedUser = await payload.update({
      collection: "users",
      id: userId,
      data: updateData,
    })

    // Revalidate the profile page to reflect changes
    revalidatePath(`/profile/${userId}`)
    revalidatePath(`/profile/me`)

    return {
      success: true,
      user: updatedUser,
    }
  } catch (error) {
    console.error("Error updating creator status:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update creator status",
    }
  }
}

/**
 * Updates a user's profile image
 * @param userId - The ID of the user to update
 * @param mediaId - The ID of the uploaded media to use as profile image
 * @returns The updated user object
 */
export async function updateProfileImage(userId: string, mediaId: string | null) {
  if (!userId) {
    throw new Error("User ID is required")
  }

  try {
    const payload = await getPayload({ config })

    // Update the user in Payload CMS
    const updatedUser = await payload.update({
      collection: "users",
      id: userId,
      data: {
        profileImage: mediaId,
      },
    })

    // Revalidate the profile page to reflect changes
    revalidatePath(`/profile/${userId}`)
    revalidatePath(`/profile/me`)

    return {
      success: true,
      user: updatedUser,
    }
  } catch (error) {
    console.error("Error updating profile image:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update profile image",
    }
  }
}

/**
 * Generates and sets a username for a user who doesn't have one
 * @param userId - The ID of the user
 * @returns The updated user object with the new username
 */
export async function generateAndSetUsername(userId: string) {
  if (!userId) {
    throw new Error("User ID is required")
  }

  try {
    const payload = await getPayload({ config })

    // Get the current user
    const user = await payload.findByID({
      collection: "users",
      id: userId,
    })

    if (!user) {
      throw new Error("User not found")
    }

    // If user already has a username, don't generate a new one
    if (user.username) {
      return {
        success: true,
        user,
        message: "User already has a username"
      }
    }

    // Generate a username based on the user's name
    let attempts = 0
    let username = ""
    let isUnique = false

    while (!isUnique && attempts < 10) {
      username = generateUsernameFromName(user.name)
      
      // Check if this username is already taken
      const existingUser = await payload.find({
        collection: "users",
        where: {
          username: { equals: username }
        },
        limit: 1
      })

      if (existingUser.docs.length === 0) {
        isUnique = true
      } else {
        attempts++
      }
    }

    if (!isUnique) {
      throw new Error("Unable to generate unique username after multiple attempts")
    }

    // Update the user with the new username
    const updatedUser = await payload.update({
      collection: "users",
      id: userId,
      data: { username },
    })

    // Revalidate the profile page
    revalidatePath(`/profile/${userId}`)
    revalidatePath(`/profile/me`)

    return {
      success: true,
      user: updatedUser,
      username,
      message: `Generated username: ${username}`
    }
  } catch (error) {
    console.error("Error generating username:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate username",
    }
  }
}


export async function getCategories(){
  const payload = await getPayload({ config })

  const categories = await payload.find({
    collection: "categories",
    limit: 100,
  })

  console.log(categories.docs)

  return categories.docs
}

