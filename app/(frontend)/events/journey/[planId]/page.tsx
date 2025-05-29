"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { Sparkles, Loader2, User } from "lucide-react"
import Link from "next/link"
import { useAuth } from '@/hooks/use-auth'
import { unsaveGemJourney } from '@/app/(frontend)/events/actions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Invitee {
  user: string | { id?: string; _id?: string }
  status: string
  name?: string
  avatar?: string
  email?: string
}

interface Plan {
  id: number
  userId: string
  title: string
  summary: string
  steps: { step: string }[]
  context?: string
  date: string
  invitees?: Invitee[]
  type?: string
}

type MinimalUser = {
  id: string;
  name?: string;
  email?: string;
  profileImage?: { url?: string };
};

export default function JourneyDetailsPage() {
  const params = useParams() as { planId: string; id: string }
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inviteeDetails, setInviteeDetails] = useState<Record<string, Invitee>>({})
  const { user } = useAuth()

  // Separate function to fetch invitee details
  const fetchInviteeDetails = async (invitees: Invitee[]) => {
    if (!invitees || invitees.length === 0) {
      setInviteeDetails({})
      return
    }

    const details: Record<string, Invitee> = {}
    const userIds = invitees.map((i: Invitee) => {
      const userId = typeof i.user === 'object' && i.user !== null 
        ? (i.user as { id?: string; _id?: string }).id || (i.user as { id?: string; _id?: string })._id 
        : i.user
      return userId
    }).filter((userId): userId is string => Boolean(userId))
    
    // Fetch each user individually to get complete details
    const userPromises = userIds.map(async (userId: string) => {
      try {
        console.log(`Fetching user details for: ${userId}`)
        // Use direct user API endpoint for exact ID lookup
        const userRes = await fetch(`/api/users/${userId}`)
        const userData = await userRes.json()
        console.log(`User API result for ${userId}:`, userData)
        
        if (userRes.ok && userData.user) {
          const user = userData.user
          const result = {
            id: userId,
            name: user.name || user.username || user.email || `User ${userId.slice(0, 8)}`,
            email: user.email || '',
            avatar: user.profileImage?.url || ''
          }
          console.log(`User details for ${userId}:`, result)
          return result
        }
        
        // Fallback to search API if direct lookup fails
        console.log(`Direct lookup failed for ${userId}, trying search API`)
        const searchRes = await fetch(`/api/search?q=${encodeURIComponent(userId)}&type=users&limit=10`)
        const searchData = await searchRes.json()
        console.log(`Search fallback result for ${userId}:`, searchData)
        
        if (searchData.users && searchData.users.length > 0) {
          // Find exact match by ID, or fallback to first result
          let user = searchData.users.find((u: MinimalUser) => u.id === userId)
          if (!user) {
            user = searchData.users[0]
          }
          
          if (user) {
            const result = {
              id: userId,
              name: user.name || user.username || user.email || `User ${userId.slice(0, 8)}`,
              email: user.email || '',
              avatar: user.profileImage?.url || ''
            }
            console.log(`Search fallback user details for ${userId}:`, result)
            return result
          }
        }
        
        console.log(`No user data found for ${userId}, using ID as name`)
        return { 
          id: userId, 
          name: `User ${userId.slice(0, 8)}`, 
          email: '', 
          avatar: '' 
        }
      } catch (err) {
        console.error(`Failed to fetch user ${userId}:`, err)
        return { 
          id: userId, 
          name: `User ${userId.slice(0, 8)}`, 
          email: '', 
          avatar: '' 
        }
      }
    })
    
    const userResults = await Promise.all(userPromises)
    for (const userResult of userResults) {
      details[userResult.id] = {
        user: userResult.id,
        name: userResult.name,
        email: userResult.email,
        avatar: userResult.avatar,
        status: ''
      }
    }
    setInviteeDetails(details)
  }

  // Function to refresh journey and invitee data
  const refreshJourneyData = async () => {
    try {
      const res = await fetch(`/api/journeys/${params.planId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch journey")
      
      console.log('Raw journey data:', data.journey)
      console.log('Journey invitees:', data.journey.invitees)
      
      const updatedPlan = {
        ...data.journey,
        userId: typeof data.journey.owner === 'object' && data.journey.owner !== null
          ? data.journey.owner.id || data.journey.owner._id
          : data.journey.owner,
      }
      
      setPlan(updatedPlan)
      
      // Fetch invitee details
      if (data.journey.invitees && data.journey.invitees.length > 0) {
        await fetchInviteeDetails(data.journey.invitees)
      } else {
        setInviteeDetails({})
      }
    } catch (err) {
      console.error('Error refreshing journey data:', err)
      setError("Failed to refresh journey data")
    }
  }

  useEffect(() => {
    async function fetchPlan() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/journeys/${params.planId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to fetch journey")
        
        console.log('Raw journey data:', data.journey)
        console.log('Journey invitees:', data.journey.invitees)
        
        setPlan({
          ...data.journey,
          userId: typeof data.journey.owner === 'object' && data.journey.owner !== null
            ? data.journey.owner.id || data.journey.owner._id
            : data.journey.owner,
        })
        
        // Fetch invitee details
        if (data.journey.invitees && data.journey.invitees.length > 0) {
          await fetchInviteeDetails(data.journey.invitees)
        }
      } catch (err) {
        console.error('Error fetching journey:', err)
        setError("Failed to fetch journey")
      } finally {
        setLoading(false)
      }
    }
    fetchPlan()
  }, [params.planId])

  if (loading) return <div className="flex items-center gap-2 text-gray-500"><Loader2 className="animate-spin h-5 w-5" /> Loading...</div>
  if (error) return <div className="text-red-600 font-medium">{error}</div>
  if (!plan) return <div className="text-gray-500">Plan not found.</div>

  async function handleUnsave(journeyId: string) {
    const res = await unsaveGemJourney(journeyId)
    if (res.success) {
      toast.success('Journey unsaved')
      window.location.href = '/events' // Go back to events after unsaving
    } else {
      toast.error(res.error || 'Failed to unsave journey')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 border border-gray-200 overflow-hidden relative">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#FF6B6B]/10 to-[#FFD93D]/10 rounded-full -translate-y-16 translate-x-16"></div>
          
          <div className="relative z-10">
            <div className="flex items-start gap-6 mb-6">
              <div className="p-4 bg-gradient-to-br from-[#FF6B6B] to-[#FF8E8E] rounded-2xl shadow-lg">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">{plan.title}</h1>
                {plan.type && (
                  <span className="inline-block px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-[#FFD93D]/20 to-[#FFE66D]/20 text-[#B8860B] border border-[#FFD93D]/30">
                    {plan.type === 'date' ? '💕 Date Hangout' : plan.type === 'group' ? '👥 Group Hangout' : plan.type === 'friend_group' ? '🎉 Friend Group Hangout' : `${plan.type} Hangout`}
                  </span>
                )}
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-6 mb-6">
              <p className="text-gray-700 text-lg leading-relaxed">{plan.summary}</p>
              {plan.context && (
                <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-sm text-blue-800 font-medium">Context: {plan.context}</p>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Saved on {plan.date}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Journey Steps */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#4ECDC4] to-[#45B7B8] rounded-xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            Hangout Steps
          </h2>
          
          <div className="space-y-4">
            {plan.steps && plan.steps.map((stepObj, i) => (
              <div key={i} className="relative">
                <div className="flex items-start gap-4 p-6 bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#FF6B6B] to-[#FF8E8E] rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">{i + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 text-lg leading-relaxed">{stepObj.step}</p>
                  </div>
                </div>
                {i < plan.steps.length - 1 && (
                  <div className="ml-5 mt-2 mb-2 w-0.5 h-4 bg-gradient-to-b from-[#FF6B6B] to-transparent"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Invitees Section */}
        {plan.invitees && plan.invitees.length > 0 && (
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-[#FFD93D] to-[#FFE66D] rounded-xl">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              Hangout Members
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user?.id === plan.userId ? (
                // Owner sees all invitees
                plan.invitees.map((inv, idx) => {
                  const userId = getInviteeUserId(inv);
                  const details = inviteeDetails[userId] || {};
                  console.log(`Displaying invitee ${idx}:`, { userId, inv, details });
                  // Prioritize name from details, then email, then a friendly fallback
                  const displayName = details.name && details.name !== userId 
                    ? details.name 
                    : details.email && details.email !== userId
                    ? details.email 
                    : userId?.length > 10 
                    ? `User ${userId.slice(0, 8)}...` 
                    : userId || 'Unknown User';
                  console.log(`Final display name for ${userId}:`, displayName);
                  return (
                    <div key={userId || idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200 hover:bg-gray-100 transition-colors">
                      {details.avatar ? (
                        <img src={details.avatar} alt={displayName} className="w-12 h-12 rounded-full object-cover shadow-md" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-md">
                          <User className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        {userId ? (
                          <Link href={`/profile/${userId}`} className="block font-semibold text-gray-900 hover:text-[#FF6B6B] transition-colors truncate">
                            {displayName}
                          </Link>
                        ) : (
                          <span className="font-semibold text-gray-900 truncate block">{displayName}</span>
                        )}
                        {details.email && details.email !== displayName && (
                          <div className="text-sm text-gray-500 truncate">{details.email}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-semibold",
                          inv.status === 'accepted' ? 'bg-green-100 text-green-700' :
                          inv.status === 'declined' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        )}>
                          {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                        </span>
                        <RemoveInviteeButton inviteeId={userId} planId={plan.id} onRemoved={() => {
                          refreshJourneyData()
                        }} />
                        {inv.status === 'pending' && (
                          <ResendInviteButton inviteeId={userId} planId={plan.id} />
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                // Non-owner sees only their own invite status if invited
                plan.invitees.filter(inv => {
                  const userId = getInviteeUserId(inv);
                  return userId === user?.id;
                }).map((inv, idx) => {
                  const userId = getInviteeUserId(inv);
                  const details = inviteeDetails[userId] || {};
                  console.log(`Displaying invitee ${idx}:`, { userId, inv, details });
                  // Prioritize name from details, then email, then a friendly fallback
                  const displayName = details.name && details.name !== userId 
                    ? details.name 
                    : details.email && details.email !== userId
                    ? details.email 
                    : userId?.length > 10 
                    ? `User ${userId.slice(0, 8)}...` 
                    : userId || 'Unknown User';
                  console.log(`Final display name for ${userId}:`, displayName);
                  return (
                    <div key={userId || idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                      {details.avatar ? (
                        <img src={details.avatar} alt={displayName} className="w-12 h-12 rounded-full object-cover shadow-md" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-md">
                          <User className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-gray-900 truncate block">{displayName}</span>
                        {details.email && details.email !== displayName && (
                          <div className="text-sm text-gray-500 truncate">{details.email}</div>
                        )}
                      </div>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-semibold",
                        inv.status === 'accepted' ? 'bg-green-100 text-green-700' :
                        inv.status === 'declined' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      )}>
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* Owner invite form */}
        {user?.id === plan.userId && (
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 border border-gray-200">
            <InviteUserForm 
              planId={plan.id} 
              onInvited={refreshJourneyData}
              invitees={plan.invitees || []} 
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between bg-white rounded-3xl shadow-xl p-8 border border-gray-200">
          <button
            onClick={() => handleUnsave(String(plan.id))}
            className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold"
          >
            Remove from Saved
          </button>
          <Link href="/events" className="text-[#4ECDC4] hover:text-[#45B7B8] font-semibold transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Events
          </Link>
        </div>
      </div>
    </div>
  )
}

function RemoveInviteeButton({ inviteeId, planId, onRemoved }: { inviteeId: string, planId: number, onRemoved: () => void }) {
  const [loading, setLoading] = useState(false)
  return (
    <button
      className="px-3 py-1.5 text-xs rounded-xl bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 transition-all duration-200 disabled:opacity-60 font-medium shadow-sm"
      disabled={loading}
      onClick={async () => {
        setLoading(true)
        try {
          await fetch(`/api/journeys/${planId}/remove-invitee`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inviteeId })
          })
          onRemoved()
        } finally {
          setLoading(false)
        }
      }}
    >
      {loading ? (
        <div className="flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Removing...</span>
        </div>
      ) : 'Remove'}
    </button>
  )
}

function ResendInviteButton({ inviteeId, planId }: { inviteeId: string, planId: number }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  return (
    <button
      className="px-3 py-1.5 text-xs rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200 transition-all duration-200 disabled:opacity-60 font-medium shadow-sm"
      disabled={loading || success}
      onClick={async () => {
        setLoading(true)
        setSuccess(false)
        try {
          await fetch(`/api/journeys/${planId}/resend-invite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inviteeId })
          })
          setSuccess(true)
          setTimeout(() => setSuccess(false), 2000)
        } finally {
          setLoading(false)
        }
      }}
    >
      {loading ? (
        <div className="flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Resending...</span>
        </div>
      ) : success ? 'Sent!' : 'Resend'}
    </button>
  )
}

