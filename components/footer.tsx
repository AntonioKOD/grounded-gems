import Image from 'next/image'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-stone-800 to-amber-900 text-white/90 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand & Mission */}
          <div>
            <div className="flex items-center mb-4">
              <Image 
                src="https://i.imgur.com/btJCRer.png" 
                alt="Sacavia" 
                width={32} 
                height={32}
                className="rounded-md"
              />
              <span className="text-lg font-bold text-amber-200 ml-2">Sacavia</span>
            </div>
            <p className="text-stone-300 text-sm leading-relaxed mb-4">
              Guided by wisdom, connected by stories. Discover authentic experiences and meaningful places with your community.
            </p>
            <p className="text-amber-300/80 text-xs italic">
              "The land knows you, even when you are lost."
            </p>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-amber-200 mb-4">Explore</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/map" className="text-stone-300 hover:text-amber-200 transition-colors">Discover Places</Link></li>
              <li><Link href="/events" className="text-stone-300 hover:text-amber-200 transition-colors">Community Events</Link></li>
              <li><Link href="/feed" className="text-stone-300 hover:text-amber-200 transition-colors">Stories & Posts</Link></li>
              <li><Link href="/profile" className="text-stone-300 hover:text-amber-200 transition-colors">Your Journey</Link></li>
            </ul>
          </div>
          
          {/* Community */}
          <div>
            <h3 className="font-semibold text-amber-200 mb-4">Community</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="text-stone-300 hover:text-amber-200 transition-colors">Our Story</Link></li>
              <li><Link href="/guidelines" className="text-stone-300 hover:text-amber-200 transition-colors">Community Guidelines</Link></li>
              <li><Link href="/support" className="text-stone-300 hover:text-amber-200 transition-colors">Support</Link></li>
              <li><Link href="/contact" className="text-stone-300 hover:text-amber-200 transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-stone-600 mt-8 pt-8 text-center">
          <p className="text-stone-400 text-sm">
            &copy; 2025 Sacavia. All rights reserved. | Built with respect for the land and its people.
          </p>
        </div>
      </div>
    </footer>
  )
}

