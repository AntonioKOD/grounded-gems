import React from 'react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
            <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 mb-4">
                Sacavia ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and website (collectively, the "Service").
              </p>
              <p className="text-gray-700 mb-4">
                By using the Service, you consent to the data practices described in this Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.1 Personal Information</h3>
              <p className="text-gray-700 mb-4">
                We may collect personal information that you voluntarily provide to us, including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Name and username</li>
                <li>Email address</li>
                <li>Profile information and bio</li>
                <li>Profile pictures and media content</li>
                <li>Location data (with your consent)</li>
                <li>Communication preferences</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.2 Location Information</h3>
              <p className="text-gray-700 mb-4">
                With your explicit consent, we collect and use your location information to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Show you nearby places and events</li>
                <li>Connect you with people in your area</li>
                <li>Provide personalized recommendations</li>
                <li>Improve our location-based services</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.3 Usage Information</h3>
              <p className="text-gray-700 mb-4">
                We automatically collect certain information about your use of the Service, including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Device information (device type, operating system, unique device identifiers)</li>
                <li>Log data (access times, pages viewed, features used)</li>
                <li>App performance data and crash reports</li>
                <li>Network information and IP address</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">2.4 User-Generated Content</h3>
              <p className="text-gray-700 mb-4">
                We collect content you create and share through the Service, including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Posts, comments, and reviews</li>
                <li>Photos and videos you upload</li>
                <li>Places and events you share</li>
                <li>Interactions with other users</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Provide, maintain, and improve the Service</li>
                <li>Personalize your experience and show relevant content</li>
                <li>Connect you with nearby places, events, and people</li>
                <li>Send you notifications and updates</li>
                <li>Respond to your questions and support requests</li>
                <li>Analyze usage patterns and improve our services</li>
                <li>Prevent fraud and ensure security</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Information Sharing and Disclosure</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.1 With Other Users</h3>
              <p className="text-gray-700 mb-4">
                Your profile information and content you share may be visible to other users of the Service, based on your privacy settings and the nature of the content.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.2 Service Providers</h3>
              <p className="text-gray-700 mb-4">
                We may share your information with third-party service providers who help us operate the Service, including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Cloud hosting and storage providers</li>
                <li>Analytics and crash reporting services</li>
                <li>Payment processors (if applicable)</li>
                <li>Customer support tools</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.3 Legal Requirements</h3>
              <p className="text-gray-700 mb-4">
                We may disclose your information if required by law or in response to valid legal requests, such as subpoenas or court orders.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">4.4 Business Transfers</h3>
              <p className="text-gray-700 mb-4">
                In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the transaction.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
              <p className="text-gray-700 mb-4">
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet or electronic storage is 100% secure.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
              <p className="text-gray-700 mb-4">
                We retain your personal information for as long as necessary to provide the Service and fulfill the purposes outlined in this Privacy Policy. We may retain certain information for longer periods to comply with legal obligations, resolve disputes, and enforce our agreements.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your Rights and Choices</h2>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">7.1 Access and Update</h3>
              <p className="text-gray-700 mb-4">
                You can access and update your personal information through your account settings in the app.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">7.2 Location Services</h3>
              <p className="text-gray-700 mb-4">
                You can control location services through your device settings. You can disable location access at any time, though this may limit certain features of the Service.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">7.3 Notifications</h3>
              <p className="text-gray-700 mb-4">
                You can manage notification preferences through your device settings and within the app.
              </p>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">7.4 Account Deletion</h3>
              <p className="text-gray-700 mb-4">
                You can delete your account at any time through the app settings. Please note that some information may be retained for legal purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Children's Privacy</h2>
              <p className="text-gray-700 mb-4">
                The Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. International Data Transfers</h2>
              <p className="text-gray-700 mb-4">
                Your information may be transferred to and processed in countries other than your own. We ensure that such transfers comply with applicable data protection laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Third-Party Services</h2>
              <p className="text-gray-700 mb-4">
                The Service may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Changes to This Privacy Policy</h2>
              <p className="text-gray-700 mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Email:</strong> privacy@sacavia.com<br />
                  <strong>Address:</strong> [Your Business Address]<br />
                  <strong>Website:</strong> https://sacavia.com
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. California Privacy Rights</h2>
              <p className="text-gray-700 mb-4">
                If you are a California resident, you have certain rights under the California Consumer Privacy Act (CCPA). To exercise these rights, please contact us using the information provided above.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. GDPR Compliance (EU Users)</h2>
              <p className="text-gray-700 mb-4">
                If you are located in the European Union, you have certain rights under the General Data Protection Regulation (GDPR), including the right to access, rectify, and erase your personal data. To exercise these rights, please contact us.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200 text-center">
            <a 
              href="/terms" 
              className="text-blue-600 hover:text-blue-800 underline"
            >
              View Terms of Service
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 