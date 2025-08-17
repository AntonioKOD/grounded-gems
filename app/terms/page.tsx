import React from 'react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
            <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing and using Sacavia ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-700 mb-4">
                Sacavia is a local discovery platform that helps users find places, events, and connect with people in their area. The Service includes:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Discovering and sharing local places and events</li>
                <li>Connecting with other users in your area</li>
                <li>Posting and viewing content about local experiences</li>
                <li>Receiving personalized recommendations</li>
                <li>Accessing location-based services</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
              <p className="text-gray-700 mb-4">
                To use certain features of the Service, you must create an account. You are responsible for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Providing accurate and complete information</li>
                <li>Updating your information as necessary</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. User Content and Zero Tolerance Policy</h2>
              <p className="text-gray-700 mb-4">
                You retain ownership of content you post to the Service. By posting content, you grant Sacavia a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and distribute your content in connection with the Service.
              </p>
              
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                <h3 className="text-lg font-semibold text-red-800 mb-2">ZERO TOLERANCE FOR OBJECTIONABLE CONTENT</h3>
                <p className="text-red-700 mb-2">
                  Sacavia maintains a <strong>zero tolerance policy</strong> for objectionable content and abusive behavior. We reserve the right to immediately remove any content and suspend or terminate accounts that violate our community standards.
                </p>
                <p className="text-red-700">
                  Users who post objectionable content or engage in abusive behavior will be permanently banned from the platform without warning.
                </p>
              </div>

              <p className="text-gray-700 mb-4">
                You agree not to post content that:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Is illegal, harmful, threatening, abusive, or defamatory</li>
                <li>Contains hate speech, discrimination, or promotes violence</li>
                <li>Is sexually explicit, pornographic, or contains nudity</li>
                <li>Infringes on intellectual property rights</li>
                <li>Contains personal information of others without consent</li>
                <li>Is spam, commercial solicitation, or promotional material</li>
                <li>Contains viruses or malicious code</li>
                <li>Promotes self-harm, eating disorders, or dangerous activities</li>
                <li>Is intended to deceive, mislead, or impersonate others</li>
                <li>Contains graphic violence or gore</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Content Moderation and Reporting</h2>
              <p className="text-gray-700 mb-4">
                Sacavia actively moderates user-generated content to maintain a safe and welcoming community. Our moderation system includes:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Automated content filtering and detection</li>
                <li>Community reporting mechanisms</li>
                <li>Human review of flagged content</li>
                <li>Immediate removal of violating content</li>
                <li>User blocking capabilities to prevent abusive interactions</li>
              </ul>
              <p className="text-gray-700 mb-4">
                If you encounter objectionable content or abusive users, please use our reporting feature immediately. We investigate all reports and take appropriate action, including permanent account termination for repeat offenders.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Location Services</h2>
              <p className="text-gray-700 mb-4">
                The Service uses location data to provide personalized recommendations and connect you with nearby places and people. By using the Service, you consent to the collection and use of your location information as described in our Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Prohibited Uses</h2>
              <p className="text-gray-700 mb-4">
                You agree not to use the Service to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Violate any applicable laws or regulations</li>
                <li>Harass, abuse, bully, or harm other users</li>
                <li>Impersonate another person or entity</li>
                <li>Attempt to gain unauthorized access to the Service</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Use the Service for commercial purposes without authorization</li>
                <li>Create fake accounts or engage in coordinated inauthentic behavior</li>
                <li>Manipulate or game our recommendation systems</li>
                <li>Collect or harvest user data without consent</li>
                <li>Engage in any form of cyberbullying or online harassment</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Intellectual Property</h2>
              <p className="text-gray-700 mb-4">
                The Service and its original content, features, and functionality are owned by Sacavia and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Privacy</h2>
              <p className="text-gray-700 mb-4">
                Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Disclaimers</h2>
              <p className="text-gray-700 mb-4">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND. SACAVIA DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                IN NO EVENT SHALL SACAVIA BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Termination</h2>
              <p className="text-gray-700 mb-4">
                We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Changes to Terms</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Governing Law</h2>
              <p className="text-gray-700 mb-4">
                These Terms shall be interpreted and governed by the laws of the United States, without regard to its conflict of law provisions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Email:</strong> legal@sacavia.com<br />
                  <strong>Address:</strong> [Your Business Address]<br />
                  <strong>Website:</strong> https://sacavia.com
                </p>
              </div>
            </section>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200 text-center">
            <a 
              href="/privacy" 
              className="text-blue-600 hover:text-blue-800 underline"
            >
              View Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 