/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect } from "react"
import { MatchmakingCard } from "./matchmaking-card"
import { Button } from "@/components/ui/button"
import { Loader2 } from 'lucide-react'
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"

interface MatchmakingSession {
  id: string
  title: string
  description: string
  sportType: string
  skillLevel: string
  location: {
    id: string
    name: string
  }
  timeWindow: {
    start: string
    end: string
  }
  minPlayers: number
  maxPlayers: number
  participants: {
    id: string
    name: string
  }[]
  status: string
  organizer: {
    id: string
    name: string
  }
}

export function MatchmakingContainer() {
  const [sessions, setSessions] = useState<MatchmakingSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  
  const searchParams = useSearchParams()
  const query = searchParams.get("query") || ""
  const sportType = searchParams.get("sportType") || ""
  const skillLevel = searchParams.get("skillLevel") || ""
  const status = searchParams.get("status") || "open"
  
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true)
        // In a real app, this would be an API call to your backend
        // For now, we'll simulate a response
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Mock data based on filters
        const mockSessions: MatchmakingSession[] = Array(6).fill(0).map((_, i) => ({
          id: `session-${page}-${i}`,
          title: `${sportType || "Sports"} Matchmaking Session ${page}-${i + 1}`,
          description: "Join this session to find partners for your favorite sport!",
          sportType: sportType || ["tennis", "soccer", "basketball"][i % 3],
          skillLevel: skillLevel || ["beginner", "intermediate", "advanced"][i % 3],
          location: {
            id: `loc-${i}`,
            name: `Sports Center ${i + 1}`
          },
          timeWindow: {
            start: new Date(Date.now() + 86400000 * (i + 1)).toISOString(),
            end: new Date(Date.now() + 86400000 * (i + 2)).toISOString()
          },
          minPlayers: 2,
          maxPlayers: 4,
          participants: Array(i % 3 + 1).fill(0).map((_, j) => ({
            id: `user-${j}`,
            name: `Player ${j + 1}`
          })),
          status: status || "open",
          organizer: {
            id: "org-1",
            name: "Organizer Name"
          }
        }))
        
        if (query) {
          const filtered = mockSessions.filter(session => 
            session.title.toLowerCase().includes(query.toLowerCase()) ||
            session.description.toLowerCase().includes(query.toLowerCase())
          )
          setSessions(prev => page === 1 ? filtered : [...prev, ...filtered])
        } else {
          setSessions(prev => page === 1 ? mockSessions : [...prev, ...mockSessions])
        }
        
        // Simulate end of results after page 3
        setHasMore(page < 3)
        setError(null)
      } catch (err) {
        setError("Failed to load matchmaking sessions. Please try again.")
      } finally {
        setLoading(false)
      }
    }
    
    fetchSessions()
  }, [page, query, sportType, skillLevel, status])
  
  const loadMore = () => {
    setPage(prev => prev + 1)
  }
  
  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => setPage(1)}>Retry</Button>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="space-y-6">
      {sessions.length === 0 && !loading ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">No matchmaking sessions found. Try adjusting your filters.</p>
            <Button onClick={() => window.location.href = "/matchmaking"}>Clear Filters</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sessions.map(session => (
              <MatchmakingCard key={session.id} session={session} />
            ))}
          </div>
          
          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button onClick={loadMore} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
