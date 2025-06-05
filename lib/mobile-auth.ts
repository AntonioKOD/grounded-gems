import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'

const AUTH_TOKEN_KEY = 'auth_token'
const USER_DATA_KEY = 'user_data'
const REMEMBER_ME_KEY = 'remember_me'

export interface StoredUserData {
  id: string
  email: string
  name?: string
  avatar?: string
  profileImage?: {
    url: string
    alt?: string
  }
  location?: {
    coordinates?: {
      latitude: number
      longitude: number
    }
  }
  role?: string
}

/**
 * Mobile-specific authentication service using Capacitor Preferences
 * Provides persistent user state across app sessions
 */
export class MobileAuthService {
  /**
   * Save authentication token securely
   */
  static async saveAuthToken(token: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) return
    
    try {
      await Preferences.set({
        key: AUTH_TOKEN_KEY,
        value: token
      })
      console.log('Auth token saved successfully')
    } catch (error) {
      console.error('Failed to save auth token:', error)
    }
  }

  /**
   * Retrieve authentication token
   */
  static async getAuthToken(): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) return null
    
    try {
      const result = await Preferences.get({ key: AUTH_TOKEN_KEY })
      return result.value
    } catch (error) {
      console.error('Failed to get auth token:', error)
      return null
    }
  }

  /**
   * Save user data locally
   */
  static async saveUserData(userData: StoredUserData): Promise<void> {
    if (!Capacitor.isNativePlatform()) return
    
    try {
      await Preferences.set({
        key: USER_DATA_KEY,
        value: JSON.stringify(userData)
      })
      console.log('User data saved successfully')
    } catch (error) {
      console.error('Failed to save user data:', error)
    }
  }

  /**
   * Retrieve stored user data
   */
  static async getUserData(): Promise<StoredUserData | null> {
    if (!Capacitor.isNativePlatform()) return null
    
    try {
      const result = await Preferences.get({ key: USER_DATA_KEY })
      if (result.value) {
        return JSON.parse(result.value) as StoredUserData
      }
      return null
    } catch (error) {
      console.error('Failed to get user data:', error)
      return null
    }
  }

  /**
   * Save remember me preference
   */
  static async saveRememberMe(remember: boolean): Promise<void> {
    if (!Capacitor.isNativePlatform()) return
    
    try {
      await Preferences.set({
        key: REMEMBER_ME_KEY,
        value: remember.toString()
      })
    } catch (error) {
      console.error('Failed to save remember me preference:', error)
    }
  }

  /**
   * Get remember me preference
   */
  static async getRememberMe(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false
    
    try {
      const result = await Preferences.get({ key: REMEMBER_ME_KEY })
      return result.value === 'true'
    } catch (error) {
      console.error('Failed to get remember me preference:', error)
      return false
    }
  }

  /**
   * Check if user should be automatically logged in
   */
  static async shouldAutoLogin(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false
    
    try {
      const [token, rememberMe] = await Promise.all([
        this.getAuthToken(),
        this.getRememberMe()
      ])
      
      return !!(token && rememberMe)
    } catch (error) {
      console.error('Failed to check auto login:', error)
      return false
    }
  }

  /**
   * Restore user session from stored data
   */
  static async restoreUserSession(): Promise<{
    token: string | null
    userData: StoredUserData | null
    shouldAutoLogin: boolean
  }> {
    if (!Capacitor.isNativePlatform()) {
      return { token: null, userData: null, shouldAutoLogin: false }
    }
    
    try {
      const [token, userData, shouldAutoLogin] = await Promise.all([
        this.getAuthToken(),
        this.getUserData(),
        this.shouldAutoLogin()
      ])
      
      return { token, userData, shouldAutoLogin }
    } catch (error) {
      console.error('Failed to restore user session:', error)
      return { token: null, userData: null, shouldAutoLogin: false }
    }
  }

  /**
   * Clear all stored authentication data
   */
  static async clearAuthData(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return
    
    try {
      await Promise.all([
        Preferences.remove({ key: AUTH_TOKEN_KEY }),
        Preferences.remove({ key: USER_DATA_KEY }),
        Preferences.remove({ key: REMEMBER_ME_KEY })
      ])
      console.log('Auth data cleared successfully')
    } catch (error) {
      console.error('Failed to clear auth data:', error)
    }
  }

  /**
   * Update stored user data
   */
  static async updateUserData(updates: Partial<StoredUserData>): Promise<void> {
    if (!Capacitor.isNativePlatform()) return
    
    try {
      const currentData = await this.getUserData()
      if (currentData) {
        const updatedData = { ...currentData, ...updates }
        await this.saveUserData(updatedData)
        console.log('User data updated successfully')
      }
    } catch (error) {
      console.error('Failed to update user data:', error)
    }
  }

  /**
   * Check if user is authenticated based on stored data
   */
  static async isAuthenticated(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false
    
    try {
      const token = await this.getAuthToken()
      return !!token
    } catch (error) {
      console.error('Failed to check authentication:', error)
      return false
    }
  }
} 