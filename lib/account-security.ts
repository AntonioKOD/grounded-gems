"use server"

import { SECURITY_CONFIG } from './security-config'
import { getPayload } from 'payload'
import config from '@payload-config'

interface AccountLockInfo {
  isLocked: boolean
  remainingTime?: number // in milliseconds
  nextLockDuration?: number // in milliseconds
  attemptsRemaining?: number
}

export async function checkAccountLock(userId: string): Promise<AccountLockInfo> {
  const payload = await getPayload({ config })
  
  try {
    const user = await payload.findByID({
      collection: 'users',
      id: userId
    })

    if (!user) {
      throw new Error('User not found')
    }

    const now = new Date()
    
    // If accountLockedUntil is set and still in future, account is locked
    if (user.accountLockedUntil && new Date(user.accountLockedUntil) > now) {
      const remainingTime = new Date(user.accountLockedUntil).getTime() - now.getTime()
      return {
        isLocked: true,
        remainingTime,
        attemptsRemaining: 0
      }
    }

    // If last failed attempt was long ago, reset counter
    if (user.lastFailedLogin && 
        (now.getTime() - new Date(user.lastFailedLogin).getTime() > SECURITY_CONFIG.AUTH.LOCKOUT_RESET_AFTER)) {
      await payload.update({
        collection: 'users',
        id: userId,
        data: {
          loginAttempts: 0,
          accountLockedUntil: null
        }
      })
      return {
        isLocked: false,
        attemptsRemaining: SECURITY_CONFIG.AUTH.MAX_LOGIN_ATTEMPTS
      }
    }

    // Calculate next lock duration based on current attempts
    const nextLockDuration = user.loginAttempts >= SECURITY_CONFIG.AUTH.PROGRESSIVE_DELAYS.length 
      ? SECURITY_CONFIG.AUTH.LOCKOUT_DURATION
      : SECURITY_CONFIG.AUTH.PROGRESSIVE_DELAYS[user.loginAttempts]

    return {
      isLocked: false,
      attemptsRemaining: SECURITY_CONFIG.AUTH.MAX_LOGIN_ATTEMPTS - user.loginAttempts,
      nextLockDuration
    }
  } catch (error) {
    console.error('Error checking account lock:', error)
    // Default to locked state if error occurs
    return { isLocked: true }
  }
}

export async function handleFailedLogin(userId: string): Promise<AccountLockInfo> {
  const payload = await getPayload({ config })
  
  try {
    const user = await payload.findByID({
      collection: 'users',
      id: userId
    })

    if (!user) {
      throw new Error('User not found')
    }

    const now = new Date()
    const attempts = (user.loginAttempts || 0) + 1
    
    // Determine lock duration based on number of attempts
    let lockDuration = 0
    if (attempts >= SECURITY_CONFIG.AUTH.MAX_LOGIN_ATTEMPTS) {
      lockDuration = SECURITY_CONFIG.AUTH.LOCKOUT_DURATION
    } else if (attempts > 1) {
      lockDuration = SECURITY_CONFIG.AUTH.PROGRESSIVE_DELAYS[attempts - 2] // -2 because array is 0-based and we want previous attempt's duration
    }

    const updateData: any = {
      loginAttempts: attempts,
      lastFailedLogin: now
    }

    if (lockDuration > 0) {
      updateData.accountLockedUntil = new Date(now.getTime() + lockDuration)
    }

    await payload.update({
      collection: 'users',
      id: userId,
      data: updateData
    })

    return {
      isLocked: lockDuration > 0,
      remainingTime: lockDuration,
      attemptsRemaining: SECURITY_CONFIG.AUTH.MAX_LOGIN_ATTEMPTS - attempts
    }
  } catch (error) {
    console.error('Error handling failed login:', error)
    return { isLocked: true }
  }
}

export async function resetLoginAttempts(userId: string): Promise<void> {
  const payload = await getPayload({ config })
  
  try {
    await payload.update({
      collection: 'users',
      id: userId,
      data: {
        loginAttempts: 0,
        lastFailedLogin: null,
        accountLockedUntil: null
      }
    })
  } catch (error) {
    console.error('Error resetting login attempts:', error)
    throw error
  }
} 