function InviteUserForm({ planId, onInvited, invitees }: { planId: number, onInvited: () => void, invitees: Invitee[] }) {
  const [search, setSearch] = useState("")
  const [results, setResults] = useState<MinimalUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviting, setInviting] = useState<string | null>(null)
  const [allowedUserIds, setAllowedUserIds] = useState<Set<string>>(new Set())
  const [fetchingAllowed, setFetchingAllowed] = useState(true)
  const { user } = useAuth()
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    async function fetchAllowedUsers() {
      if (!user?.id) return;
      setFetchingAllowed(true);
      try {
        const [followersRes, followingRes] = await Promise.all([
          fetch(`/api/users/${user.id}/followers`),
          fetch(`/api/users/${user.id}/following`)
        ]);
        const followersData = await followersRes.json();
        const followingData = await followingRes.json();
        let followers: string[] | MinimalUser[] = followersData.users || [];
        let following: string[] | MinimalUser[] = followingData.users || [];
        if (followers.length > 0 && typeof followers[0] === 'string') {
          followers = (followers as string[]).map((id) => ({ id }));
        }
        if (following.length > 0 && typeof following[0] === 'string') {
          following = (following as string[]).map((id) => ({ id }));
        }
        followers = followers as MinimalUser[];
        following = following as MinimalUser[];
        const all = [...followers, ...following];
        const uniqueUsers: Record<string, MinimalUser> = {};
        all.forEach(u => { if (u && u.id) uniqueUsers[u.id] = u; });
        setAllowedUserIds(new Set(Object.keys(uniqueUsers)));
        console.log("Allowed user IDs:", Object.keys(uniqueUsers));
      } catch {
        setError('Failed to fetch followers/following');
      } finally {
        setFetchingAllowed(false);
      }
    }
    fetchAllowedUsers();
  }, [user?.id]);

  // Debounced search as user types
  useEffect(() => {
    if (!search.trim()) {
      setResults([])
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(search)}&type=users&limit=10`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to search users")
        const filtered = (data.users || []).filter((u: MinimalUser) => {
          const allowed = allowedUserIds.has(u.id);
          if (!allowed) {
            console.log("Filtered out (not allowed):", u.id, u.name || u.email);
          }
          return allowed;
        });
        console.log("Search results:", data.users);
        console.log("Filtered results:", filtered);
        setResults(filtered)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to search users")
      } finally {
        setLoading(false)
      }
    }, 300)
    // Cleanup
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search, allowedUserIds])

  async function handleInvite(userId: string) {
    setInviting(userId)
    setError(null)
    try {
      const res = await fetch(`/api/journeys/${planId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteeId: userId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to invite user")
      onInvited()
      setResults([])
      setSearch("")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to invite user")
    } finally {
      setInviting(null)
    }
  }

  const invitedIds = new Set(invitees.map((i: Invitee) => (typeof i.user === 'object' ? (i.user as MinimalUser).id : i.user)))
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-[#4ECDC4] to-[#45B7B8] rounded-xl">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        Invite Friends to Join You
      </h3>
      
      {fetchingAllowed ? (
        <div className="flex items-center gap-2 text-gray-500 bg-blue-50 p-4 rounded-xl border border-blue-200">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading your followers and following...</span>
        </div>
      ) : null}
      
      <form className="space-y-4" onSubmit={e => e.preventDefault()}>
        <div className="flex gap-3">
          <input
            type="text"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#4ECDC4] focus:border-transparent transition-all duration-200"
            placeholder="Search friends to invite... (only your followers/following)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            disabled={fetchingAllowed}
          />
          <button 
            type="submit" 
            className="px-6 py-3 bg-gradient-to-r from-[#4ECDC4] to-[#45B7B8] text-white rounded-2xl hover:from-[#45B7B8] hover:to-[#4ECDC4] transition-all duration-200 shadow-lg hover:shadow-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed" 
            disabled={loading || !search.trim() || fetchingAllowed}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching...</span>
              </div>
            ) : 'Search'}
          </button>
        </div>
        
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="text-red-700 text-sm font-medium">{error}</div>
          </div>
        )}
      </form>
      
      {results.length === 0 && search.trim() && !loading && !error && (
        <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200">
          <div className="text-gray-500 font-medium">No users found matching your search.</div>
          <div className="text-sm text-gray-400 mt-1">Try searching for a different name or username.</div>
        </div>
      )}
      
      {results.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Search Results</h4>
          <div className="grid gap-3">
            {results.map(user => (
              <div key={user.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200 hover:bg-gray-100 transition-colors">
                {user.profileImage?.url ? (
                  <img src={user.profileImage.url} alt={typeof user.name === 'string' ? user.name : ''} className="w-12 h-12 rounded-full object-cover shadow-md" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-md">
                    <User className="w-6 h-6 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">
                    {typeof user.name === 'string' ? user.name : (user.name ? '[Unknown]' : user.email)}
                  </div>
                  {user.email && (
                    <div className="text-sm text-gray-500 truncate">{user.email}</div>
                  )}
                </div>
                <button
                  className={cn(
                    "px-4 py-2 rounded-xl font-semibold transition-all duration-200 shadow-sm",
                    inviting === user.id ? "bg-gray-200 text-gray-500 cursor-not-allowed" :
                    invitedIds.has(user.id) ? "bg-green-100 text-green-700 border border-green-200" :
                    "bg-gradient-to-r from-[#FFD93D] to-[#FFE66D] text-gray-900 hover:from-[#FFE66D] hover:to-[#FFD93D] shadow-lg hover:shadow-xl"
                  )}
                  disabled={inviting === user.id || invitedIds.has(user.id)}
                  onClick={() => handleInvite(user.id)}
                >
                  {inviting === user.id ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Inviting...</span>
                    </div>
                  ) : invitedIds.has(user.id) ? 'Already Invited' : 'Invite'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Helper to get userId from invitee
function getInviteeUserId(inv: Invitee): string {
  if (inv && typeof inv.user === 'object' && inv.user !== null) {
    // If user is an object, try id or _id
    return (inv.user as { id?: string; _id?: string }).id || (inv.user as { id?: string; _id?: string })._id || '';
  }
  return inv.user as string;
} 