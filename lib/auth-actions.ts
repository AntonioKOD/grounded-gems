'use server'

import { clearUserCache } from './auth-server'

// Server action for logout that clears cache
export async function logoutUserAction() {
  try {
    // Clear the server-side cache
    clearUserCache()
    
    // You can add additional logout logic here if needed
    // For example, invalidating sessions, etc.
    
    return { success: true }
  } catch (error) {
    console.error('Error during logout:', error)
    return { success: false }
  }
} 