import React from 'react';

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Support</h1>
            <p className="text-gray-600">We're here to help you get the most out of Sacavia</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-blue-900 mb-4">Contact Us</h3>
              <div className="space-y-3">
                <p className="text-blue-800">
                  <strong>Email:</strong> antonio_kodheli@icloud.com
                </p>
                <p className="text-blue-800">
                  <strong>Response Time:</strong> Within 24 hours
                </p>
                <p className="text-blue-800">
                  <strong>Hours:</strong> Monday - Friday, 9 AM - 6 PM EST
                </p>
              </div>
            </div>

            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-green-900 mb-4">Quick Help</h3>
              <div className="space-y-3">
                <p className="text-green-800">
                  <strong>FAQ:</strong> Check our frequently asked questions
                </p>
                <p className="text-green-800">
                  <strong>Bug Reports:</strong> Report issues through the app
                </p>
                <p className="text-green-800">
                  <strong>Feature Requests:</strong> Share your ideas with us
                </p>
              </div>
            </div>
          </div>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Frequently Asked Questions</h2>
              
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">How do I create an account?</h3>
                  <p className="text-gray-700">
                    Download the Sacavia app and tap "Sign Up" to create your account. You'll need to provide your email address and create a password.
                  </p>
                </div>

                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">How do I find places near me?</h3>
                  <p className="text-gray-700">
                    Enable location services in your device settings and the app will automatically show you nearby places, events, and people.
                  </p>
                </div>

                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">How do I share a place?</h3>
                  <p className="text-gray-700">
                    Tap the "+" button in the app and select "Add Place" to share a new location with the community. You can add photos and descriptions.
                  </p>
                </div>

                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">How do I connect with other users?</h3>
                  <p className="text-gray-700">
                    Browse the "People" tab to discover users in your area. You can follow them to see their posts and stay connected.
                  </p>
                </div>

                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">How do I manage my privacy settings?</h3>
                  <p className="text-gray-700">
                    Go to your profile settings to control who can see your posts, location, and personal information.
                  </p>
                </div>

                <div className="border-b border-gray-200 pb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">How do I report inappropriate content?</h3>
                  <p className="text-gray-700">
                    Tap the three dots menu on any post and select "Report" to flag inappropriate content. We review all reports promptly.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">App Features</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Discover Places</h3>
                  <p className="text-gray-700 text-sm">
                    Find amazing local spots, restaurants, and hidden gems shared by the community.
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Connect with People</h3>
                  <p className="text-gray-700 text-sm">
                    Meet like-minded people in your area and build meaningful connections.
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Share Experiences</h3>
                  <p className="text-gray-700 text-sm">
                    Post photos, reviews, and stories about your favorite places and experiences.
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Get Recommendations</h3>
                  <p className="text-gray-700 text-sm">
                    Receive personalized suggestions based on your interests and location.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Troubleshooting</h2>
              
              <div className="space-y-4">
                <div className="border-l-4 border-yellow-400 pl-4">
                  <h3 className="font-semibold text-gray-900 mb-1">App won't load</h3>
                  <p className="text-gray-700 text-sm">
                    Check your internet connection and try restarting the app. If the problem persists, try reinstalling the app.
                  </p>
                </div>

                <div className="border-l-4 border-yellow-400 pl-4">
                  <h3 className="font-semibold text-gray-900 mb-1">Location not working</h3>
                  <p className="text-gray-700 text-sm">
                    Make sure location services are enabled in your device settings and that you've granted permission to the app.
                  </p>
                </div>

                <div className="border-l-4 border-yellow-400 pl-4">
                  <h3 className="font-semibold text-gray-900 mb-1">Can't upload photos</h3>
                  <p className="text-gray-700 text-sm">
                    Check that you've granted camera and photo library permissions to the app in your device settings.
                  </p>
                </div>

                <div className="border-l-4 border-yellow-400 pl-4">
                  <h3 className="font-semibold text-gray-900 mb-1">Notifications not working</h3>
                  <p className="text-gray-700 text-sm">
                    Go to your device settings and ensure notifications are enabled for the Sacavia app.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Legal & Privacy</h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <a 
                  href="/terms" 
                  className="block p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <h3 className="font-semibold text-gray-900 mb-1">Terms of Service</h3>
                  <p className="text-gray-700 text-sm">
                    Read our terms and conditions for using Sacavia.
                  </p>
                </a>

                <a 
                  href="/privacy" 
                  className="block p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <h3 className="font-semibold text-gray-900 mb-1">Privacy Policy</h3>
                  <p className="text-gray-700 text-sm">
                    Learn how we protect and handle your personal information.
                  </p>
                </a>
              </div>
            </section>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200 text-center">
            <p className="text-gray-600 mb-4">
              Still need help? We're here for you!
            </p>
            <a 
              href="mailto:antonio_kodheli@icloud.com" 
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 