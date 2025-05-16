/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

import { getPayload } from "payload"
import config from "@/payload.config"
import { revalidatePath } from "next/cache"

export interface ProfileUpdateData {
  name?: string
  bio?: string
  location?: {
    city?: string
    state?: string
    country?: string
  }
  interests?: { interest: string }[]
  socialLinks?: {
    platform: "instagram" | "twitter" | "tiktok" | "youtube" | "website"
    url: string
  }[]
  profileImage?: string | null // ID of the uploaded media
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

    // Only include fields that are provided
    if (data.name !== undefined) updateData.name = data.name
    if (data.bio !== undefined) updateData.bio = data.bio

    // Handle location as a group field
    if (data.location) {
      updateData.location = {
        ...(data.location.city !== undefined && { city: data.location.city }),
        ...(data.location.state !== undefined && { state: data.location.state }),
        ...(data.location.country !== undefined && { country: data.location.country }),
      }
    }

    // Handle interests as an array field
    if (data.interests) {
      updateData.interests = data.interests.map((interest) => ({
        interest: interest.interest,
      }))
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
