'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import useSWR from 'swr'
import {
  Menu,
  X,
  LogOut,
  UserCircle,
} from 'lucide-react'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import logo from '@/public/logo.svg'
import { logoutUser } from '@/app/actions'

interface UserData {
  id: string
  email: string
  name?: string
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' })
    .then(res => res.ok ? res.json().then(d => d.user) : null)

export default function NavBar() {
  const router = useRouter()
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // SWR for current user
  const { data: user, mutate } = useSWR<UserData | null>('/api/users/me', fetcher)

  // Scroll effect
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Logout handler
  const handleLogout = async () => {
    await logoutUser()
    // clear SWR cache so UI updates immediately
    mutate(null, false)
    router.push('/login')
  }

  // Avatar initials
  const getInitials = (u: UserData) =>
    u.name
      ? u.name
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
      : u.email.charAt(0).toUpperCase()

  return (
    <header className="sticky top-0 z-50">
      <nav
        className={cn(
          'mx-4 mt-2 rounded-lg p-4 transition-all duration-300',
          isScrolled ? 'bg-white shadow-md' : 'bg-white/80 backdrop-blur-md'
        )}
      >
        <div className="container mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image src={logo} alt="Logo" className="h-8 w-auto" priority />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {['/', '/about', '/contact'].map((path, i) => (
              <Link
                key={i}
                href={path}
                className={cn(
                  'relative font-medium transition-colors',
                  pathname === path
                    ? 'text-[#FF6B6B]'
                    : 'text-gray-700 hover:text-[#FF6B6B]'
                )}
              >
                {path === '/'
                  ? 'Home'
                  : path.replace('/', '').replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-[#FF6B6B] transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}

            {/* Auth / Profile */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="p-0">
                    <Avatar className="h-8 w-8 border-2 border-[#FF6B6B]/20">
                      <AvatarFallback className="bg-[#FF6B6B]/10 text-[#FF6B6B]">
                        {getInitials(user)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.name || 'User'}</span>
                      <span className="text-sm text-muted-foreground">{user.email}</span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push(`/profile/${user.id}`)}>
                    <UserCircle className="mr-2 h-4 w-4" /> View Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" /> Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild className="bg-[#FF6B6B] text-white">
                  <Link href="/signup">Sign up</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(v => !v)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Drawer */}
        <div
          className={cn(
            'md:hidden mx-4 overflow-hidden rounded-b-lg bg-white shadow transition-[max-height,opacity] duration-300',
            isMenuOpen
              ? 'max-h-96 opacity-100 py-4'
              : 'max-h-0 opacity-0 py-0 pointer-events-none'
          )}
        >
          <div className="flex flex-col space-y-4 px-4">
            {['/', '/about', '/contact'].map((path, i) => (
              <Link
                key={i}
                href={path}
                className="block rounded-md px-2 py-1 font-medium text-gray-700 hover:bg-[#FF6B6B]/5 hover:text-[#FF6B6B]"
                onClick={() => setIsMenuOpen(false)}
              >
                {path === '/'
                  ? 'Home'
                  : path.replace('/', '').replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </Link>
            ))}

            {user ? (
              <>
                <Button variant="ghost" asChild className="justify-start">
                  <Link href={`/profile/${user.id}`} onClick={() => setIsMenuOpen(false)}>
                    View Profile
                  </Link>
                </Button>
                <Button variant="ghost" asChild className="justify-start" onClick={handleLogout}>
                  Log Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="w-full" onClick={() => { router.push('/login'); setIsMenuOpen(false) }}>
                  Log in
                </Button>
                <Button className="w-full bg-[#FF6B6B] text-white" onClick={() => { router.push('/signup'); setIsMenuOpen(false) }}>
                  Sign up
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}