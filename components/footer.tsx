import { Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
          <div>
            <h3 className="text-xl font-bold mb-4">Stay Updated</h3>
            <p className="text-gray-600 mb-6">
              Subscribe to our newsletter to get the latest events and exclusive offers.
            </p>

            <div className="flex max-w-md">
              <div className="relative flex-grow">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  className="pr-12 border-2 border-[#FFE66D] focus-visible:ring-[#FFE66D]"
                />
                <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#FFE66D]" />
              </div>
              <Button className="ml-2 bg-[#FF6B6B] hover:bg-[#FF6B6B]/90">Subscribe</Button>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-4">What People Say</h3>

            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border-l-4 border-[#FF6B6B] shadow-sm">
                <p className="text-gray-600 italic">
                  &quot;Local Explorer helped me discover amazing events I never knew existed in my area. The interface is so
                  intuitive!&quot;
                </p>
                <p className="text-sm font-medium mt-2">— Sarah T.</p>
              </div>

              <div className="bg-white p-4 rounded-lg border-l-4 border-[#FF6B6B] shadow-sm">
                <p className="text-gray-600 italic">
                  &quot;I&apos;ve been using this platform for months now and it&apos;s become my go-to for weekend plans. Highly
                  recommend!&quot;
                </p>
                <p className="text-sm font-medium mt-2">— Michael R.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="w-10 h-10 rounded-full bg-[#FF6B6B] flex items-center justify-center mr-3">
              <span className="text-white font-bold">LE</span>
            </div>
            <span className="font-bold text-xl">Local Explorer</span>
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
            &copy; {new Date().getFullYear()} Local Explorer. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}
