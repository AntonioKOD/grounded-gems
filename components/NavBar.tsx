"use client"
import Link from "next/link"
import { Button } from "./ui/button"
import { Menu, X, LogOut, UserCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import logo from "@/public/logo.svg"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface UserData {
  email: string
  name?: string
  id: string
}

export default function NavBar() {
  const router = useRouter()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Handle scroll effect and fetch user
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    async function fetchUser() {
      setIsLoading(true)
      try {
        const res = await fetch("/api/users/me", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (res.ok) {
          const { user } = await res.json()
          setUser(user)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error("Failed to fetch user:", error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/users/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (res.ok) {
        setUser(null)
        router.push("/login")
      }
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  // Get user initials for avatar
  const getInitials = () => {
    if (!user) return "U"
    if (user.name) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    }
    return user.email.charAt(0).toUpperCase()
  }

  return (
    <div className="flex flex-col sticky top-0 z-50">
      <nav
        className={cn(
          "p-4 mx-4 mt-2 rounded-lg transition-all duration-300",
          isScrolled ? "bg-white shadow-md" : "bg-white/80 backdrop-blur-md",
        )}
      >
        <div className="container mx-auto flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center space-x-2 -m-8">
            <Link href={"/"} className="flex items-center">
              <Image src={logo || "/placeholder.svg"} alt="Logo" className="w-30 mx-4" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-700 hover:text-[#FF6B6B] transition-colors relative group font-medium">
              Home
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#FF6B6B] transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link
              href="/about"
              className="text-gray-700 hover:text-[#FF6B6B] transition-colors relative group font-medium"
            >
              About
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#FF6B6B] transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <Link
              href="/contact"
              className="text-gray-700 hover:text-[#FF6B6B] transition-colors relative group font-medium"
            >
              Contact
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#FF6B6B] transition-all duration-300 group-hover:w-full"></span>
            </Link>

            {/* Auth Buttons or Profile */}
            <div className="ml-4">
              {isLoading ? (
                <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
              ) : user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 hover:bg-[#FF6B6B]/10">
                      <Avatar className="h-8 w-8 border-2 border-[#FF6B6B]/20">
                        <AvatarFallback className="bg-[#FF6B6B]/10 text-[#FF6B6B]">{getInitials()}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-white">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.name || "User"}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push(`/profile/${user.id}`)}>
                      <UserCircle className="mr-2 h-4 w-4" />
                      <span>View profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" asChild className="text-gray-700 hover:text-[#FF6B6B] hover:bg-[#FF6B6B]/10">
                    <Link href="/login">Log in</Link>
                  </Button>
                  <Button asChild className="bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white">
                    <Link href="/signup">Sign up</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            {!isLoading && user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 mr-2 hover:bg-[#FF6B6B]/10">
                    <Avatar className="h-8 w-8 border-2 border-[#FF6B6B]/20">
                      <AvatarFallback className="bg-[#FF6B6B]/10 text-[#FF6B6B]">{getInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name || "User"}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      router.push(`/profile/${user.id}`)
                      setIsMenuOpen(false)
                    }}
                  >
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>View profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-700 hover:text-[#FF6B6B] hover:bg-[#FF6B6B]/10"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      <div
        className={cn(
          "md:hidden mx-4 px-4 py-2 bg-white rounded-b-lg shadow-md transition-all duration-300 overflow-hidden",
          isMenuOpen ? "max-h-80 opacity-100 mt-0" : "max-h-0 opacity-0 mt-0 pointer-events-none",
        )}
      >
        <div className="flex flex-col space-y-4 py-2">
          <Link
            href="/"
            className="text-gray-700 hover:text-[#FF6B6B] transition-colors font-medium px-2 py-1 hover:bg-[#FF6B6B]/5 rounded-md"
            onClick={() => setIsMenuOpen(false)}
          >
            Home
          </Link>
          <Link
            href="/about"
            className="text-gray-700 hover:text-[#FF6B6B] transition-colors font-medium px-2 py-1 hover:bg-[#FF6B6B]/5 rounded-md"
            onClick={() => setIsMenuOpen(false)}
          >
            About
          </Link>
          <Link
            href="/contact"
            className="text-gray-700 hover:text-[#FF6B6B] transition-colors font-medium px-2 py-1 hover:bg-[#FF6B6B]/5 rounded-md"
            onClick={() => setIsMenuOpen(false)}
          >
            Contact
          </Link>

          {/* Auth buttons for mobile */}
          {!isLoading && !user && (
            <>
              <div className="pt-2 border-t border-gray-100">
                <Button
                  variant="outline"
                  className="w-full border-[#FF6B6B] text-[#FF6B6B] hover:bg-[#FF6B6B]/5 hover:text-[#FF6B6B]"
                  onClick={() => {
                    router.push("/login")
                    setIsMenuOpen(false)
                  }}
                >
                  Log in
                </Button>
              </div>
              <div>
                <Button
                  className="w-full bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white"
                  onClick={() => {
                    router.push("/signup")
                    setIsMenuOpen(false)
                  }}
                >
                  Sign up
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
