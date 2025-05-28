import ImprovedSignupForm from "@/components/auth/improved-signup-form"
import { getCategories } from "@/app/actions"

export const metadata = {
  title: 'Sign Up - Grounded Gems',
  description: 'Join Grounded Gems and discover amazing local places personalized for you',
}

export default async function EnhancedSignupPage() {
  // Fetch categories from Payload CMS
  const categoriesResult = await getCategories()
  const categories = categoriesResult.docs || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FF6B6B]/5 via-white to-[#4ECDC4]/5">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] bg-clip-text text-transparent mb-4">
            Join Grounded Gems
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover hidden gems, connect with local communities, and create unforgettable experiences tailored just for you.
          </p>
        </div>
        
        <ImprovedSignupForm categories={categories} />
        
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>By signing up, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  )
} 