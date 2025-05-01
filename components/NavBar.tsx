"use client"
import Link from "next/link"
import { Button } from "./ui/button"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import logo from '@/public/logo.svg'
import Image from "next/image"

export default function NavBar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

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
            <Image src={logo} alt="Logo" className="w-30 mx-4"/>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
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
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
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
          isMenuOpen ? "max-h-60 opacity-100 mt-0" : "max-h-0 opacity-0 mt-0 pointer-events-none",
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
          <div className="pt-2 border-t border-gray-100">
            <Button
              className="w-full bg-[#FF6B6B] hover:bg-[#FF6B6B]/90 text-white"
              onClick={() => setIsMenuOpen(false)}
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
