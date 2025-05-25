
import Image from 'next/image'
import logo from '@/public/logo.svg'

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mb-12">
    
        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <Image src={logo} alt="Logo" width={80} height={80} className="w-20" />
            <span className="text-xl font-bold text-[#FF6B6B] ml-2">Grounded Gems</span>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-2 justify-center">
            <a href="#" className="text-gray-600 hover:text-[#4ECDC4]">
              About Us
            </a>
            <a href="#" className="text-gray-600 hover:text-[#4ECDC4]">
              Contact
            </a>
            <a href="#" className="text-gray-600 hover:text-[#4ECDC4]">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-600 hover:text-[#4ECDC4]">
              Terms of Service
            </a>
          </div>

          <div className="mt-4 md:mt-0 text-gray-500 text-sm">
            &copy; 2025 Grounded Gems. All rights reserved.
          </div>
        </div>
    </footer>
  )
}

