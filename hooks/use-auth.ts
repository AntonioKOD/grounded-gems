/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useAppSelector, useAppDispatch } from '@/lib/hooks'
import { fetchUser, logoutUser as logoutUserAction, setUser, updateUser } from '@/lib/features/user/userSlice'
import { clearPostInteractions } from '@/lib/features/posts/postsSlice'
import { clearFeed } from '@/lib/features/feed/feedSlice'
import type { UserData } from '@/lib/features/user/userSlice'
import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { prefetchUserRoutes, prefetchApiData } from '@/lib/prefetch-utils'

export function useAuth() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { user, isLoading, isAuthenticated, error } = useAppSelector((state) => state.user)

  // Prefetch user data on mount for faster authentication checks
  useEffect(() => {
    if (!user && !isLoading) {
      dispatch(fetchUser())
    }
  }, [dispatch, user, isLoading])

  // Prefetch user-specific routes when authenticated
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      prefetchUserRoutes(router, user.id)
      prefetchApiData()
    }
  }, [isAuthenticated, user?.id, router])

  const refetchUser = useCallback(async () => {
    await dispatch(fetchUser({ force: true }))
  }, [dispatch])

  const logout = useCallback(async () => {
    try {
      await dispatch(logoutUserAction()).unwrap()
      // Clear all related state
      dispatch(clearPostInteractions())
      dispatch(clearFeed())
      
      // Dispatch logout event for other components
      window.dispatchEvent(new Event('logout-success'))
    } catch (error) {
      console.error('Logout failed:', error)
      throw error
    }
  }, [dispatch])

  const preloadUser = useCallback((userData: UserData) => {
    dispatch(setUser(userData))
  }, [dispatch])

  const updateUserData = useCallback((userData: Partial<UserData>) => {
    dispatch(updateUser(userData))
  }, [dispatch])

  return {
    user,
    isLoading,
    isAuthenticated,
    error,
    refetchUser,
    logout,
    preloadUser,
    updateUser: updateUserData,
  }
}
