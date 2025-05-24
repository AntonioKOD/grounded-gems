"use client"

import { useEffect, useState } from 'react'

// Define the anime function type
type AnimeFunction = (params: any) => any

interface UseAnimeReturn {
  anime: AnimeFunction | null
  loading: boolean
  error: string | null
}

// Create a simple mock anime function that provides the basic API
const createMockAnime = (): AnimeFunction => {
  const mockAnime = (params: any) => {
    console.log('Using mock anime with params:', params)
    
    // Return a mock animation object
    return {
      pause: () => console.log('Mock anime: pause called'),
      restart: () => console.log('Mock anime: restart called'),
      reverse: () => console.log('Mock anime: reverse called'),
      play: () => console.log('Mock anime: play called'),
      seek: () => console.log('Mock anime: seek called'),
    }
  }
  
  // Add stagger method to mock
  mockAnime.stagger = (value: number, options?: any) => {
    console.log('Mock anime stagger called:', value, options)
    return 0
  }
  
  return mockAnime
}

// Simple anime.js loader hook
export function useAnime(): UseAnimeReturn {
  const [anime, setAnime] = useState<AnimeFunction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    
    const loadAnime = async () => {
      try {
        console.log('🚀 Attempting to load anime.js...')
        
        // Try to import anime.js  
        const animeModule = await import('animejs')
        console.log('📦 Anime module imported:', animeModule)
        
        // According to anime.js docs, it should be a direct import
        const animeFunction = animeModule as any
        
        if (animeFunction && typeof animeFunction === 'function' && isMounted) {
          setAnime(animeFunction)
          setLoading(false)
          console.log('✅ Anime loaded successfully!')
        } else {
          throw new Error('Could not find anime function in module')
        }
      } catch (err) {
        console.warn('⚠️ Failed to load anime.js, using mock:', err)
        if (isMounted) {
          // Use mock anime as fallback
          setAnime(createMockAnime())
          setError('Using mock animations - anime.js failed to load')
          setLoading(false)
          console.log('🎭 Using mock anime function')
        }
      }
    }

    loadAnime()

    return () => {
      isMounted = false
    }
  }, [])

  return { anime, loading, error }
}

// Extend the global Window interface to include anime
declare global {
  interface Window {
    anime?: any
  }
} 