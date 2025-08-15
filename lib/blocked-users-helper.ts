import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * Get all blocked user IDs for a given user
 */
export async function getBlockedUserIds(userId: string): Promise<string[]> {
  try {
    const payload = await getPayload({ config })
    
    console.log('🔍 [Blocked Users Helper] Getting blocked users for user:', userId)
    
    const blockedUsersResult = await payload.find({
      collection: 'userBlocks',
      where: {
        blocker: { equals: userId }
      },
      limit: 1000, // Get all blocked users
      depth: 0
    })
    
    console.log('🔍 [Blocked Users Helper] Found blocked users:', blockedUsersResult.docs.length)
    console.log('🔍 [Blocked Users Helper] Raw blocked users:', blockedUsersResult.docs.map(block => ({
      id: block.id,
      blocker: block.blocker,
      blockedUser: block.blockedUser,
      blockedUserType: typeof block.blockedUser
    })))
    
    const blockedUserIds = blockedUsersResult.docs.map((block: any) => {
      if (typeof block.blockedUser === 'string') {
        return block.blockedUser
      } else if (block.blockedUser && typeof block.blockedUser === 'object') {
        return block.blockedUser.id || block.blockedUser._id
      }
      return null
    }).filter(Boolean)
    
    console.log('🔍 [Blocked Users Helper] Extracted blocked user IDs:', blockedUserIds)
    return blockedUserIds
  } catch (error) {
    console.error('Error getting blocked user IDs:', error)
    return []
  }
}

/**
 * Get all users who have blocked the given user
 */
export async function getUsersWhoBlockedMe(userId: string): Promise<string[]> {
  try {
    const payload = await getPayload({ config })
    
    console.log('🔍 [Blocked Users Helper] Getting users who blocked me:', userId)
    
    const blockedByResult = await payload.find({
      collection: 'userBlocks',
      where: {
        blockedUser: { equals: userId }
      },
      limit: 1000,
      depth: 0
    })
    
    console.log('🔍 [Blocked Users Helper] Found users who blocked me:', blockedByResult.docs.length)
    
    const blockerIds = blockedByResult.docs.map((block: any) => {
      if (typeof block.blocker === 'string') {
        return block.blocker
      } else if (block.blocker && typeof block.blocker === 'object') {
        return block.blocker.id || block.blocker._id
      }
      return null
    }).filter(Boolean)
    
    console.log('🔍 [Blocked Users Helper] Extracted blocker IDs:', blockerIds)
    return blockerIds
  } catch (error) {
    console.error('Error getting users who blocked me:', error)
    return []
  }
}

/**
 * Check if a user is blocked by another user
 */
export async function isUserBlocked(blockerId: string, blockedUserId: string): Promise<boolean> {
  try {
    const payload = await getPayload({ config })
    
    console.log('🔍 [Blocked Users Helper] Checking if user is blocked:', { blockerId, blockedUserId })
    
    const blockResult = await payload.find({
      collection: 'userBlocks',
      where: {
        and: [
          { blocker: { equals: blockerId } },
          { blockedUser: { equals: blockedUserId } }
        ]
      },
      limit: 1,
      depth: 0
    })
    
    const isBlocked = blockResult.docs.length > 0
    console.log('🔍 [Blocked Users Helper] Is user blocked:', isBlocked)
    return isBlocked
  } catch (error) {
    console.error('Error checking if user is blocked:', error)
    return false
  }
}
