"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { Sparkles, Loader2, User } from "lucide-react"
import Link from "next/link"
import { useAuth } from '@/hooks/use-auth'

interface Invitee {
  user: string
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

  useEffect(() => {
    async function fetchPlan() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/journeys/${params.planId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to fetch journey")
        setPlan({
          ...data.journey,
          userId: typeof data.journey.owner === 'object' && data.journey.owner !== null
            ? data.journey.owner.id || data.journey.owner._id
            : data.journey.owner,
        })
        // Fetch invitee details
        if (data.journey.invitees && data.journey.invitees.length > 0) {
          const ids = data.journey.invitees.map((i: Invitee) => i.user)
          const usersRes = await fetch(`/api/search?q=${ids.join(",")}&type=users&limit=${ids.length}`)
          const usersData: { users?: MinimalUser[] } = await usersRes.json()
          const details: Record<string, Invitee> = {}
          for (const user of usersData.users || []) {
            details[user.id] = { user: user.id, name: user.name, avatar: user.profileImage?.url, status: '', email: user.email }
          }
          setInviteeDetails(details)
        }
      } catch {
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

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="h-8 w-8 text-[#FF6B6B]" />
        <h1 className="text-2xl font-bold">{plan.title}</h1>
        {plan.type && (
          <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
            {plan.type === 'date' ? 'Date' : plan.type === 'group' ? 'Group' : plan.type === 'friend_group' ? 'Friend Group' : plan.type}
          </span>
        )}
      </div>
      <div className="mb-4 text-gray-600">{plan.summary}</div>
      {plan.context && <div className="mb-2 text-xs text-gray-500">Context: {plan.context}</div>}
      <div className="mb-2 text-xs text-gray-400">Saved on {plan.date}</div>
      <ol className="space-y-4 mb-6">
        {plan.steps && plan.steps.map((stepObj, i) => (
          <li key={i} className="bg-gradient-to-r from-[#FFF7E6] to-[#F5F5F5] rounded-lg p-4 flex items-start gap-3 shadow-sm border border-[#FFE66D]/40">
            <span className="font-bold text-[#FF6B6B] mr-2">{i + 1}.</span>
            <span className="text-gray-900 text-base leading-relaxed">{stepObj.step}</span>
          </li>
        ))}
      </ol>
      {/* Invitees */}
      {plan.invitees && plan.invitees.length > 0 && (
        <div className="mb-4">
          <div className="font-semibold text-sm mb-1">Invitees:</div>
          <ul className="text-xs text-gray-700">
            {user?.id === plan.userId ? (
              // Owner sees all invitees
              plan.invitees.map((inv, idx) => {
                const userId = getInviteeUserId(inv);
                const details = inviteeDetails[userId] || {};
                return (
                  <li key={userId || idx} className="flex items-center gap-3 mb-2 p-2 rounded hover:bg-gray-50 border border-gray-100">
                    {details.avatar ? (
                      <img src={details.avatar} alt={typeof details.name === 'string' ? details.name : (details.name ? '[Unknown]' : userId)} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <User className="w-7 h-7 text-gray-400" />
                    )}
                    <div className="flex-1 min-w-0">
                      {userId ? (
                        <Link href={`/profile/${userId}`} className="block font-medium text-gray-900 hover:underline truncate">
                          {typeof details.name === 'string' ? details.name : (details.name ? '[Unknown]' : userId)}
                        </Link>
                      ) : (
                        <span className="font-medium text-gray-900">{typeof details.name === 'string' ? details.name : (details.name ? '[Unknown]' : userId)}</span>
                      )}
                      {details.email && typeof details.email === 'string' && (
                        <div className="text-xs text-gray-500 truncate">{details.email}</div>
                      )}
                    </div>
                    <span className={
                      inv.status === 'accepted' ? 'text-green-600 font-semibold ml-2' :
                      inv.status === 'declined' ? 'text-red-600 font-semibold ml-2' :
                      'text-gray-500 ml-2'
                    }>
                      {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                    </span>
                    {/* Remove button for owner */}
                    <RemoveInviteeButton inviteeId={userId} planId={plan.id} onRemoved={() => {
                      // Refetch plan after removal
                      fetch(`/api/journeys/${plan.id}`)
                        .then(res => res.json())
                        .then(data => setPlan(data.journey))
                    }} />
                    {/* Resend Invite button for pending invitees */}
                    {inv.status === 'pending' && (
                      <ResendInviteButton inviteeId={userId} planId={plan.id} />
                    )}
                  </li>
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
                return (
                  <li key={userId || idx} className="flex items-center gap-3 mb-2 p-2 rounded hover:bg-gray-50 border border-gray-100">
                    {details.avatar ? (
                      <img src={details.avatar} alt={typeof details.name === 'string' ? details.name : (details.name ? '[Unknown]' : userId)} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <User className="w-7 h-7 text-gray-400" />
                    )}
                    <div className="flex-1 min-w-0">
                      {userId ? (
                        <Link href={`/profile/${userId}`} className="block font-medium text-gray-900 hover:underline truncate">
                          {typeof details.name === 'string' ? details.name : (details.name ? '[Unknown]' : userId)}
                        </Link>
                      ) : (
                        <span className="font-medium text-gray-900">{typeof details.name === 'string' ? details.name : (details.name ? '[Unknown]' : userId)}</span>
                      )}
                      {details.email && typeof details.email === 'string' && (
                        <div className="text-xs text-gray-500 truncate">{details.email}</div>
                      )}
                    </div>
                    <span className={
                      inv.status === 'accepted' ? 'text-green-600 font-semibold ml-2' :
                      inv.status === 'declined' ? 'text-red-600 font-semibold ml-2' :
                      'text-gray-500 ml-2'
                    }>
                      {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                    </span>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
      {/* Owner invite form */}
      {user?.id === plan.userId && (
        <InviteUserForm planId={plan.id} onInvited={() => {
          // Refetch plan after inviting
          fetch(`/api/journeys/${plan.id}`)
            .then(res => res.json())
            .then(data => setPlan(data.journey))
        }} invitees={plan.invitees || []} />
      )}
      <Link href={`/profile/${params.id}`} className="text-[#4ECDC4] hover:underline text-sm">Back to Profile</Link>
    </div>
  )
}

function RemoveInviteeButton({ inviteeId, planId, onRemoved }: { inviteeId: string, planId: number, onRemoved: () => void }) {
  const [loading, setLoading] = useState(false)
  return (
    <button
      className="ml-2 px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 transition disabled:opacity-60"
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
      {loading ? 'Removing...' : 'Remove'}
    </button>
  )
}

function ResendInviteButton({ inviteeId, planId }: { inviteeId: string, planId: number }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  return (
    <button
      className="ml-2 px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition disabled:opacity-60"
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
      {loading ? 'Resending...' : success ? 'Sent!' : 'Resend Invite'}
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
    <div className="mb-6 border rounded-lg p-4 bg-gray-50">
      {fetchingAllowed ? (
        <div className="text-xs text-gray-500 mb-2">Loading your followers and following...</div>
      ) : null}
      <form className="flex gap-2 mb-2" onSubmit={e => e.preventDefault()}>
        <input
          type="text"
          className="flex-1 border rounded px-2 py-1"
          placeholder="Search users to invite... (only your followers/following)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          disabled={fetchingAllowed}
        />
        <button type="submit" className="bg-[#4ECDC4] text-white px-3 py-1 rounded" disabled={loading || !search.trim() || fetchingAllowed}>{loading ? 'Searching...' : 'Search'}</button>
      </form>
      {error && <div className="text-red-600 text-xs mb-2">{error}</div>}
      <ul className="space-y-1">
        {results.length === 0 && search.trim() && !loading && !error && (
          <li className="text-xs text-gray-500">No users found.</li>
        )}
        {results.map(user => (
          <li key={user.id} className="flex items-center gap-2">
            {user.profileImage?.url ? <img src={user.profileImage.url} alt={typeof user.name === 'string' ? user.name : ''} className="w-6 h-6 rounded-full object-cover" /> : <User className="w-5 h-5 text-gray-400" />}
            <span className="font-medium">{typeof user.name === 'string' ? user.name : (user.name ? '[Unknown]' : user.email)}</span>
            <button
              className="ml-auto px-2 py-1 text-xs rounded bg-[#FFD93D] text-gray-900 hover:bg-[#FFE66D] transition disabled:opacity-60"
              disabled={inviting === user.id || invitedIds.has(user.id)}
              onClick={() => handleInvite(user.id)}
            >
              {inviting === user.id ? 'Inviting...' : invitedIds.has(user.id) ? 'Already Invited' : 'Invite'}
            </button>
          </li>
        ))}
      </ul>
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