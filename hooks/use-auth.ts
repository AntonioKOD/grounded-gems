/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useAppSelector, useAppDispatch } from '@/lib/hooks'
import { fetchUser, logoutUser as logoutUserAction, setUser, updateUser } from '@/lib/features/user/userSlice'
import { clearPostInteractions } from '@/lib/features/posts/postsSlice'
import { clearFeed } from '@/lib/features/feed/feedSlice'
import type { UserData } from '@/lib/features/user/userSlice'

export function useAuth() {
  const dispatch = useAppDispatch()
  const { user, isLoading, isAuthenticated, error } = useAppSelector((state) => state.user)

  const refetchUser = async () => {
    await dispatch(fetchUser({ force: true }))
  }

  const logout = async () => {
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
  }

  const preloadUser = (userData: UserData) => {
    dispatch(setUser(userData))
  }

  const updateUserData = (userData: Partial<UserData>) => {
    dispatch(updateUser(userData))
  }

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
