import Image from 'next/image'
import logo from '@/public/logo.svg'

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 pb-20 md:pb-4">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-3 md:mb-0">
            <Image src={logo} alt="Logo" width={60} height={60} className="w-15" />
            <span className="text-lg font-bold text-[#FF6B6B] ml-2">Grounded Gems</span>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1 justify-center text-sm">
            <a href="#" className="text-gray-600 hover:text-[#4ECDC4] transition-colors">
              About Us
            </a>
            <a href="#" className="text-gray-600 hover:text-[#4ECDC4] transition-colors">
              Contact
            </a>
            <a href="#" className="text-gray-600 hover:text-[#4ECDC4] transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-600 hover:text-[#4ECDC4] transition-colors">
              Terms of Service
            </a>
          </div>

          <div className="mt-3 md:mt-0 text-gray-500 text-xs">
            &copy; 2025 Grounded Gems. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}

